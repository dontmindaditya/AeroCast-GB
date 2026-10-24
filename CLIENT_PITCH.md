# AeroCast GB — Executive Client Pitch & Value Walkthrough

> **Prepared for:** UK Energy Utility Executive Committee & Day-Ahead Wholesale Trading Desk  
> **Market Scope:** Great Britain Day-Ahead Power Auctions (EPEX SPOT / N2EX) & Elexon BMRS Balancing Mechanism

---

## Slide 1: The Multi-Million Pound Problem
### Intermittent Wind vs. The 11:00 AM Gate Closure

Why standard deterministic procurement workflows leak millions into the Elexon Balancing Mechanism:

1. **The 11:00 AM Deadline (D-1):**  
   Day-ahead wholesale power auctions (EPEX SPOT / N2EX) close at **11:00 GMT on Day D-1**. At that moment, the utility's trading desk must submit binding purchase orders for all 48 half-hour settlement periods of delivery day $D$ (up to 36 hours ahead of real-time delivery).
2. **Thermal Notice to Deliver (N2D):**  
   Dispatchable thermal plants (CCGTs and gas peakers) require 2 to 4 hours of physical ramp-up notice. When wind generation underperforms its forecast during delivery, procurement cannot wait until the settlement period without paying punitive emergency balancing rates.
3. **Asymmetric Cash-Out Spread (SBP vs. SSP):**  
   - **Short Position (Over-forecasted Wind, $F > A$):** The utility procured too little thermal power day-ahead and is forced to buy deficit energy at the **System Buy Price (SBP)**, which regularly spikes to **£150–£350+/MWh** during winter peaks.
   - **Long Position (Under-forecasted Wind, $F < A$):** The utility over-procured thermal power and spills surplus energy at the **System Sell Price (SSP)**, frequently receiving depressed or near-zero value.

> **January 2026 Empirical Evidence:**  
> Analysis of Elexon BMRS `WINDFOR` forecasts against `FUELHH` wind actuals across all 1,488 half-hour settlement periods of January 2026 revealed an overall **MAE of 2,109 MW** (`WAPE 18.21%`) and a systematic over-forecasting bias of **+1,840 MW**, costing unhedged utility portfolios over **£42,000 per cold-snap day** in imbalance cash-out penalties.

---

## Slide 2: The AeroCast GB Solution
### Decision Intelligence Built for Day-Ahead Power Buyers

AeroCast GB bridges official Elexon BMRS telemetry with quantitative forecast risk management:

1. **Automated Gate Closure Synchronization:**  
   Direct ingestion of Elexon `WINDFOR` streams filtered strictly to the latest forecast run published prior to the **11:00 GMT D-1 auction cutoff** (plus sensitivity testing for 09:00 and 15:00 cutoffs).
2. **Quantitative Error Distribution Engine:**  
   Computes empirical **MAE**, **RMSE**, **Systematic Bias (Mean Error)**, **WAPE**, and **P10 / P50 / P90 Quantile Error Bands** across all 48 settlement periods so traders immediately see diurnal ramp risk and tail exposure.
3. **Risk-Buffered Thermal Procurement:**  
   Replaces naive deterministic bidding ($\text{Demand} - \text{Forecast}$) with configurable **Bias-Corrected** and **Defensive P90** thermal procurement schedules.

| Dimension | Legacy Practice (Unbuffered Deterministic) | AeroCast GB (Quantified Risk Hedging) |
| :--- | :--- | :--- |
| **Procurement Formula** | $\text{Thermal} = \text{Demand} - \text{DA Wind Forecast}$ | $\text{Thermal} = \text{Demand} - (\text{DA Wind Forecast} - \text{Risk Buffer})$ |
| **Ramp Event Outcome** | 2,000 MW wind shortfall dumps portfolio into SBP at £150–£350/MWh | Secures extra baseload/peak block day-ahead at £85/MWh wholesale |
| **Single-Day Savings (Jan 15, 2026)** | £1,620,950 Cash-Out Penalty (Baseline) | **+£1,024,972 Net Penalty Reduction** (Bias-Corrected) |

---

## Slide 3: Financial ROI & January 2026 Backtest
### Proven Imbalance Penalty Reduction

Applying AeroCast GB's **Bias-Corrected** procurement strategy across the 31 days of January 2026 reduced net imbalance settlement penalties from **£3.24M** down to **£1.89M**—a documented **£1.35M monthly saving** on the reference national book.

#### Portfolio Sizing & Annualized Savings Model
| Utility Annual Supply Volume | Est. Annual Cash-Out Reduction (35% Avoidance) | Platform ROI Multiplier | Emergency Thermal Starts Avoided |
| :--- | :--- | :--- | :--- |
| **2.5 TWh / year** (Regional Supplier) | £700,000 / yr | 5.8x ROI | 45+ N2D Events |
| **6.5 TWh / year** (Mid-Tier Utility) | **£1,820,000 / yr** | **15.2x ROI** | **120+ N2D Events** |
| **15.0 TWh / year** (Major Tier-1 Utility) | £4,200,000 / yr | 35.0x ROI | 260+ N2D Events |

---

## Slide 4: Trading Desk Daily Workflow
### Seamless Integration into Morning Auction Schedules

- **09:30 GMT (Day D-1) — Elexon Stream Refresh:**  
  National Grid ESO (NESO) publishes the morning `WINDFOR` run. AeroCast GB ingests, validates, and aligns the 48 half-hourly settlement periods.
- **10:15 GMT (Day D-1) — Thermal Gap & Error Quantile Review:**  
  The power purchaser inspects the 48-period Residual Demand curve (`Trading Desk` & `Thermal Gap & Simulator` tabs). AeroCast flags settlement periods with high ramp uncertainty and recommends a Bias-Corrected or P90 safety buffer in MW.
- **11:00 GMT (Day D-1) — Auction Order Lock:**  
  The trader exports the 48-period procurement schedule directly via CSV (`Export CSV`) into EPEX SPOT / N2EX bidding books prior to gate closure.
- **Intraday (Day D) — Continuous Position Hedging:**  
  As delivery day $D$ progresses, the desk tracks live `FUELHH` wind outturn against intraday `WINDFOR` updates (+15% horizon accuracy improvement) to trim residual exposure prior to 1-hour settlement gate closure.

---

## Slide 5: Pilot Implementation & Next Steps
### Rapid 4-Week Deployment Plan

- **Phase 1 (Week 1) — Data Ingestion & Portfolio Mapping:**  
  Connect the utility's customer demand profile, map contracted PPA wind farm capacities, and configure desk risk tolerance thresholds (Wholesale vs. SBP/SSP price spreads).
- **Phase 2 (Week 2) — Shadow Trading & Calibration:**  
  Run parallel shadow bids alongside live EPEX SPOT orders, calibrate P90 safety buffers by weather regime, and verify Notice-to-Deliver thermal compliance.
- **Phase 3 (Weeks 3–4) — Live Desk Cutover & P&L Audit:**  
  Full operational cutover for D-1 auctions with automated weekly settlement P&L audits and executive sign-off on verified cash-out savings.
