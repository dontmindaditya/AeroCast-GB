export interface SettlementPeriodData {
  settlementPeriod: number; // 1 to 48
  clockTime: string; // "00:00", "00:30", ..., "23:30"
  startTime: string; // ISO string e.g. "2026-01-15T12:00:00Z"
  actualGeneration: number; // FUELHH Wind generation in MW
  dayAheadForecast: number; // WINDFOR generation forecast locked at D-1 gate closure
  intradayForecast: number; // WINDFOR latest update closer to delivery
  forecastError: number; // Forecast - Actual (MW). Positive = Over-forecast, Negative = Under-forecast
  absError: number; // |Forecast - Actual| in MW
  percentageError: number; // Abs error as percentage of actual (%)
  demand: number; // Total customer electricity demand (MW)
  residualThermalRequired: number; // Demand - dayAheadForecast (MW)
  actualResidualNeeded: number; // Demand - actualGeneration (MW)
  procurementMismatch: number; // residualThermalRequired - actualResidualNeeded (MW)
}

export interface DaySummary {
  totalActualMWh: number;
  totalForecastMWh: number;
  mae: number; // Mean Absolute Error (MW)
  rmse: number; // Root Mean Square Error (MW)
  meanError: number; // Bias (MW)
  biasDirection: 'OVER_FORECAST' | 'UNDER_FORECAST';
  wape: number; // Weighted Absolute Percentage Error (%)
  maxError: number;
  minError: number;
  p10: number;
  p50: number;
  p90: number;
  rampAlertCount: number;
}

export interface DayDataset {
  date: string; // "2026-01-15"
  day: number;
  dayOfWeek: string;
  decisionCutoffUsed: string;
  daPublishTime: string;
  idPublishTime: string;
  summary: DaySummary;
  periods: SettlementPeriodData[];
}

export interface MonthSummary {
  month: string;
  totalDays: number;
  totalSettlementPeriods: number;
  totalActualGenerationGWh: number;
  totalForecastGenerationGWh: number;
  overallMaeMW: number;
  overallRmseMW: number;
  overallMeanErrorMW: number;
  overallWapePercent: number;
  quantiles: {
    p05: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  };
  periodHourlyAverages: {
    settlementPeriod: number;
    clockTime: string;
    avgActual: number;
    avgForecast: number;
    avgError: number;
    avgAbsError: number;
  }[];
}

export interface ElexonDataset {
  metadata: {
    source: string;
    datasets: string[];
    targetPeriod: string;
    generatedAt: string;
    gateClosureRule: string;
  };
  monthSummary: MonthSummary;
  days: DayDataset[];
}

export type ProcurementStrategy = 'deterministic' | 'bias_corrected' | 'risk_averse_p90' | 'volatility_buffer';

export interface ProcurementSimulationResult {
  strategy: ProcurementStrategy;
  strategyLabel: string;
  thermalProcuredMW: number[]; // 48 periods
  actualThermalNeededMW: number[]; // 48 periods
  imbalanceMW: number[]; // 48 periods (Thermal Procured + Actual Wind - Demand)
  totalProcuredMWh: number;
  totalImbalanceMWh: number;
  positiveImbalanceMWh: number; // Over-supplied (spill)
  negativeImbalanceMWh: number; // Short (cash-out penalty)
  estimatedCashOutCostGbp: number;
  netFinancialExposureGbp: number;
  costSavingsVsDeterministicGbp: number;
}
