import React, { useState, useMemo } from 'react';
import {
  Download,
  AlertTriangle,
  Search,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { DayDataset } from '../types/energy';
import { WindForecastChart } from './WindForecastChart';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectItem } from './ui/select';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './ui/table';

interface TradingDeskProps {
  days: DayDataset[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  gateClosureTime: string;
  setGateClosureTime: (time: string) => void;
  onNavigateToSimulator?: () => void;
}

export const TradingDesk: React.FC<TradingDeskProps> = ({
  days,
  selectedDate,
  setSelectedDate,
  gateClosureTime,
  setGateClosureTime,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'over' | 'under' | 'severe'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showIntraday, setShowIntraday] = useState(true);
  const [showThermalResidual, setShowThermalResidual] = useState(true);

  const currentDay = useMemo(() => {
    return days.find((d) => d.date === selectedDate) || days[0];
  }, [days, selectedDate]);

  const filteredPeriods = useMemo(() => {
    if (!currentDay) return [];
    return currentDay.periods.filter((p) => {
      const matchesSearch =
        p.settlementPeriod.toString().includes(searchTerm) ||
        p.clockTime.includes(searchTerm);

      if (!matchesSearch) return false;

      if (filterType === 'over') return p.forecastError > 300;
      if (filterType === 'under') return p.forecastError < -300;
      if (filterType === 'severe') return p.absError >= 1500;
      return true;
    });
  }, [currentDay, filterType, searchTerm]);

  const handleExportCsv = () => {
    if (!currentDay) return;
    const headers = [
      'SettlementPeriod',
      'ClockTimeGMT',
      'TargetStartTime',
      'ActualGenerationMW',
      'DayAheadForecastMW',
      'IntradayForecastMW',
      'ForecastErrorMW',
      'PercentageError',
      'ConsumerDemandMW',
      'ResidualThermalRequiredMW',
    ];
    const rows = currentDay.periods.map((p) => [
      p.settlementPeriod,
      p.clockTime,
      p.startTime,
      p.actualGeneration,
      p.dayAheadForecast,
      p.intradayForecast,
      p.forecastError,
      p.percentageError,
      p.demand,
      p.residualThermalRequired,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Elexon_DayAhead_Wind_${currentDay.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = currentDay?.summary;

  const maxPeriod = useMemo(() => {
    if (!currentDay) return null;
    return [...currentDay.periods].sort((a, b) => b.absError - a.absError)[0];
  }, [currentDay]);

  return (
    <div className="space-y-6">
      {/* 1. Page Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#FAFAFA] tracking-tight">
            Day-Ahead Renewable Procurement
          </h1>
          <p className="text-[13px] text-[#71717A] mt-0.5">
            National wind generation forecasts and outturn for UK wholesale auction bidding
          </p>
        </div>

        {/* Compact Monochrome Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label htmlFor="delivery-date-select" className="text-xs text-[#71717A]">
              Delivery
            </label>
            <Select
              id="delivery-date-select"
              value={selectedDate}
              onValueChange={setSelectedDate}
              aria-label="Select delivery date"
            >
              {days.map((d) => (
                <SelectItem key={d.date} value={d.date}>
                  {d.date} ({d.dayOfWeek})
                </SelectItem>
              ))}
            </Select>
          </div>

          {/* Quick Date Presets */}
          <div className="hidden sm:flex items-center gap-1">
            {[
              { date: '2026-01-01', label: 'Jan 01' },
              { date: '2026-01-08', label: 'Jan 08' },
              { date: '2026-01-15', label: 'Jan 15' },
              { date: '2026-01-28', label: 'Jan 28' },
            ].map((preset) => {
              const isSelected = selectedDate === preset.date;
              return (
                <button
                  key={preset.date}
                  type="button"
                  onClick={() => setSelectedDate(preset.date)}
                  className={`h-8 px-2.5 rounded-md text-xs font-mono transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-[#171717] text-[#FAFAFA] border-[#FAFAFA]'
                      : 'bg-[#0A0A0A] text-[#A1A1AA] border-[#262626] hover:text-[#FAFAFA] hover:bg-[#111111]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Auction Cutoff Selector */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="gate-closure-select" className="text-xs text-[#71717A]">
              Cutoff
            </label>
            <Select
              id="gate-closure-select"
              value={gateClosureTime}
              onValueChange={setGateClosureTime}
              aria-label="Select auction gate cutoff"
            >
              <SelectItem value="11:00">11:00 GMT (EPEX/N2EX)</SelectItem>
              <SelectItem value="10:00">10:00 GMT (Early)</SelectItem>
              <SelectItem value="09:00">09:00 GMT (Morning)</SelectItem>
              <SelectItem value="12:00">12:00 GMT (Post-Auction)</SelectItem>
            </Select>
          </div>

          <Button variant="secondary" onClick={handleExportCsv}>
            <Download className="w-3.5 h-3.5 text-[#A1A1AA]" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* 2. Compact Five-Column Metric Strip */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#262626] border border-[#262626] bg-[#0A0A0A] rounded-md">
          {/* Metric 1: Day-Ahead MAE */}
          <div className="p-4">
            <span className="text-xs text-[#71717A] block">Day-Ahead MAE</span>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-[28px] font-semibold font-mono text-[#FAFAFA] tabular-nums leading-none">
                {summary.mae.toLocaleString()}
              </span>
              <span className="text-xs text-[#71717A] font-mono">MW</span>
            </div>
            <div className="text-xs text-[#A1A1AA] mt-2 font-mono">
              {summary.wape}% WAPE of wind volume
            </div>
          </div>

          {/* Metric 2: Forecast RMSE */}
          <div className="p-4">
            <span className="text-xs text-[#71717A] block">Forecast RMSE</span>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-[28px] font-semibold font-mono text-[#FAFAFA] tabular-nums leading-none">
                {summary.rmse.toLocaleString()}
              </span>
              <span className="text-xs text-[#71717A] font-mono">MW</span>
            </div>
            <div className="text-xs text-[#A1A1AA] mt-2 font-mono">
              {(summary.rmse / (summary.mae || 1)).toFixed(2)}x MAE ramping ratio
            </div>
          </div>

          {/* Metric 3: Forecast Bias (ME) */}
          <div className="p-4">
            <span className="text-xs text-[#71717A] block">Forecast Bias (ME)</span>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-[28px] font-semibold font-mono text-[#FAFAFA] tabular-nums leading-none">
                {summary.meanError > 0 ? '+' : ''}
                {summary.meanError.toLocaleString()}
              </span>
              <span className="text-xs text-[#71717A] font-mono">MW</span>
            </div>
            <div className="text-xs text-[#A1A1AA] mt-2 flex items-center gap-1">
              {summary.meanError > 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-[#A1A1AA]" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 text-[#A1A1AA]" />
              )}
              <span>{summary.meanError > 0 ? 'Over-forecast bias' : 'Under-forecast bias'}</span>
            </div>
          </div>

          {/* Metric 4: Actual Generation */}
          <div className="p-4">
            <span className="text-xs text-[#71717A] block">Actual Generation</span>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-[28px] font-semibold font-mono text-[#FAFAFA] tabular-nums leading-none">
                {summary.totalActualMWh.toLocaleString()}
              </span>
              <span className="text-xs text-[#71717A] font-mono">MWh</span>
            </div>
            <div className="text-xs text-[#A1A1AA] mt-2">
              Delivered FUELHH wind outturn
            </div>
          </div>

          {/* Metric 5: Forecast Contracted */}
          <div className="p-4">
            <span className="text-xs text-[#71717A] block">Forecast Contracted</span>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-[28px] font-semibold font-mono text-[#FAFAFA] tabular-nums leading-none">
                {summary.totalForecastMWh.toLocaleString()}
              </span>
              <span className="text-xs text-[#71717A] font-mono">MWh</span>
            </div>
            <div className="text-xs text-[#A1A1AA] mt-2 font-mono">
              {summary.rampAlertCount} periods &gt; 1,500 MW error
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Asymmetric Section: 48-Period Chart (Left) + Market Position Outlook (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Primary Chart Panel */}
        <Card className="lg:col-span-8">
          <CardHeader className="pb-3 border-b border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle>48-Period Generation &amp; Forecast Horizon</CardTitle>
              <CardDescription className="mt-1">
                Elexon BMRS WINDFOR ({gateClosureTime} GMT cutoff) vs FUELHH actuals
              </CardDescription>
            </div>

            {/* Monochrome Legend & Checkboxes */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-3 text-[#A1A1AA]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-[2px] bg-[#FAFAFA] inline-block" />
                  <span>Actual</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-[2px] bg-[#A1A1AA] inline-block" />
                  <span>DA Forecast</span>
                </span>
              </div>

              <Separator orientation="vertical" className="h-3.5 hidden sm:block" />

              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] cursor-pointer">
                  <Checkbox
                    checked={showIntraday}
                    onCheckedChange={setShowIntraday}
                    aria-label="Toggle Intraday series"
                  />
                  <span className="inline-flex items-center gap-1">
                    <span className="w-3 border-t border-dashed border-[#71717A] inline-block" />
                    <span>Intraday</span>
                  </span>
                </label>

                <label className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] cursor-pointer">
                  <Checkbox
                    checked={showThermalResidual}
                    onCheckedChange={setShowThermalResidual}
                    aria-label="Toggle Thermal Gap series"
                  />
                  <span className="inline-flex items-center gap-1">
                    <span className="w-3 border-t border-dotted border-[#D4D4D8] inline-block" />
                    <span>Thermal Gap</span>
                  </span>
                </label>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-5">
            <WindForecastChart
              periods={currentDay?.periods || []}
              showIntraday={showIntraday}
              showThermalResidual={showThermalResidual}
            />
          </CardContent>
        </Card>

        {/* Right: Market Position Outlook (Single cohesive panel, no nested cards) */}
        <Card className="lg:col-span-4 flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-[#262626] flex flex-row items-center justify-between space-y-0">
            <CardTitle>Market Position Outlook</CardTitle>
            <Badge variant="outline">
              {summary?.biasDirection === 'OVER_FORECAST' ? 'Short Risk' : 'Long Risk'}
            </Badge>
          </CardHeader>

          <CardContent className="pt-4 flex-1 flex flex-col justify-between space-y-4">
            {/* Balancing Exposure Summary */}
            <div className="space-y-1.5">
              <span className="text-xs text-[#71717A] block">Expected balancing exposure</span>
              <p className="text-[13px] text-[#A1A1AA] leading-relaxed">
                {summary?.biasDirection === 'OVER_FORECAST'
                  ? 'Wind generation was overestimated prior to gate closure. Portfolio faces short cash-out exposure at System Buy Price unless thermal peakers cover the deficit.'
                  : 'Wind generation was underestimated prior to gate closure. Portfolio carries surplus length that spills into the Balancing Mechanism at System Sell Price.'}
              </p>
            </div>

            <Separator />

            {/* Key-Value Risk Telemetry */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#71717A]">Peak deviation period</span>
                <span className="font-mono text-[#FAFAFA]">
                  {maxPeriod ? `P${maxPeriod.settlementPeriod} (${maxPeriod.clockTime} GMT)` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#71717A]">Peak error magnitude</span>
                <span className="font-mono text-[#FAFAFA]">
                  {maxPeriod ? `${Math.abs(maxPeriod.forecastError).toLocaleString()} MW` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#71717A]">Peak thermal gap</span>
                <span className="font-mono text-[#FAFAFA]">
                  {maxPeriod ? `${maxPeriod.residualThermalRequired.toLocaleString()} MW` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#71717A]">Telemetry lock (D-1)</span>
                <span className="font-mono text-[#A1A1AA]">
                  {currentDay?.daPublishTime.substring(11, 16)} GMT
                </span>
              </div>
            </div>

            <Separator />

            {/* Daily Quantile Error Range */}
            <div className="space-y-2.5">
              <span className="text-xs text-[#71717A] block">Daily error distribution (MW)</span>
              <div className="grid grid-cols-3 divide-x divide-[#262626] border border-[#262626] rounded bg-[#000000] py-2 text-center">
                <div>
                  <span className="text-[10px] text-[#71717A] block">P10</span>
                  <span className="text-xs font-mono font-medium text-[#FAFAFA] tabular-nums">
                    {summary?.p10.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#71717A] block">P50</span>
                  <span className="text-xs font-mono font-medium text-[#FAFAFA] tabular-nums">
                    {summary?.p50.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#71717A] block">P90</span>
                  <span className="text-xs font-mono font-medium text-[#FAFAFA] tabular-nums">
                    {summary?.p90.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-1">
                <div className="relative h-1.5 w-full bg-[#171717] rounded-full overflow-hidden">
                  <div className="absolute left-[20%] right-[20%] h-full bg-[#52525B]" />
                  <div className="absolute left-[50%] w-0.5 h-full bg-[#FAFAFA]" />
                </div>
                <div className="flex justify-between text-[10px] text-[#71717A] mt-1">
                  <span>Under-forecast</span>
                  <span>Median</span>
                  <span>Over-forecast</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Settlement Periods Schedule Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-4 space-y-0">
          <div className="flex items-center gap-3">
            <CardTitle>Settlement Periods Schedule</CardTitle>
            <span className="text-xs text-[#71717A] font-mono">
              {filteredPeriods.length} of 48 periods
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-52">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#71717A]" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter period or time..."
                className="pl-8"
              />
            </div>

            <Tabs value={filterType} onValueChange={(v) => setFilterType(v as any)} className="w-auto">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="over">Over-forecast</TabsTrigger>
                <TabsTrigger value="under">Under-forecast</TabsTrigger>
                <TabsTrigger value="severe">Severe (&gt;1.5GW)</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Time (GMT)</TableHead>
              <TableHead className="text-right">Actual Wind</TableHead>
              <TableHead className="text-right">DA Forecast</TableHead>
              <TableHead className="text-right">Error (F - A)</TableHead>
              <TableHead className="text-right">Abs Error %</TableHead>
              <TableHead className="text-right">Thermal Gap</TableHead>
              <TableHead>Position Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="font-mono">
            {filteredPeriods.map((p) => {
              const isOver = p.forecastError > 400;
              const isUnder = p.forecastError < -400;
              const isSevere = p.absError >= 1500;

              return (
                <TableRow key={p.settlementPeriod}>
                  <TableCell className="text-[#FAFAFA] font-medium">
                    P{p.settlementPeriod}
                  </TableCell>
                  <TableCell className="text-[#A1A1AA]">
                    {p.clockTime}
                  </TableCell>
                  <TableCell className="text-right text-[#FAFAFA] tabular-nums">
                    {p.actualGeneration.toLocaleString()} <span className="text-[10px] text-[#71717A]">MW</span>
                  </TableCell>
                  <TableCell className="text-right text-[#A1A1AA] tabular-nums">
                    {p.dayAheadForecast.toLocaleString()} <span className="text-[10px] text-[#71717A]">MW</span>
                  </TableCell>
                  <TableCell className="text-right text-[#FAFAFA] tabular-nums">
                    {p.forecastError > 0 ? '+' : ''}
                    {p.forecastError.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-[#71717A] tabular-nums">
                    {p.percentageError}%
                  </TableCell>
                  <TableCell className="text-right text-[#FAFAFA] tabular-nums">
                    {p.residualThermalRequired.toLocaleString()} <span className="text-[10px] text-[#71717A]">MW</span>
                  </TableCell>
                  <TableCell className="font-sans">
                    {isSevere ? (
                      <Badge variant="default" className="gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>High Imbalance</span>
                      </Badge>
                    ) : isOver ? (
                      <Badge variant="outline">Short (Under-procured)</Badge>
                    ) : isUnder ? (
                      <Badge variant="secondary">Long (Surplus Spill)</Badge>
                    ) : (
                      <span className="text-xs text-[#71717A]">Balanced</span>
                    )}
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
