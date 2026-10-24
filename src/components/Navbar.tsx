import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  Sliders,
  Database,
  Menu
} from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';

export type ActiveTab = 'trading' | 'analytics' | 'procurement' | 'explorer';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedDate: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const tabs: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: 'trading', label: 'Trading Desk', icon: Activity },
    { id: 'analytics', label: 'Forecast Accuracy', icon: BarChart3 },
    { id: 'procurement', label: 'Thermal Gap & Simulator', icon: Sliders },
    { id: 'explorer', label: 'Elexon Data', icon: Database },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#000000] border-b border-[#262626]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 gap-4">
          {/* Left: Compact AeroCast Wordmark + Navigation */}
          <div className="flex items-center gap-6 min-w-0">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-5 h-5 bg-[#FAFAFA] text-[#000000] rounded-[3px] flex items-center justify-center">
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M8 2L14 13H2L8 2Z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-[#FAFAFA] tracking-tight">
                AeroCast
              </span>
              <span className="text-xs text-[#71717A] font-mono">/</span>
              <span className="text-xs text-[#A1A1AA] font-mono">uk-bmrs</span>
            </div>

            <Separator orientation="vertical" className="h-4 hidden lg:block" />

            {/* Desktop Navigation */}
            <nav aria-label="Main navigation" className="hidden md:flex items-center gap-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative h-14 px-3 inline-flex items-center text-xs transition-colors whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'text-[#FAFAFA] font-medium'
                        : 'text-[#71717A] hover:text-[#FAFAFA]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#FAFAFA]" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Monochrome Market Metadata + Mobile Menu Trigger */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden xl:flex items-center gap-2 text-xs text-[#71717A] font-mono">
              <span className="text-[#A1A1AA]">Elexon BMRS</span>
              <span>·</span>
              <span>Jan 2026</span>
              <span>·</span>
              <span>Auction Cutoff <strong className="font-normal text-[#FAFAFA]">11:00 GMT (D-1)</strong></span>
            </div>

            {/* Mobile Menu Sheet */}
            <div className="md:hidden">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Open navigation menu">
                    <Menu className="w-4 h-4 text-[#FAFAFA]" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>AeroCast Navigation</SheetTitle>
                  </SheetHeader>
                  <Separator className="my-2" />
                  <nav className="flex flex-col gap-1">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(tab.id);
                            setMobileOpen(false);
                          }}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-left transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-[#171717] text-[#FAFAFA] font-medium'
                              : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#111111]'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 text-[#71717A]" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                  <Separator className="my-2" />
                  <div className="text-[11px] text-[#71717A] font-mono space-y-1">
                    <div>Dataset: Elexon BMRS (Jan 2026)</div>
                    <div>Gate Closure: 11:00 GMT (D-1)</div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
