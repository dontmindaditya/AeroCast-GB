# AeroCast GB — Software Architecture & Technical Design

> **Prepared for:** Internal Technical Lead Review  
> **Scope:** System Architecture, Elexon BMRS Temporal Alignment, Statistical Formulations, Backend API Contracts, and Deployment

---

## 1. System Component Hierarchy

AeroCast GB uses a decoupled multi-tier architecture that strictly separates data ingestion, pure mathematical/statistical computation, and the monochrome Geist UI layer.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Elexon BMRS Open Data API                       │
│  - FUELHH Stream: Half-hourly actuals (fuelType === "WIND")            │
│  - WINDFOR Stream: Forecast runs (publishTime, startTime, generation)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   AeroCast Data Pipeline & Ingestion                   │
│  - Enforces Gate Closure Rule: publishTime <= D-1 11:00 GMT            │
│  - Temporal Alignment Engine: Maps hourly forecasts to periods 1-48    │
│  - Strict No-Lookahead Guarantee: Eliminates data leakage in backtests │
│  - Caches structured JSON dataset for deterministic sub-ms loading     │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│     FastAPI Python Backend           │  │    React 19 SPA Frontend     │
│  (backend/main.py)                   │  │  (Geist Monochrome System)   │
│  - GET /api/forecast/latest          │  │  - Trading Desk & Bidding    │
│  - GET /api/metrics/accuracy         │  │  - Forecast Accuracy Engine  │
│  - POST /api/procurement/simulate    │  │  - Thermal Gap Simulator     │
│  - Vectorized NumPy/Pandas math      │  │  - Elexon Raw Data Explorer  │
│  - Pydantic v2 schemas               │  │  - Pure TS Math Core + Tests │
└──────────────────────────────────────┘  └──────────────────────────────┘
```

### Core Architectural Principles
1. **Decoupled Pure Math Core (`src/utils/metrics.ts`):**  
   All statistical metrics (`calculateMae`, `calculateRmse`, `calculateMeanError`, `calculateWape`, `calculateQuantile`) and procurement formulas (`calculateThermalProcurementMW`, `evaluateImbalanceEconomics`) are implemented as pure, deterministic functions with zero React or DOM dependencies, verified by automated unit tests (`src/utils/metrics.test.ts`).
2. **Zero Forward-Looking Data Leakage:**  
   In day-ahead wholesale electricity trading, using a forecast published *after* auction gate closure invalidates any backtest. AeroCast strictly filters `WINDFOR` records by `publishTime <= D-1 11:00:00Z` for the Day-Ahead series, ensuring the trader only sees telemetry that was genuinely available at order submission.
3. **Hybrid Data Layer (Offline Resilience + Live BMRS Stream):**  
   Pre-validated January 2026 Elexon BMRS records (`src/data/january_2026_wind_elexon.json`) provide instant sub-millisecond UI filtering across all 1,488 settlement periods, while the `Elexon Data` tab and `scripts/fetch_elexon_data.py` support live queries against `https://data.elexon.co.uk/bmrs/api/v1`.

---

## 2. Elexon BMRS Data Pipeline & Temporal Alignment

### 2.1 Source Endpoints
- **Actual Generation (`FUELHH`):**  
  `https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream`  
  Filtered where `fuelType === "WIND"`. Provides half-hourly settlement period outturn (`startTime`, `settlementPeriod` 1–48, `generation` in MW).
- **Forecasted Generation (`WINDFOR`):**  
  `https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream`  
  Provides national wind generation forecasts (`publishTime`, `startTime`, `generation` in MW).

### 2.2 Gate Closure Synchronization
For any delivery date $D$ and settlement period $t \in \{1 \dots 48\}$, the pipeline selects the latest forecast run published at or before the auction cutoff on $D-1$:

```typescript
const eligibleRuns = allWindforRuns.filter((run) => {
  const publishTime = new Date(run.publishTime);
  return publishTime <= new Date(`${dayMinusOne}T11:00:00Z`);
});
const latestGateClosureRun = eligibleRuns[eligibleRuns.length - 1];
```

### 2.3 Half-Hourly Resolution Mapping
While `FUELHH` actuals are reported across 48 half-hourly settlement periods (`00:00`, `00:30`, ..., `23:30`), `WINDFOR` runs are published at hourly resolution. For half-hour boundaries (e.g., `00:30`), the pipeline performs linear interpolation between adjacent hourly forecast nodes (`00:00` and `01:00`) to align accurately with 30-minute Elexon settlement periods.

---

## 3. Mathematical & Statistical Formulations

Let $A_t$ be actual wind generation (MW) and $F_t$ be the day-ahead forecasted wind generation (MW) for settlement period $t \in \{1 \dots N\}$, with error defined as $e_t = F_t - A_t$:

1. **Mean Absolute Error (MAE):**
   $$\text{MAE} = \frac{1}{N} \sum_{t=1}^{N} |F_t - A_t|$$
   Measures the average half-hourly procurement miss in MW.

2. **Root Mean Square Error (RMSE):**
   $$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{t=1}^{N} (F_t - A_t)^2}$$
   Applies quadratic weighting to penalize large tail errors that force emergency CCGT/peaker ramp starts.

3. **Systematic Forecast Bias (Mean Error):**
   $$\text{ME} = \frac{1}{N} \sum_{t=1}^{N} (F_t - A_t)$$
   Quantifies directional drift. A positive value ($F_t > A_t$) indicates persistent wind over-forecasting, which causes a naive buyer to under-procure thermal power and fall short into the Balancing Mechanism.

4. **Weighted Absolute Percentage Error (WAPE):**
   $$\text{WAPE} = \frac{\sum_{t=1}^{N} |F_t - A_t|}{\sum_{t=1}^{N} A_t} \times 100\%$$
   Used instead of unweighted MAPE to avoid division-by-zero distortion during low-wind doldrum periods.

5. **Empirical Error Quantiles ($P_{10}, P_{50}, P_{90}$):**
   Computed from the sorted empirical error distribution $\{e_{(1)}, \dots, e_{(N)}\}$ to size risk-averse thermal procurement buffers.

6. **Thermal Procurement Strategies (`calculateThermalProcurementMW`):**
   - **Naive Deterministic:** $\max(0, D_t - F_t)$
   - **Bias-Corrected:** $\max(0, D_t - \max(0, F_t - \max(0, \text{ME})))$
   - **Defensive P90:** $\max(0, D_t - \max(0, F_t - \max(0, P_{90})))$
   - **Volatility Buffer:** $\max(0, D_t - 0.88 \cdot F_t)$

---

## 4. Python Backend & REST API Specification

The FastAPI microservice (`backend/main.py`) exposes the following endpoints:

### `GET /api/forecast/latest`
Returns the 48-period forecast and actual series aligned to the D-1 gate closure cutoff.
```json
{
  "delivery_date": "2026-01-15",
  "da_publish_time": "2026-01-14T09:30:00Z",
  "summary": { "mae": 1039, "rmse": 1169, "meanError": 1039 },
  "periods": [
    { "settlementPeriod": 1, "dayAheadForecast": 15828, "actualGeneration": 14602 }
  ]
}
```

### `POST /api/procurement/simulate`
Simulates thermal power procurement and imbalance cash-out economics across all 48 periods.
```json
{
  "date": "2026-01-15",
  "strategy": "bias_corrected",
  "wholesale_price_gbp": 85.0,
  "system_buy_price_gbp": 150.0,
  "system_sell_price_gbp": 45.0
}
```

---

## 5. Verification, Testing & Deployment

### Running Unit Tests
```bash
npx tsx --test src/utils/metrics.test.ts
```

### Running with Docker Compose
```bash
docker-compose up --build
```
- **Frontend UI:** `http://localhost:3000`
- **FastAPI Backend & OpenAPI Docs:** `http://localhost:8000/docs`
