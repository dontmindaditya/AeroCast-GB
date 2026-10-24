import React, { useState } from 'react';
import { Download, RefreshCw, CheckCircle2, FileJson, Table as TableIcon } from 'lucide-react';
import { ElexonDataset } from '../types/energy';
import { Card, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectItem } from './ui/select';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './ui/table';

interface DataExplorerProps {
  dataset: ElexonDataset;
}

export const DataExplorer: React.FC<DataExplorerProps> = ({ dataset }) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState('0');
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
  const [isLiveQuerying, setIsLiveQuerying] = useState(false);
  const [liveQueryMessage, setLiveQueryMessage] = useState<string | null>(null);

  const currentDay = dataset.days[Number(selectedDayIndex)] || dataset.days[0];

  const handleTestLiveApi = async () => {
    setIsLiveQuerying(true);
    setLiveQueryMessage(null);
    try {
      const url = `https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream?publishDateTimeFrom=2026-01-15T00:00:00Z&publishDateTimeTo=2026-01-15T04:00:00Z`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const windRecords = data.filter((d: any) => d.fuelType === 'WIND');
      setLiveQueryMessage(
        `Live Elexon query succeeded: retrieved ${data.length} records (${windRecords.length} WIND actuals) from data.elexon.co.uk`
      );
    } catch (err: any) {
      setLiveQueryMessage(
        `Live query status: ${err.message}. Pre-validated January 2026 Elexon dataset is active.`
      );
    } finally {
      setIsLiveQuerying(false);
    }
  };

  const handleDownloadFullJson = () => {
    const jsonStr = JSON.stringify(dataset, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Elexon_BMRS_Wind_January_2026_Full.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#FAFAFA] tracking-tight">
            Elexon BMRS Raw Dataset Explorer
          </h1>
          <p className="text-sm text-[#A1A1AA] mt-1">
            Verified streams from Elexon BMRS: FUELHH (fuelType: WIND) & WINDFOR national forecasts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="default"
            onClick={handleTestLiveApi}
            disabled={isLiveQuerying}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLiveQuerying ? 'animate-spin' : ''}`} />
            <span>Test Live Elexon API</span>
          </Button>

          <Button variant="default" size="default" onClick={handleDownloadFullJson}>
            <Download className="w-3.5 h-3.5" />
            <span>Download January 2026 JSON</span>
          </Button>
        </div>
      </div>

      {liveQueryMessage && (
        <div className="p-3 bg-[#0A0A0A] border border-[#262626] rounded-md text-xs text-[#FAFAFA] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#FAFAFA] shrink-0" />
          <span>{liveQueryMessage}</span>
        </div>
      )}

      {/* 2. Compact 4-Column Metadata Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-[#262626] rounded-md bg-[#0A0A0A] divide-y lg:divide-y-0 divide-x divide-[#262626]">
        <div className="p-4">
          <span className="text-xs font-medium text-[#A1A1AA] block">Total Days</span>
          <span className="text-2xl font-semibold font-mono text-[#FAFAFA] tabular-nums mt-2 block">
            {dataset.monthSummary.totalDays} Days
          </span>
          <span className="text-xs text-[#71717A] mt-1.5 block">Jan 01 to Jan 31, 2026</span>
        </div>

        <div className="p-4">
          <span className="text-xs font-medium text-[#A1A1AA] block">Settlement Periods</span>
          <span className="text-2xl font-semibold font-mono text-[#FAFAFA] tabular-nums mt-2 block">
            {dataset.monthSummary.totalSettlementPeriods.toLocaleString()}
          </span>
          <span className="text-xs text-[#71717A] mt-1.5 block">30-minute UK resolution</span>
        </div>

        <div className="p-4">
          <span className="text-xs font-medium text-[#A1A1AA] block">Total Generation</span>
          <span className="text-2xl font-semibold font-mono text-[#FAFAFA] tabular-nums mt-2 block">
            {dataset.monthSummary.totalActualGenerationGWh.toLocaleString()} GWh
          </span>
          <span className="text-xs text-[#71717A] mt-1.5 block">FUELHH wind outturn</span>
        </div>

        <div className="p-4">
          <span className="text-xs font-medium text-[#A1A1AA] block">Monthly WAPE</span>
          <span className="text-2xl font-semibold font-mono text-[#FAFAFA] tabular-nums mt-2 block">
            {dataset.monthSummary.overallWapePercent}%
          </span>
          <span className="text-xs text-[#71717A] mt-1.5 block">Weighted forecast error</span>
        </div>
      </div>

      {/* 3. Table / JSON Explorer Panel */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262626] pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-[#71717A]">Select Date:</span>
            <Select
              aria-label="Explorer Select Date"
              value={selectedDayIndex}
              onValueChange={setSelectedDayIndex}
              className="w-[260px]"
            >
              {dataset.days.map((d, i) => (
                <SelectItem key={d.date} value={String(i)}>
                  {d.date} ({d.dayOfWeek}) · {d.summary.totalActualMWh.toLocaleString()} MWh
                </SelectItem>
              ))}
            </Select>
          </div>

          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <TabsList>
              <TabsTrigger value="table" className="flex items-center gap-1.5">
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table</span>
              </TabsTrigger>
              <TabsTrigger value="json" className="flex items-center gap-1.5">
                <FileJson className="w-3.5 h-3.5" />
                <span>Raw JSON</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        {viewMode === 'table' ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#000000] hover:bg-[#000000]">
                <TableHead>Period</TableHead>
                <TableHead>Clock Time</TableHead>
                <TableHead>Target Timestamp (ISO)</TableHead>
                <TableHead className="text-right">Actual Wind</TableHead>
                <TableHead className="text-right">DA Forecast</TableHead>
                <TableHead className="text-right">Error (MW)</TableHead>
                <TableHead className="text-right">Demand</TableHead>
                <TableHead className="text-right">Thermal Gap</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="font-mono">
              {currentDay.periods.map((p) => (
                <TableRow key={p.settlementPeriod}>
                  <TableCell className="text-[#FAFAFA] font-semibold">
                    P{p.settlementPeriod}
                  </TableCell>
                  <TableCell className="text-[#A1A1AA]">{p.clockTime}</TableCell>
                  <TableCell className="text-[#71717A]">{p.startTime}</TableCell>
                  <TableCell className="text-right text-[#FAFAFA] font-medium">
                    {p.actualGeneration.toLocaleString()} MW
                  </TableCell>
                  <TableCell className="text-right text-[#A1A1AA]">
                    {p.dayAheadForecast.toLocaleString()} MW
                  </TableCell>
                  <TableCell className="text-right text-[#FAFAFA]">
                    {p.forecastError > 0 ? '+' : ''}
                    {p.forecastError.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-[#A1A1AA]">
                    {p.demand.toLocaleString()} MW
                  </TableCell>
                  <TableCell className="text-right text-[#FAFAFA] font-semibold">
                    {p.residualThermalRequired.toLocaleString()} MW
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-4 bg-[#000000] font-mono text-xs text-[#A1A1AA] overflow-x-auto max-h-[520px]">
            <pre>{JSON.stringify(currentDay, null, 2)}</pre>
          </div>
        )}
      </Card>
    </div>
  );
};
