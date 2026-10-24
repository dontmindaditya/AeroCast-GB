import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { TradingDesk } from './components/TradingDesk';
import { AccuracyAnalytics } from './components/AccuracyAnalytics';
import { ProcurementSimulator } from './components/ProcurementSimulator';
import { DataExplorer } from './components/DataExplorer';
import elexonDataRaw from './data/january_2026_wind_elexon.json';
import { ElexonDataset } from './types/energy';

const dataset: ElexonDataset = elexonDataRaw as unknown as ElexonDataset;

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('trading');
  const [selectedDate, setSelectedDate] = useState<string>('2026-01-15');
  const [gateClosureTime, setGateClosureTime] = useState<string>('11:00');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as ActiveTab | null;
    if (
      tabParam &&
      ['trading', 'analytics', 'procurement', 'explorer'].includes(
        tabParam
      )
    ) {
      setActiveTab(tabParam);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#000000] text-[#FAFAFA] flex flex-col font-sans selection:bg-[#FAFAFA] selection:text-[#000000]">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedDate={selectedDate}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'trading' && (
          <TradingDesk
            days={dataset.days}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            gateClosureTime={gateClosureTime}
            setGateClosureTime={setGateClosureTime}
            onNavigateToSimulator={() => setActiveTab('procurement')}
          />
        )}

        {activeTab === 'analytics' && <AccuracyAnalytics dataset={dataset} />}

        {activeTab === 'procurement' && (
          <ProcurementSimulator
            days={dataset.days}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />
        )}

        {activeTab === 'explorer' && <DataExplorer dataset={dataset} />}
      </main>

      <footer className="bg-[#000000] border-t border-[#262626] py-5 text-xs text-[#71717A]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#FAFAFA]">AeroCast GB</span>
            <span className="text-[#262626]">/</span>
            <span>UK Day-Ahead Electricity Market Procurement & Forecast Risk Engine</span>
          </div>

          <div className="flex items-center gap-3 text-[#71717A]">
            <span>Data: Elexon BMRS (FUELHH & WINDFOR)</span>
            <span className="text-[#262626]">/</span>
            <span>Delivery: January 2026</span>
            <span className="text-[#262626]">/</span>
            <span className="text-[#A1A1AA] font-mono">v2.0.0-geist</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
