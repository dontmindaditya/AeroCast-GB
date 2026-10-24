"""
AeroCast GB - Day-Ahead Renewable Procurement & Forecast Risk Backend
FastAPI service providing analytical endpoints for UK Day-Ahead electricity trading desks.
Ingests and analyzes Elexon BMRS datasets: FUELHH (wind actuals) and WINDFOR (forecasts).
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import numpy as np
import pandas as pd
import httpx
import json
import os
from datetime import datetime, timezone

app = FastAPI(
    title="AeroCast GB API",
    description="UK Day-Ahead Electricity Market Wind Forecast Analytics & Procurement API",
    version="1.0.0"
)

# CORS configuration for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = os.path.join(os.path.dirname(__file__), "../src/data/january_2026_wind_elexon.json")

def load_cached_dataset() -> Dict[str, Any]:
    if os.path.exists(DATA_PATH):
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"days": [], "monthSummary": {}}

class SimulationRequest(BaseModel):
    date: str = Field(..., description="Target delivery date in January 2026, e.g. '2026-01-15'")
    strategy: str = Field("deterministic", description="'deterministic' | 'bias_corrected' | 'risk_averse_p90' | 'volatility_buffer'")
    wholesale_price_gbp: float = Field(85.0, description="Day-Ahead wholesale power price benchmark (£/MWh)")
    system_buy_price_gbp: float = Field(145.0, description="Cash-out System Buy Price (£/MWh)")
    system_sell_price_gbp: float = Field(45.0, description="Cash-out System Sell Price (£/MWh)")
    custom_demand_mw: Optional[List[float]] = None

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AeroCast GB Python Analytics Engine",
        "market": "UK GB Day-Ahead Wholesale Power (N2EX / EPEX SPOT)",
        "source": "Elexon BMRS (FUELHH & WINDFOR)"
    }

@app.get("/api/forecast/latest")
def get_latest_forecast(
    delivery_date: str = Query("2026-01-15", description="Delivery date in format YYYY-MM-DD"),
    gate_closure_cutoff: str = Query("11:00", description="Day-Ahead auction gate closure cutoff time on D-1 (e.g. '11:00')")
):
    """
    Returns the latest wind generation forecast available before the Day-Ahead Auction cutoff on D-1,
    paired with actual generation (FUELHH Wind) for all 48 settlement periods.
    """
    dataset = load_cached_dataset()
    days = dataset.get("days", [])
    matching_day = next((d for d in days if d.get("date") == delivery_date), None)
    
    if not matching_day:
        raise HTTPException(status_code=404, detail=f"Data for date {delivery_date} not found in January 2026 dataset.")
    
    return {
        "delivery_date": delivery_date,
        "gate_closure_cutoff": gate_closure_cutoff,
        "da_publish_time": matching_day.get("daPublishTime"),
        "summary": matching_day.get("summary"),
        "periods": matching_day.get("periods")
    }

@app.get("/api/metrics/accuracy")
def get_accuracy_metrics(
    start_date: str = Query("2026-01-01"),
    end_date: str = Query("2026-01-31")
):
    """
    Computes rigorous quantitative error metrics (MAE, RMSE, Bias/MPE, WAPE, MAPE, Quantiles)
    across the requested window in January 2026.
    """
    dataset = load_cached_dataset()
    days = dataset.get("days", [])
    filtered_days = [d for d in days if start_date <= d.get("date", "") <= end_date]
    
    if not filtered_days:
        raise HTTPException(status_code=404, detail="No days found in specified date range.")
    
    all_periods = [p for d in filtered_days for p in d.get("periods", [])]
    if not all_periods:
        raise HTTPException(status_code=400, detail="No periods found.")
        
    actuals = np.array([p["actualGeneration"] for p in all_periods], dtype=float)
    forecasts = np.array([p["dayAheadForecast"] for p in all_periods], dtype=float)
    errors = forecasts - actuals
    abs_errors = np.abs(errors)
    
    mae = float(np.mean(abs_errors))
    rmse = float(np.sqrt(np.mean(errors ** 2)))
    mean_error = float(np.mean(errors))
    wape = float((np.sum(abs_errors) / np.sum(actuals)) * 100.0) if np.sum(actuals) > 0 else 0.0
    
    # Quantiles
    q = np.percentile(errors, [5, 10, 25, 50, 75, 90, 95])
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_periods": len(all_periods),
        "mae_mw": round(mae, 2),
        "rmse_mw": round(rmse, 2),
        "bias_mw": round(mean_error, 2),
        "wape_percent": round(wape, 2),
        "quantiles": {
            "p05": round(float(q[0]), 2),
            "p10": round(float(q[1]), 2),
            "p25": round(float(q[2]), 2),
            "p50": round(float(q[3]), 2),
            "p75": round(float(q[4]), 2),
            "p90": round(float(q[5]), 2),
            "p95": round(float(q[6]), 2)
        },
        "month_summary": dataset.get("monthSummary")
    }

@app.post("/api/procurement/simulate")
def simulate_procurement(req: SimulationRequest):
    """
    Simulates thermal power procurement from the Day-Ahead Market vs Wind Forecast.
    Evaluates cash-out exposure (SBP/SSP) under different risk strategies.
    """
    dataset = load_cached_dataset()
    matching_day = next((d for d in dataset.get("days", []) if d.get("date") == req.date), None)
    if not matching_day:
        raise HTTPException(status_code=404, detail="Date not found in January 2026.")
        
    periods = matching_day.get("periods", [])
    results = []
    
    total_short_mwh = 0.0
    total_surplus_mwh = 0.0
    total_cashout_penalty = 0.0
    
    p90_buffer = matching_day.get("summary", {}).get("p90", 1500)
    bias = matching_day.get("summary", {}).get("meanError", 0)
    
    for i, p in enumerate(periods):
        demand = req.custom_demand_mw[i] if (req.custom_demand_mw and i < len(req.custom_demand_mw)) else p["demand"]
        wind_da = p["dayAheadForecast"]
        wind_act = p["actualGeneration"]
        
        # Determine thermal procured based on strategy
        if req.strategy == "deterministic":
            thermal_procured = max(0.0, demand - wind_da)
        elif req.strategy == "bias_corrected":
            effective_wind = max(0.0, wind_da - bias)
            thermal_procured = max(0.0, demand - effective_wind)
        elif req.strategy == "risk_averse_p90":
            effective_wind = max(0.0, wind_da - abs(p90_buffer))
            thermal_procured = max(0.0, demand - effective_wind)
        elif req.strategy == "volatility_buffer":
            effective_wind = max(0.0, wind_da * 0.88)
            thermal_procured = max(0.0, demand - effective_wind)
        else:
            thermal_procured = max(0.0, demand - wind_da)
            
        supplied = thermal_procured + wind_act
        imbalance_mw = supplied - demand
        imbalance_mwh = imbalance_mw * 0.5  # 30-min period
        
        period_penalty = 0.0
        if imbalance_mwh < 0:
            shortage = abs(imbalance_mwh)
            total_short_mwh += shortage
            period_penalty = shortage * (req.system_buy_price_gbp - req.wholesale_price_gbp)
        elif imbalance_mwh > 0:
            surplus = imbalance_mwh
            total_surplus_mwh += surplus
            period_penalty = surplus * (req.wholesale_price_gbp - req.system_sell_price_gbp)
            
        total_cashout_penalty += period_penalty
        results.append({
            "settlementPeriod": p["settlementPeriod"],
            "clockTime": p["clockTime"],
            "demand": demand,
            "windForecast": wind_da,
            "actualWind": wind_act,
            "thermalProcured": thermal_procured,
            "imbalanceMW": round(imbalance_mw, 1),
            "imbalanceMWh": round(imbalance_mwh, 2),
            "periodPenaltyGbp": round(period_penalty, 2)
        })
        
    return {
        "date": req.date,
        "strategy": req.strategy,
        "total_short_mwh": round(total_short_mwh, 2),
        "total_surplus_mwh": round(total_surplus_mwh, 2),
        "total_imbalance_penalty_gbp": round(total_cashout_penalty, 2),
        "periods": results
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
