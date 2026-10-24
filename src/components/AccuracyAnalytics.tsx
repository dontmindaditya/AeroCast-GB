import React, { useState, useMemo } from 'react';
import { AlertOctagon } from 'lucide-react';
import { ElexonDataset } from '../types/energy';
import { ErrorDistributionChart } from './ErrorDistributionChart';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './ui/table';

interface AccuracyAnalyticsProps {
  dataset: ElexonDataset;
}

export const AccuracyAnalytics: React.FC<AccuracyAnalyticsProps> = ({ dataset }) => {
  const [selectedWeek, setSelectedWeek] = useState<'all' | 'w1' | 'w2' | 'w3' | 'w4'>('all');

  const { monthSummary, days } = dataset;

  const activeDays = useMemo(() => {
    if (selectedWeek === 'w1') return days.filter((d) => d.day >= 1 && d.day <= 7);
    if (selectedWeek === 'w2') return days.filter((d) => d.day >= 8 && d.day <= 14);
    if (selectedWeek === 'w3') return days.filter((d) => d.day >= 15 && d.day <= 21);
    if (selectedWeek === 'w4') return days.filter((d) => d.day >= 22 && d.day <= 31);
    return days;
  }, [days, selectedWeek]);

  const activeMetrics = useMemo(() => {
    const allPeriods = activeDays.flatMap((d) => d.periods);
    if (allPeriods.length === 0) return null;

    const actuals = allPeriods.map((p) => p.actualGeneration);
    const forecasts = allPeriods.map((p) => p.dayAheadForecast);
    const errors = allPeriods.map((p) => p.forecastError);
    const absErrors = allPeriods.map((p) => p.absError);

    const sumActual = actuals.reduce((a, b) => a + b, 0);
    const sumForecast = forecasts.reduce((a, b) => a + b, 0);
    const sumAbsError = absErrors.reduce((a, b) => a + b, 0);

    const mae = Math.round(sumAbsError / allPeriods.length);
    const rmse = Math.round(
      Math.sqrt(errors.reduce((acc, e) => acc + e * e, 0) / allPeriods.length)
    );
    const meanError = Math.round(errors.reduce((a, b) => a + b, 0) / allPeriods.length);
    const wape = sumActual > 0 ? Number(((sumAbsError / sumActual) * 100).toFixed(2)) : 0;

    const intradayAbsErrors = allPeriods.map((p) =>
      Math.abs(p.intradayForecast - p.actualGeneration)
    );
    const intradayMae = Math.round(
      intradayAbsErrors.reduce((a, b) => a + b, 0) / allPeriods.length
    );

    const sorted = [...errors].sort((a, b) => a - b);
    const p10 = sorted[Math.floor(sorted.length * 0.1)];
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p90 = sorted[Math.floor(sorted.length * 0.9)];

    return {
      totalPeriods: allPeriods.length,
      totalActualGWh: Math.round((sumActual * 0.5) / 1000),
      totalForecastGWh: Math.round((sumForecast * 0.5) / 1000),
      mae,
      rmse,
      meanError,
      wape,
      intradayMae,
      maeImprovementPercent: Math.round(((mae - intradayMae) / (mae || 1)) * 100),
      p10,
      p50,
      p90,
      rampAlerts: allPeriods.filter((p) => p.absError >= 2000).length,
    };
  }, [activeDays]);

  const extremeEvents = useMemo(() => {
    const all = days.flatMap((d) =>
      d.periods.map((p) => ({ ...p, date: d.date, dayOfWeek: d.dayOfWeek }))
    );
    return all.sort((a, b) => b.absError - a.absError).slice(0, 8);
  }, [days]);

  return (
    <div className="space-y-6">
      {/* 1. Page Header & Window Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#FAFAFA] tracking-tight">
            Forecast Accuracy & Quantitative Analytics
          </h1>
          <p className="text-sm text-[#A1A1AA] mt-1">
            Statistical validation of National Grid / Elexon WINDFOR forecasts against FUELHH actuals
          </p>
        </div>

        <Tabs value={selectedWeek} onValueChange={(v) => setSelectedWeek(v as any)}>
          <TabsList>
            <TabsTrigger value="all">Full Month (31d)</TabsTrigger>
            <TabsTrigger value="w1">Week 1</TabsTrigger>
            <TabsTrigger value="w2">Week 2</TabsTrigger>
            <TabsTrigger value="w3">Week 3</TabsTrigger>
            <TabsTrigger value="w4">Week 4</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 2. Compact 4-Column Metric Strip */}
      {activeMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-[#262626] rounded-md bg-[#0A0A0A] divide-y sm:divide-y-0 sm:divide-x divide-[#262626]">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#A1A1AA]">Mean Absolute Error</span>
              <span className="text-[11px] font-mono text-[#71717A]">
                WAPE {activeMetrics.wape}%
              </span>
            </div>
            <div className="text-2xl font-semibold font-mono text-[#FAFAFA] tabular-nums mt-2">
              {activeMetrics.mae.toLocaleString()}{' '}
              <span className="text-xs font-normal text-[#71717A]">MW</span>
            </div>
            <div className="text-xs text-[#71717A] mt-1.5">
              Across {activeMetrics.totalPeriods} half-hour periods
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#A1A1AA]">Root Mean Square Error</span>
              <span className="text-[11px] font-mono text-[#71717A]">
                {(activeMetrics.rmse / (activeMetrics.mae || 1)).toFixed(2)}x MAE
              </span>
            </div>
            <div className="text-2xl font-semibold font-mono text-[#FAFAFA] tabular-nums mt-2">
              {activeMetrics.rmse.toLocaleString()}{' '}
              <span className="text-xs font-normal text-[#71717A]">MW</span>
            </div>
            <div className="text-xs text-[#71717A] mt-1.5">
              Penalizes extreme tail deviations
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#A1A1AA]">Systematic Forecast Bias</span>
              <span className="text-[11px] font-mono text-[#71717A]">
                {activeMetrics.meanError > 0 ? 'Over-forecast' : 'Under-forecast'}
              </span>
            </div>
            <div className="text-2xl font-semibold font-mono text-[#FAFAFA] tabular-nums mt-2">
              {activeMetrics.meanError > 0 ? '+' : ''}
              {activeMetrics.meanError.toLocaleString()}{' '}
              <span className="text-xs font-normal text-[#71717A]">MW</span>
            </div>
            <div className="text-xs text-[#71717A] mt-1.5">
              Directional offset at D-1 gate closure
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#A1A1AA]">Horizon Improvement</span>
              <span className="text-[11px] font-mono text-[#71717A]">Intraday vs DA</span>
            </div>
            <div className="text-2xl font-semibold font-mono text-[#FAFAFA] tabular-nums mt-2">
              +{activeMetrics.maeImprovementPercent}%{' '}
              <span className="text-xs font-normal text-[#71717A]">gain</span>
            </div>
            <div className="text-xs text-[#71717A] mt-1.5 font-mono">
              {activeMetrics.intradayMae.toLocaleString()} vs {activeMetrics.mae.toLocaleString()} MW MAE
            </div>
          </div>
        </div>
      )}

      {/* 3. Visual Charts (Diurnal Curve & Quantile Bar) */}
      <ErrorDistributionChart monthSummary={monthSummary} />

      {/* 4. Top Extreme Ramp Events Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#262626] pb-3.5">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-[#FAFAFA]" />
              Top Extreme Forecast Deviation Events (January 2026)
            </CardTitle>
            <CardDescription>
              Settlement periods with the largest absolute forecast misses (|Forecast - Actual| &gt; 2,500 MW)
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-mono">
            Threshold: &gt; 2,500 MW
          </Badge>
        </CardHeader>

        <Table>
          <TableHeader>
            <TableRow className="bg-[#000000] hover:bg-[#000000]">
              <TableHead>Delivery Date</TableHead>
              <TableHead>Period & Time</TableHead>
              <TableHead className="text-right">Actual Wind</TableHead>
              <TableHead className="text-right">DA Forecast</TableHead>
              <TableHead className="text-right">Absolute Error</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Grid & Trading Consequence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="font-mono">
            {extremeEvents.map((evt, idx) => {
              const isOver = evt.forecastError > 0;
              return (
                <TableRow key={idx}>
                  <TableCell className="text-[#FAFAFA] font-medium">
                    {evt.date} ({evt.dayOfWeek})
                  </TableCell>
                  <TableCell className="text-[#A1A1AA]">
                    P{evt.settlementPeriod} ({evt.clockTime} GMT)
                  </TableCell>
                  <TableCell className="text-right text-[#FAFAFA]">
                    {evt.actualGeneration.toLocaleString()} MW
                  </TableCell>
                  <TableCell className="text-right text-[#A1A1AA]">
                    {evt.dayAheadForecast.toLocaleString()} MW
                  </TableCell>
                  <TableCell className="text-right text-[#FAFAFA] font-semibold">
                    {evt.absError.toLocaleString()} MW
                  </TableCell>
                  <TableCell className="font-sans">
                    {isOver ? (
                      <Badge variant="default">
                        Over-forecast (+{evt.forecastError.toLocaleString()} MW)
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Under-forecast ({evt.forecastError.toLocaleString()} MW)
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-sans text-[#A1A1AA]">
                    {isOver
                      ? 'Thermal deficit; short cash-out exposure at System Buy Price'
                      : 'Surplus spill into Balancing Mechanism at System Sell Price'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
