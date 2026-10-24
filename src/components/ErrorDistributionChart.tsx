import React from 'react';
import { MonthSummary } from '../types/energy';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Separator } from './ui/separator';

interface ErrorDistributionChartProps {
  monthSummary: MonthSummary;
  selectedDayErrors?: number[];
}

export const ErrorDistributionChart: React.FC<ErrorDistributionChartProps> = ({
  monthSummary,
}) => {
  const periodAverages = monthSummary.periodHourlyAverages || [];

  const maxDiurnalVal =
    Math.max(...periodAverages.map((p) => Math.max(p.avgActual, p.avgForecast)), 1000) * 1.1;
  const maxAbsErr = Math.max(...periodAverages.map((p) => p.avgAbsError), 500) * 1.25;

  const width = 800;
  const height = 250;
  const padding = { top: 24, right: 24, bottom: 38, left: 56 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const getX = (idx: number) => padding.left + (idx / (periodAverages.length - 1)) * innerW;
  const getY = (val: number, max: number) => padding.top + innerH - (val / max) * innerH;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Diurnal Curve: Average Wind & Error by Settlement Period */}
      <Card className="flex flex-col justify-between">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#262626] pb-3.5">
          <div>
            <CardTitle>Diurnal Generation & Forecast Profile</CardTitle>
            <CardDescription>
              48-period average actuals, day-ahead forecast, and absolute error bars
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#A1A1AA]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#FAFAFA] inline-block" /> Actual
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#A1A1AA] inline-block" /> Forecast
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#262626] border border-[#52525B] inline-block" /> MAE
            </span>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
            {/* Y Axis Grid */}
            {[0, 0.5, 1].map((pct, i) => {
              const y = padding.top + innerH * (1 - pct);
              const val = Math.round(maxDiurnalVal * pct);
              return (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="#262626"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 3.5}
                    fill="#71717A"
                    fontSize="10"
                    textAnchor="end"
                    fontFamily="Geist Mono, monospace"
                  >
                    {val.toLocaleString()}
                  </text>
                </g>
              );
            })}

            {/* X Axis Ticks */}
            {periodAverages.map((p, idx) => {
              if (p.settlementPeriod % 8 === 1 || p.settlementPeriod === 48) {
                const x = getX(idx);
                return (
                  <g key={idx}>
                    <text
                      x={x}
                      y={padding.top + innerH + 16}
                      fill="#A1A1AA"
                      fontSize="10"
                      textAnchor="middle"
                      fontFamily="Geist Mono, monospace"
                    >
                      {p.clockTime}
                    </text>
                    <text
                      x={x}
                      y={padding.top + innerH + 28}
                      fill="#71717A"
                      fontSize="9"
                      textAnchor="middle"
                      fontFamily="Geist Mono, monospace"
                    >
                      P{p.settlementPeriod}
                    </text>
                  </g>
                );
              }
              return null;
            })}

            {/* MAE bars at bottom */}
            {periodAverages.map((p, i) => {
              const barH = (p.avgAbsError / maxAbsErr) * (innerH * 0.42);
              const x = getX(i) - 3.5;
              const y = padding.top + innerH - barH;
              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width={7}
                  height={barH}
                  fill="#262626"
                  stroke="#52525B"
                  strokeWidth="0.5"
                />
              );
            })}

            {/* Average Forecast Line */}
            <path
              d={periodAverages
                .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.avgForecast, maxDiurnalVal)}`)
                .join(' ')}
              fill="none"
              stroke="#A1A1AA"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              strokeLinecap="round"
            />

            {/* Average Actual Line */}
            <path
              d={periodAverages
                .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.avgActual, maxDiurnalVal)}`)
                .join(' ')}
              fill="none"
              stroke="#FAFAFA"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </CardContent>
      </Card>

      {/* 2. Quantile & Error Dispersion Matrix */}
      <Card className="flex flex-col justify-between">
        <CardHeader className="border-b border-[#262626] pb-3.5">
          <CardTitle>Forecast Error Distribution & Risk Quantiles</CardTitle>
          <CardDescription>
            Empirical quantiles for day-ahead error buffering (Forecast minus Actual in MW)
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 flex-1 flex flex-col justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 border border-[#262626] rounded-md bg-[#000000] divide-y sm:divide-y-0 sm:divide-x divide-[#262626]">
            <div className="p-3.5">
              <span className="text-xs font-medium text-[#A1A1AA] block">P10 Downside</span>
              <span className="text-lg font-semibold font-mono text-[#FAFAFA] tabular-nums mt-1 block">
                {monthSummary.quantiles.p10.toLocaleString()} MW
              </span>
              <span className="text-[11px] text-[#71717A] block mt-0.5">Wind deficit risk</span>
            </div>

            <div className="p-3.5">
              <span className="text-xs font-medium text-[#A1A1AA] block">P50 Median</span>
              <span className="text-lg font-semibold font-mono text-[#FAFAFA] tabular-nums mt-1 block">
                {monthSummary.quantiles.p50.toLocaleString()} MW
              </span>
              <span className="text-[11px] text-[#71717A] block mt-0.5">Central tendency</span>
            </div>

            <div className="p-3.5">
              <span className="text-xs font-medium text-[#A1A1AA] block">P90 Upside</span>
              <span className="text-lg font-semibold font-mono text-[#FAFAFA] tabular-nums mt-1 block">
                {monthSummary.quantiles.p90.toLocaleString()} MW
              </span>
              <span className="text-[11px] text-[#71717A] block mt-0.5">Over-forecast risk</span>
            </div>

            <div className="p-3.5">
              <span className="text-xs font-medium text-[#A1A1AA] block">Monthly Bias</span>
              <span className="text-lg font-semibold font-mono text-[#FAFAFA] tabular-nums mt-1 block">
                {monthSummary.overallMeanErrorMW > 0 ? '+' : ''}
                {monthSummary.overallMeanErrorMW.toLocaleString()} MW
              </span>
              <span className="text-[11px] text-[#71717A] block mt-0.5">Systematic offset</span>
            </div>
          </div>

          <Separator />

          {/* Quantile Band Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-[#A1A1AA] tabular-nums">
              <span>P10: {monthSummary.quantiles.p10.toLocaleString()} MW</span>
              <span className="text-[#FAFAFA] font-medium">
                P50: {monthSummary.quantiles.p50.toLocaleString()} MW
              </span>
              <span>P90: {monthSummary.quantiles.p90.toLocaleString()} MW</span>
            </div>

            <div className="relative w-full h-2.5 bg-[#111111] border border-[#262626] rounded-sm overflow-hidden flex items-center">
              <div className="absolute left-[20%] right-[20%] h-full bg-[#262626] border-x border-[#71717A]" />
              <div className="absolute left-[50%] w-0.5 h-full bg-[#FAFAFA]" />
            </div>

            <div className="flex justify-between text-[11px] text-[#71717A]">
              <span>Under-forecast (Long Wind)</span>
              <span>Interquartile Range (P25–P75)</span>
              <span>Over-forecast (Short Wind)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
