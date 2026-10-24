# AeroCast GB — Day-Ahead Renewable Procurement & Forecast Risk Analytics

> **UK Wholesale Electricity Market Decision Support Platform**  
> Built for UK energy utility trading desks procuring power in the Day-Ahead Market (EPEX SPOT / N2EX) using national wind generation forecasts (`WINDFOR`) and outturn (`FUELHH`) from **Elexon BMRS**.

---

## Companion Deliverables (Pitch & Technical Review)

To keep the web application strictly focused on the daily operational workflows of the UK day-ahead trading desk, the executive presentation and internal engineering review are documented in dedicated markdown files:

1. **[`CLIENT_PITCH.md`](./CLIENT_PITCH.md)** — **Client Presentation & Executive Pitch Deck**  
   Covers the 11:00 AM D-1 gate closure problem, asymmetric Balancing Mechanism cash-out penalties (SBP vs. SSP), AeroCast GB's probabilistic procurement buffering, January 2026 backtest ROI (£1.35M monthly penalty reduction), daily trading desk workflow, and a 4-week pilot rollout plan.
2. **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** — **Internal Technical Lead Review**  
   Covers the system architecture diagram, Elexon BMRS `FUELHH` and `WINDFOR` temporal alignment, strict no-lookahead gate closure filtering, linear half-hourly interpolation, mathematical formulations (`MAE`, `RMSE`, `Bias`, `WAPE`, `P10/P50/P90` quantiles), FastAPI backend schemas, and unit test verification.

---

## Product Capabilities (Web Application)

The live web application (`http://localhost:3000`) provides four core operational workspaces designed in a strict monochrome Vercel / Geist interface:

1. **Trading Desk (`Trading Desk`):**  
   - Visualizes all 48 half-hour settlement periods for any delivery day in January 2026, comparing **Actual Wind (`FUELHH`)**, **Day-Ahead Forecast (`WINDFOR` locked at 11:00 GMT D-1)**, **Intraday Forecast**, and **Residual Thermal Gap ($\text{Demand} - \text{Wind}$)**.
   - Supports interactive gate closure cutoff sensitivity (`09:00`, `11:00`, `15:00` GMT D-1), period filtering (`All`, `Over-forecast`, `Under-forecast`, `Severe >1.5GW`), and one-click **CSV Export** for auction bidding books.
2. **Forecast Accuracy (`Forecast Accuracy`):**  
   - Evaluates forecast performance quantitatively across the full month of January 2026 (1,488 half-hour periods) or weekly cohorts (`Week 1`–`Week 4`).
   - Displays **MAE**, **RMSE**, **Systematic Bias**, **WAPE**, **Horizon Improvement (Intraday vs. Day-Ahead)**, diurnal 48-period error profile, empirical **P10 / P50 / P90** quantiles, and top extreme ramp deviation events.
3. **Thermal Gap & Simulator (`Thermal Gap & Simulator`):**  
   - Simulates D-1 thermal power procurement under 4 strategies (**Naive Deterministic**, **Bias-Corrected**, **Defensive P90**, and **Volatility Buffer**) with interactive sliders for **Wholesale Day-Ahead Price**, **System Buy Price (SBP)**, and **System Sell Price (SSP)**.
   - Quantifies total thermal MWh procured, unhedged short volume, net cash-out penalty, and financial savings vs. the naive baseline across all 48 settlement periods.
4. **Elexon Data (`Elexon Data`):**  
   - Inspects raw Elexon BMRS half-hourly records in tabular or JSON format, tests live Elexon BMRS stream connectivity, and exports the complete validated January 2026 dataset.

---

## Quick Start & Verification

```bash
# Install dependencies
npm install

# Run pure math & statistical unit tests (7/7 passing)
npx tsx --test src/utils/metrics.test.ts

# Start development server on port 3000
npm run dev

# Build for production
npm run build
```

### Docker Deployment
```bash
docker-compose up --build
```

---

## AI Tools Disclosure
In compliance with project guidelines:
* **AI Tooling Assistance:** Gemini in Google AI Studio was utilized during development for Elexon BMRS schema analysis, statistical calculation scaffolding, Geist monochrome UI component styling, and automated browser/unit test verification.
