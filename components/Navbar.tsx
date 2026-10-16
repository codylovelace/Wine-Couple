'use client';

import React from 'react';
import { Wine as WineIcon, Search } from 'lucide-react';
import { UserSettings } from '@/lib/types';

interface NavbarProps {
  settings: UserSettings;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  showSearch: boolean;
  onToggleSearch: () => void;
  totalBottles: number;
  onOpenSettings: () => void;
  onOpenStats: () => void;
  activeFilterCount: number;
}

export function Navbar({
  settings,
  searchQuery,
  onSearchChange,
  showSearch,
  onToggleSearch,
  totalBottles,
  onOpenSettings,
  onOpenStats,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 pt-safe bg-[#0d080b]/92 backdrop-blur-2xl border-b border-champagne-500/15 px-4 py-3.5">
      <div className="flex items-center justify-between">
        {/* Brand & Couple Names */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-wine-900/90 via-wine-950 to-black flex items-center justify-center shadow-lg border border-champagne-500/30 shadow-wine-950/60">
            <WineIcon className="w-4 h-4 text-champagne-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-xl tracking-[0.18em] gold-text-shimmer uppercase">
                Vino
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-wine-950/90 text-champagne-200 border border-champagne-500/25 font-sans font-medium tracking-wide">
                Private Cellar
              </span>
            </div>
            <button
              onClick={onOpenSettings}
              className="text-xs text-stone-300 hover:text-champagne-200 flex items-center gap-1.5 transition-colors text-left mt-0.5 font-sans"
            >
              <span className="text-stone-200 font-medium">{settings.partner1Name}</span>
              <span className="text-champagne-400 font-serif italic">&</span>
              <span className="text-stone-200 font-medium">{settings.partner2Name}</span>
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSearch}
            className={`p-2.5 rounded-xl border transition-all ${
              showSearch || searchQuery
                ? 'bg-wine-950 border-champagne-500/45 text-champagne-200 shadow-sm'
                : 'bg-stone-900/70 border-white/10 text-stone-300 hover:text-white hover:border-champagne-500/30'
            }`}
            aria-label="Search wines"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenStats}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-900/80 border border-white/15 text-xs font-medium text-stone-200 hover:text-white hover:border-champagne-500/35 transition-all shadow-inner"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-champagne-gold shadow-[0_0_8px_#d4af37]" />
            <span className="font-sans text-xs font-semibold tracking-wide text-champagne-100">{totalBottles} bottles</span>
          </button>
        </div>
      </div>

      {/* Expandable Search Input */}
      {showSearch && (
        <div className="mt-3 relative animate-fadeIn">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-champagne-400/80" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search winery, grape varietal, vintage, or store..."
            autoFocus
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-stone-900/95 border border-champagne-500/25 text-sm text-stone-100 placeholder-stone-400 focus:outline-none focus:border-champagne-gold/70 focus:ring-1 focus:ring-champagne-gold/30 transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-300 hover:text-white bg-stone-800 rounded-full w-5 h-5 flex items-center justify-center"
            >
              ×
            </button>
          )}
        </div>
      )}
    </header>
  );
}
