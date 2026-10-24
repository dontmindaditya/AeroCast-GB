import React, { useState } from 'react';
import { SettlementPeriodData } from '../types/energy';
import { Badge } from './ui/badge';

interface WindForecastChartProps {
  periods: SettlementPeriodData[];
  showIntraday?: boolean;
  showThermalResidual?: boolean;
  showDemand?: boolean;
}

export const WindForecastChart: React.FC<WindForecastChartProps> = ({
  periods,
  showIntraday = true,
  showThermalResidual = false,
  showDemand = false,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!periods || periods.length === 0) {
    return (
      <div className="p-12 text-center text-[#71717A] text-xs">
        No settlement period data available
      </div>
    );
  }

  // Chart dimensions
  const width = 1000;
  const height = 320;
  const padding = { top: 20, right: 20, bottom: 36, left: 64 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Max value calculation
  const allValues = periods.flatMap((p) => [
    p.actualGeneration,
    p.dayAheadForecast,
    showIntraday ? p.intradayForecast : 0,
    showThermalResidual ? p.residualThermalRequired : 0,
    showDemand ? p.demand : 0,
  ]);
  const maxVal = Math.max(...allValues, 1000) * 1.08;

  const getX = (index: number) => padding.left + (index / (periods.length - 1)) * innerWidth;
  const getY = (val: number) => padding.top + innerHeight - (Math.max(0, val) / maxVal) * innerHeight;

  // SVG paths
  const actualPath = periods
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.actualGeneration)}`)
    .join(' ');
  const daForecastPath = periods
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.dayAheadForecast)}`)
    .join(' ');
  const intradayPath = periods
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.intradayForecast)}`)
    .join(' ');
  const thermalPath = periods
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.residualThermalRequired)}`)
    .join(' ');
  const demandPath = periods
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.demand)}`)
    .join(' ');

  // Subtle neutral polygon between DA Forecast and Actual
  const daPointsForward = periods.map((p, i) => `${getX(i)},${getY(p.dayAheadForecast)}`);
  const actualPointsBackward = periods
    .map((p, i) => `${getX(i)},${getY(p.actualGeneration)}`)
    .reverse();
  const errorAreaPolygon = `${daPointsForward.join(' ')} ${actualPointsBackward.join(' ')}`;

  const hoveredData = hoveredIndex !== null ? periods[hoveredIndex] : null;

  return (
    <div className="w-full">
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[640px] select-none"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Thin low-contrast horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = padding.top + innerHeight * (1 - pct);
            const val = Math.round(maxVal * pct);
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#262626"
                  strokeWidth="1"
                  strokeOpacity="0.6"
                />
                <text
                  x={padding.left - 10}
                  y={y + 3.5}
                  fill="#71717A"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="Geist Mono, monospace"
                >
                  {val.toLocaleString()} MW
                </text>
              </g>
            );
          })}

          {/* Time markers on X-Axis */}
          {periods.map((p, idx) => {
            if (p.settlementPeriod % 6 === 1 || p.settlementPeriod === 48) {
              const x = getX(idx);
              return (
                <g key={idx}>
                  <line
                    x1={x}
                    y1={padding.top + innerHeight}
                    x2={x}
                    y2={padding.top + innerHeight + 4}
                    stroke="#262626"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={padding.top + innerHeight + 16}
                    fill="#A1A1AA"
                    fontSize="10"
                    textAnchor="middle"
                    fontFamily="Geist Mono, monospace"
                  >
                    {p.clockTime}
                  </text>
                  <text
                    x={x}
                    y={padding.top + innerHeight + 27}
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

          {/* Subtle Monochrome Error Area Fill */}
          <polygon
            points={errorAreaPolygon}
            fill="#FAFAFA"
            fillOpacity="0.04"
            stroke="none"
          />

          {/* Demand curve (long dash muted gray) */}
          {showDemand && (
            <path
              d={demandPath}
              fill="none"
              stroke="#52525B"
              strokeWidth="1.2"
              strokeDasharray="6 4"
            />
          )}

          {/* Thermal residual curve (dotted light gray) */}
          {showThermalResidual && (
            <path
              d={thermalPath}
              fill="none"
              stroke="#D4D4D8"
              strokeWidth="1.5"
              strokeDasharray="2 3"
            />
          )}

          {/* Intraday forecast (dashed medium gray) */}
          {showIntraday && (
            <path
              d={intradayPath}
              fill="none"
              stroke="#71717A"
              strokeWidth="1.4"
              strokeDasharray="5 3"
            />
          )}

          {/* Day-Ahead forecast curve (solid light-medium gray) */}
          <path
            d={daForecastPath}
            fill="none"
            stroke="#A1A1AA"
            strokeWidth="1.75"
            strokeLinecap="round"
          />

          {/* Actual generation curve (solid crisp white) */}
          <path
            d={actualPath}
            fill="none"
            stroke="#FAFAFA"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Interactive vertical hover indicator */}
          {hoveredIndex !== null && (
            <g>
              <line
                x1={getX(hoveredIndex)}
                y1={padding.top}
                x2={getX(hoveredIndex)}
                y2={padding.top + innerHeight}
                stroke="#71717A"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoveredIndex)}
                cy={getY(periods[hoveredIndex].actualGeneration)}
                r="3.5"
                fill="#FAFAFA"
                stroke="#000000"
                strokeWidth="1.5"
              />
              <circle
                cx={getX(hoveredIndex)}
                cy={getY(periods[hoveredIndex].dayAheadForecast)}
                r="3.5"
                fill="#A1A1AA"
                stroke="#000000"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Invisible interactive hover columns */}
          {periods.map((_, idx) => {
            const xLeft = idx === 0 ? padding.left : (getX(idx - 1) + getX(idx)) / 2;
            const xRight =
              idx === periods.length - 1
                ? width - padding.right
                : (getX(idx) + getX(idx + 1)) / 2;
            return (
              <rect
                key={idx}
                x={xLeft}
                y={padding.top}
                width={Math.max(1, xRight - xLeft)}
                height={innerHeight}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredIndex(idx)}
              />
            );
          })}
        </svg>
      </div>

      {/* Monochrome Hover Readout Bar */}
      <div className="mt-3 pt-3 border-t border-[#262626] flex flex-wrap items-center justify-between gap-3 text-xs min-h-[28px]">
        {hoveredData ? (
          <>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-[#FAFAFA] font-medium">
                P{hoveredData.settlementPeriod} ({hoveredData.clockTime} GMT)
              </span>
              <span className="text-[#52525B]">·</span>
              <span className="text-[#71717A]">
                {hoveredData.startTime.replace('T', ' ').substring(0, 16)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 font-mono">
              <div>
                <span className="text-[#71717A] font-sans">Actual: </span>
                <span className="text-[#FAFAFA] font-medium">
                  {hoveredData.actualGeneration.toLocaleString()} MW
                </span>
              </div>
              <div>
                <span className="text-[#71717A] font-sans">DA Forecast: </span>
                <span className="text-[#A1A1AA]">
                  {hoveredData.dayAheadForecast.toLocaleString()} MW
                </span>
              </div>
              <div>
                <span className="text-[#71717A] font-sans">Error: </span>
                <span className="text-[#FAFAFA]">
                  {hoveredData.forecastError > 0 ? '+' : ''}
                  {hoveredData.forecastError.toLocaleString()} MW ({hoveredData.percentageError}%)
                </span>
              </div>
              {showThermalResidual && (
                <div>
                  <span className="text-[#71717A] font-sans">Thermal Gap: </span>
                  <span className="text-[#A1A1AA]">
                    {hoveredData.residualThermalRequired.toLocaleString()} MW
                  </span>
                </div>
              )}
              <Badge variant="outline" className="font-sans text-[10px]">
                {hoveredData.forecastError > 1000
                  ? 'Short Risk'
                  : hoveredData.forecastError < -1000
                  ? 'Long Risk'
                  : 'Balanced'}
              </Badge>
            </div>
          </>
        ) : (
          <span className="text-[#71717A] text-[11px]">
            Hover over any settlement period on the chart to inspect exact MW telemetry and forecast deviation.
          </span>
        )}
      </div>
    </div>
  );
};
