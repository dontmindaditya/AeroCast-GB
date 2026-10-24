/**
 * Pure statistical and energy procurement calculation functions.
 * Follows UK Elexon BMRS day-ahead market convention and standard forecasting error formulas.
 */

/**
 * Mean Absolute Error (MAE) in MW
 * MAE = (1 / n) * sum(|Forecast_t - Actual_t|)
 */
export function calculateMae(forecasts: number[], actuals: number[]): number {
  if (forecasts.length === 0 || actuals.length === 0 || forecasts.length !== actuals.length) {
    return 0;
  }
  const sumAbs = forecasts.reduce((acc, f, i) => acc + Math.abs(f - actuals[i]), 0);
  return Math.round((sumAbs / forecasts.length) * 100) / 100;
}

/**
 * Root Mean Square Error (RMSE) in MW
 * RMSE = sqrt((1 / n) * sum((Forecast_t - Actual_t)^2))
 * Strongly penalizes large forecast swings which trigger sudden thermal redispatch.
 */
export function calculateRmse(forecasts: number[], actuals: number[]): number {
  if (forecasts.length === 0 || actuals.length === 0 || forecasts.length !== actuals.length) {
    return 0;
  }
  const sumSq = forecasts.reduce((acc, f, i) => {
    const diff = f - actuals[i];
    return acc + diff * diff;
  }, 0);
  return Math.round(Math.sqrt(sumSq / forecasts.length) * 100) / 100;
}

/**
 * Forecast Bias / Mean Error (ME) in MW
 * ME = (1 / n) * sum(Forecast_t - Actual_t)
 * Positive = Systematic over-forecasting (buying too little thermal)
 * Negative = Systematic under-forecasting (buying too much thermal)
 */
export function calculateMeanError(forecasts: number[], actuals: number[]): number {
  if (forecasts.length === 0 || actuals.length === 0 || forecasts.length !== actuals.length) {
    return 0;
  }
  const sumDiff = forecasts.reduce((acc, f, i) => acc + (f - actuals[i]), 0);
  return Math.round((sumDiff / forecasts.length) * 100) / 100;
}

/**
 * Weighted Absolute Percentage Error (WAPE) in %
 * WAPE = sum(|Forecast_t - Actual_t|) / sum(Actual_t) * 100%
 * Preferred over standard MAPE because wind generation can approach zero, causing MAPE to explode.
 */
export function calculateWape(forecasts: number[], actuals: number[]): number {
  const sumActual = actuals.reduce((a, b) => a + b, 0);
  if (sumActual === 0) return 0;
  const sumAbs = forecasts.reduce((acc, f, i) => acc + Math.abs(f - actuals[i]), 0);
  return Math.round((sumAbs / sumActual) * 10000) / 100;
}

/**
 * Mean Absolute Percentage Error (MAPE) in % (clipped to avoid div-by-zero on low wind periods)
 */
export function calculateMape(forecasts: number[], actuals: number[], minActualThreshold = 50): number {
  let count = 0;
  let sumApe = 0;
  for (let i = 0; i < forecasts.length; i++) {
    const act = actuals[i];
    if (act >= minActualThreshold) {
      sumApe += Math.abs(forecasts[i] - act) / act;
      count++;
    }
  }
  if (count === 0) return 0;
  return Math.round((sumApe / count) * 10000) / 100;
}

/**
 * Calculate empirical quantiles from a distribution of errors
 */
export function calculateQuantile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return Math.round((sorted[base] + rest * (sorted[base + 1] - sorted[base])) * 10) / 10;
  }
  return Math.round(sorted[base] * 10) / 10;
}

/**
 * Calculate residual thermal procurement recommendation for a period
 * @param demand Total consumer electricity demand (MW)
 * @param windForecast Day-Ahead wind forecast (MW)
 * @param strategy Procurement strategy
 * @param bias Historical forecast bias (MW)
 * @param p90Error P90 forecast error (MW)
 */
export function calculateThermalProcurementMW(
  demand: number,
  windForecast: number,
  strategy: 'deterministic' | 'bias_corrected' | 'risk_averse_p90' | 'volatility_buffer',
  bias = 0,
  p90Error = 1500
): number {
  let effectiveWindForecast = windForecast;

  switch (strategy) {
    case 'deterministic':
      // Straight raw forecast
      effectiveWindForecast = windForecast;
      break;

    case 'bias_corrected':
      // Deduct historical systematic over-prediction
      effectiveWindForecast = Math.max(0, windForecast - bias);
      break;

    case 'risk_averse_p90':
      // Assume wind under-performs up to P90 downside risk to protect against cash-out price spikes
      effectiveWindForecast = Math.max(0, windForecast - Math.abs(p90Error));
      break;

    case 'volatility_buffer':
      // 10% dynamic safety buffer on wind volume
      effectiveWindForecast = Math.max(0, windForecast * 0.88);
      break;
  }

  return Math.max(0, Math.round(demand - effectiveWindForecast));
}

/**
 * Calculate financial imbalance settlement exposure under UK cashout rules
 * In Great Britain:
 * - When portfolio is SHORT (Generated + Procured < Demand): Utility pays System Buy Price (SBP, e.g. £140/MWh)
 * - When portfolio is LONG (Generated + Procured > Demand): Utility receives System Sell Price (SSP, e.g. £45/MWh)
 * - Day-Ahead wholesale power price benchmark (e.g. £85/MWh)
 */
export interface ImbalanceEconomics {
  imbalanceMWh: number; // Positive = long/surplus, Negative = short/deficit
  cashOutPenaltyGbp: number;
  netFinancialExposureGbp: number;
}

export function evaluateImbalanceEconomics(
  thermalProcuredMW: number,
  actualWindMW: number,
  demandMW: number,
  wholesalePriceGbp = 85,
  systemBuyPriceGbp = 145,
  systemSellPriceGbp = 45
): ImbalanceEconomics {
  // Half-hour settlement period volume: MWh = MW * 0.5
  const suppliedMW = thermalProcuredMW + actualWindMW;
  const imbalanceMW = suppliedMW - demandMW;
  const imbalanceMWh = imbalanceMW * 0.5;

  let cashOutPenaltyGbp = 0;
  let netFinancialExposureGbp = 0;

  if (imbalanceMWh < 0) {
    // Short position: must pay SBP
    const shortMWh = Math.abs(imbalanceMWh);
    const costAtSbp = shortMWh * systemBuyPriceGbp;
    const costAtWholesale = shortMWh * wholesalePriceGbp;
    // Penalty is the spread over what it would have cost to buy day-ahead
    cashOutPenaltyGbp = costAtSbp - costAtWholesale;
    netFinancialExposureGbp = costAtSbp;
  } else if (imbalanceMWh > 0) {
    // Long position: receive SSP, which is often lower than wholesale purchase cost
    const surplusMWh = imbalanceMWh;
    const revenueAtSsp = surplusMWh * systemSellPriceGbp;
    const purchaseCost = surplusMWh * wholesalePriceGbp;
    // Loss due to selling at depressed SSP vs wholesale cost
    cashOutPenaltyGbp = purchaseCost - revenueAtSsp;
    netFinancialExposureGbp = -revenueAtSsp;
  }

  return {
    imbalanceMWh: Math.round(imbalanceMWh * 100) / 100,
    cashOutPenaltyGbp: Math.round(cashOutPenaltyGbp),
    netFinancialExposureGbp: Math.round(netFinancialExposureGbp)
  };
}
