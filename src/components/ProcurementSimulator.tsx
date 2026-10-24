import React, { useState, useMemo } from 'react';
import { DayDataset, ProcurementStrategy } from '../types/energy';
import { calculateThermalProcurementMW, evaluateImbalanceEconomics } from '../utils/metrics';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectItem } from './ui/select';
import { Separator } from './ui/separator';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './ui/table';

interface ProcurementSimulatorProps {
  days: DayDataset[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

export const ProcurementSimulator: React.FC<ProcurementSimulatorProps> = ({
  days,
  selectedDate,
  setSelectedDate,
}) => {
  const [strategy, setStrategy] = useState<ProcurementStrategy>('bias_corrected');
  const [wholesalePrice, setWholesalePrice] = useState(85);
  const [systemBuyPrice, setSystemBuyPrice] = useState(150);
  const [systemSellPrice, setSystemSellPrice] = useState(45);
  const [demandScale] = useState(1.0);

  const currentDay = useMemo(() => {
    return days.find((d) => d.date === selectedDate) || days[0];
  }, [days, selectedDate]);

  const simulation = useMemo(() => {
    if (!currentDay) return null;

    const periods = currentDay.periods;
    const bias = currentDay.summary.meanError;
    const p90 = currentDay.summary.p90;

    let totalProcuredMWh = 0;
    let totalShortMWh = 0;
    let totalSurplusMWh = 0;
    let totalCashOutPenaltyGbp = 0;
    let baselinePenaltyGbp = 0;

    const periodBreakdowns = periods.map((p) => {
      const scaledDemand = Math.round(p.demand * demandScale);
      const windDa = p.dayAheadForecast;
      const windAct = p.actualGeneration;

      const thermalProcured = calculateThermalProcurementMW(
        scaledDemand,
        windDa,
        strategy,
        bias,
        p90
      );

      const baselineProcured = calculateThermalProcurementMW(
        scaledDemand,
        windDa,
        'deterministic'
      );

      const econ = evaluateImbalanceEconomics(
        thermalProcured,
        windAct,
        scaledDemand,
        wholesalePrice,
        systemBuyPrice,
        systemSellPrice
      );

      const baseEcon = evaluateImbalanceEconomics(
        baselineProcured,
        windAct,
        scaledDemand,
        wholesalePrice,
        systemBuyPrice,
        systemSellPrice
      );

      totalProcuredMWh += thermalProcured * 0.5;
      if (econ.imbalanceMWh < 0) totalShortMWh += Math.abs(econ.imbalanceMWh);
      if (econ.imbalanceMWh > 0) totalSurplusMWh += econ.imbalanceMWh;
      totalCashOutPenaltyGbp += econ.cashOutPenaltyGbp;
      baselinePenaltyGbp += baseEcon.cashOutPenaltyGbp;

      return {
        settlementPeriod: p.settlementPeriod,
        clockTime: p.clockTime,
        demand: scaledDemand,
        windForecast: windDa,
        actualWind: windAct,
        thermalProcured,
        baselineProcured,
        imbalanceMWh: econ.imbalanceMWh,
        cashOutPenaltyGbp: econ.cashOutPenaltyGbp,
      };
    });

    const savingsVsBaseline = baselinePenaltyGbp - totalCashOutPenaltyGbp;

    return {
      periodBreakdowns,
      totalProcuredMWh: Math.round(totalProcuredMWh),
      totalShortMWh: Math.round(totalShortMWh),
      totalSurplusMWh: Math.round(totalSurplusMWh),
      totalCashOutPenaltyGbp: Math.round(totalCashOutPenaltyGbp),
      baselinePenaltyGbp: Math.round(baselinePenaltyGbp),
      savingsVsBaseline: Math.round(savingsVsBaseline),
    };
  }, [currentDay, strategy, wholesalePrice, systemBuyPrice, systemSellPrice, demandScale]);

  const strategies: {
    id: ProcurementStrategy;
    title: string;
    tag: string;
    desc: string;
  }[] = [
    {
      id: 'deterministic',
      title: '1. Naive Deterministic',
      tag: 'Baseline',
      desc: 'Procures exactly (Demand - Forecast). Zero error buffering and full exposure to wind shortfalls.',
    },
    {
      id: 'bias_corrected',
      title: '2. Bias-Corrected',
      tag: 'Recommended',
      desc: `Offsets systematic bias (${currentDay?.summary.meanError > 0 ? '+' : ''}${currentDay?.summary.meanError} MW), securing extra thermal baseload day-ahead.`,
    },
    {
      id: 'risk_averse_p90',
      title: '3. Defensive (P90)',
      tag: 'Risk-Averse',
      desc: `Buffers against P90 error (${currentDay?.summary.p90} MW). Minimizes emergency Balancing Mechanism exposure.`,
    },
    {
      id: 'volatility_buffer',
      title: '4. Volatility Buffer',
      tag: 'Dynamic',
      desc: 'Applies a 12% safety margin on forecast wind volume during volatile weather regimes.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header & Date Control */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#FAFAFA] tracking-tight">
            Thermal Procurement Gap & Imbalance Simulator
          </h1>
          <p className="text-sm text-[#A1A1AA] mt-1">
            Simulate D-1 thermal procurement strategies to cover residual demand and hedge cash-out penalties
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#71717A]">Delivery Date:</span>
          <Select
            aria-label="Delivery Date"
            value={selectedDate}
            onValueChange={setSelectedDate}
            className="w-[180px]"
          >
            {days.map((d) => (
              <SelectItem key={d.date} value={d.date}>
                {d.date} ({d.dayOfWeek})
              </SelectItem>
            ))}
          </Select>
        </div>
      </div>

      {/* 2. Strategy & Pricing Configuration Panel */}
      <Card>
        <CardHeader className="border-b border-[#262626] pb-3.5">
          <CardTitle>Procurement Decision Strategy (Day-Ahead Auction)</CardTitle>
          <CardDescription>
            Select a hedging rule and calibrate market price spreads
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {strategies.map((item) => {
              const active = strategy === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStrategy(item.id)}
                  className={`p-3.5 rounded-md border text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#111111] border-[#FAFAFA] text-[#FAFAFA]'
                      : 'bg-[#000000] border-[#262626] text-[#A1A1AA] hover:border-[#52525B] hover:text-[#FAFAFA]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs text-[#FAFAFA]">{item.title}</span>
                    <Badge variant={active ? 'default' : 'outline'}>{item.tag}</Badge>
                  </div>
                  <p className="text-xs text-[#71717A] mt-2 leading-relaxed">{item.desc}</p>
                </button>
              );
            })}
          </div>

          <Separator />

          {/* Pricing Assumptions Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[#A1A1AA]">Wholesale Day-Ahead Price</span>
                <span className="font-mono text-[#FAFAFA] font-semibold tabular-nums">
                  £{wholesalePrice}/MWh
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={wholesalePrice}
                onChange={(e) => setWholesalePrice(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[#A1A1AA]">System Buy Price (Short Penalty)</span>
                <span className="font-mono text-[#FAFAFA] font-semibold tabular-nums">
                  £{systemBuyPrice}/MWh
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="350"
                value={systemBuyPrice}
                onChange={(e) => setSystemBuyPrice(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[#A1A1AA]">System Sell Price (Surplus Spill)</span>
                <span className="font-mono text-[#FAFAFA] font-semibold tabular-nums">
                  £{systemSellPrice}/MWh
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={systemSellPrice}
                onChange={(e) => setSystemSellPrice(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Financial Impact Metric Strip */}
      {simulation && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-[#262626] rounded-md bg-[#0A0A0A] divide-y sm:divide-y-0 sm:divide-x divide-[#262626]">
          <div className="p-4">
            <span className="text-xs font-medium text-[#A1A1AA] block">Total Thermal Procured</span>
            <div className="text-2xl font-semibold font-mono text-[#FAFAFA] tabular-nums mt-2">
              {simulation.totalProcuredMWh.toLocaleString()}{' '}
              <span className="text-xs font-normal text-[#71717A]">MWh</span>
            </div>
            <span className="text-xs text-[#71717A] block mt-1.5">
              Day-ahead baseload & peak commitment
            </span>
          </div>

          <div className="p-4">
            <span className="text-xs font-medium text-[#A1A1AA] block">Unhedged Short Volume</span>
            <div className="text-2xl font-semibold font-mono text-[#FAFAFA] tabular-nums mt-2">
              {simulation.totalShortMWh.toLocaleString()}{' '}
              <span className="text-xs font-normal text-[#71717A]">MWh</span>
            </div>
            <span className="text-xs text-[#71717A] block mt-1.5">
              Settled at SBP (£{systemBuyPrice}/MWh)
            </span>
          </div>

          <div className="p-4">
            <span className="text-xs font-medium text-[#A1A1AA] block">Total Cash-Out Penalty</span>
            <div className="text-2xl font-semibold font-mono text-[#FAFAFA] tabular-nums mt-2">
              £{simulation.totalCashOutPenaltyGbp.toLocaleString()}
            </div>
            <span className="text-xs text-[#71717A] block mt-1.5">
              Net imbalance exposure under active strategy
            </span>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#A1A1AA]">Savings vs Naive Baseline</span>
              <Badge variant={simulation.savingsVsBaseline >= 0 ? 'default' : 'outline'}>
                {simulation.savingsVsBaseline >= 0 ? 'Net Gain' : 'Net Cost'}
              </Badge>
            </div>
            <div className="text-2xl font-semibold font-mono text-[#FAFAFA] tabular-nums mt-2">
              {simulation.savingsVsBaseline >= 0 ? '+' : ''}£
              {simulation.savingsVsBaseline.toLocaleString()}
            </div>
            <span className="text-xs text-[#71717A] block mt-1.5">
              Value unlocked by error buffering
            </span>
          </div>
        </div>
      )}

      {/* 4. Half-Hour Dispatch Table */}
      {simulation && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-[#262626] pb-3.5">
            <div>
              <CardTitle>Half-Hour Dispatch & Procurement Schedule ({selectedDate})</CardTitle>
              <CardDescription>
                Period-by-period thermal order volume and resulting balancing position
              </CardDescription>
            </div>
            <Badge variant="secondary" className="font-mono uppercase">
              Strategy: {strategy.replace('_', ' ')}
            </Badge>
          </CardHeader>

          <Table>
            <TableHeader>
              <TableRow className="bg-[#000000] hover:bg-[#000000]">
                <TableHead>Period</TableHead>
                <TableHead>Time (GMT)</TableHead>
                <TableHead className="text-right">Demand</TableHead>
                <TableHead className="text-right">DA Wind Forecast</TableHead>
                <TableHead className="text-right">Thermal Procured</TableHead>
                <TableHead className="text-right">Delivered Wind</TableHead>
                <TableHead className="text-right">Net Imbalance</TableHead>
                <TableHead className="text-right">Cash-Out Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="font-mono">
              {simulation.periodBreakdowns.map((p) => {
                const isShort = p.imbalanceMWh < 0;
                return (
                  <TableRow key={p.settlementPeriod}>
                    <TableCell className="text-[#FAFAFA] font-semibold">
                      P{p.settlementPeriod}
                    </TableCell>
                    <TableCell className="text-[#A1A1AA]">{p.clockTime}</TableCell>
                    <TableCell className="text-right text-[#A1A1AA]">
                      {p.demand.toLocaleString()} MW
                    </TableCell>
                    <TableCell className="text-right text-[#A1A1AA]">
                      {p.windForecast.toLocaleString()} MW
                    </TableCell>
                    <TableCell className="text-right text-[#FAFAFA] font-semibold">
                      {p.thermalProcured.toLocaleString()} MW
                    </TableCell>
                    <TableCell className="text-right text-[#FAFAFA]">
                      {p.actualWind.toLocaleString()} MW
                    </TableCell>
                    <TableCell
                      className={`text-right ${
                        isShort ? 'text-[#FAFAFA] font-semibold' : 'text-[#A1A1AA]'
                      }`}
                    >
                      {p.imbalanceMWh > 0 ? '+' : ''}
                      {p.imbalanceMWh.toLocaleString()} MWh
                    </TableCell>
                    <TableCell className="text-right text-[#FAFAFA]">
                      £{p.cashOutPenaltyGbp.toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};
