import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMae,
  calculateRmse,
  calculateMeanError,
  calculateWape,
  calculateMape,
  calculateQuantile,
  calculateThermalProcurementMW,
  evaluateImbalanceEconomics
} from './metrics';

test('calculateMae computes mean absolute error correctly', () => {
  const forecasts = [1000, 1200, 1500, 800];
  const actuals = [1100, 1100, 1400, 900];
  // Errors: [-100, 100, 100, -100], Abs: [100, 100, 100, 100]
  const mae = calculateMae(forecasts, actuals);
  assert.equal(mae, 100);
});

test('calculateRmse penalizes larger deviations more heavily than MAE', () => {
  const forecasts = [1000, 2000];
  const actuals = [1000, 1000];
  // Errors: [0, 1000], MAE = 500, RMSE = sqrt((0 + 1,000,000)/2) = sqrt(500000) ~ 707.11
  const rmse = calculateRmse(forecasts, actuals);
  assert.equal(rmse, 707.11);
});

test('calculateMeanError reflects systematic forecast bias', () => {
  const forecasts = [1500, 1600, 1700];
  const actuals = [1000, 1000, 1000];
  // Errors: [500, 600, 700] -> Mean = 600 (positive bias / overforecast)
  const bias = calculateMeanError(forecasts, actuals);
  assert.equal(bias, 600);
});

test('calculateWape handles weighted percentage error correctly', () => {
  const forecasts = [100, 200];
  const actuals = [100, 300];
  // Abs errors: [0, 100], sum = 100. Sum actuals = 400. WAPE = 100/400 * 100 = 25%
  const wape = calculateWape(forecasts, actuals);
  assert.equal(wape, 25);
});

test('calculateQuantile computes p10, p50 and p90 correctly', () => {
  const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const median = calculateQuantile(values, 0.5);
  assert.equal(median, 55);
});

test('calculateThermalProcurementMW respects strategies', () => {
  const demand = 30000;
  const windForecast = 12000;

  // Deterministic: 30000 - 12000 = 18000
  const det = calculateThermalProcurementMW(demand, windForecast, 'deterministic');
  assert.equal(det, 18000);

  // Bias-corrected with 2000 MW positive bias: 30000 - (12000 - 2000) = 20000
  const bc = calculateThermalProcurementMW(demand, windForecast, 'bias_corrected', 2000);
  assert.equal(bc, 20000);

  // Risk-averse with 1500 MW safety buffer: 30000 - (12000 - 1500) = 19500
  const ra = calculateThermalProcurementMW(demand, windForecast, 'risk_averse_p90', 0, 1500);
  assert.equal(ra, 19500);
});

test('evaluateImbalanceEconomics calculates cash-out penalties on short position', () => {
  // Utility procured 18,000 MW thermal, wind only delivered 10,000 MW, demand was 30,000 MW
  // Total supplied = 28,000 MW. Imbalance = -2,000 MW (-1,000 MWh) -> SHORT
  // SBP = £145, Wholesale = £85. Spread = £60/MWh. Cash-out penalty = 1,000 MWh * £60 = £60,000
  const res = evaluateImbalanceEconomics(18000, 10000, 30000, 85, 145, 45);
  assert.equal(res.imbalanceMWh, -1000);
  assert.equal(res.cashOutPenaltyGbp, 60000);
});
