'use client';

import React from 'react';
import { Wine as WineIcon, Search } from 'lucide-react';
import { PublicUser } from '@/lib/types';

interface NavbarProps {
  me: PublicUser;
  partner: PublicUser | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  showSearch: boolean;
  onToggleSearch: () => void;
  onOpenSettings: () => void;
}

export function Navbar({
  me,
  partner,
  searchQuery,
  onSearchChange,
  showSearch,
  onToggleSearch,
  onOpenSettings,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 pt-safe bg-[#0d080b]/92 backdrop-blur-2xl border-b border-champagne-500/15 px-4 py-3.5">
      <div className="flex items-center justify-between">
        {/* Brand & Couple Names */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 flex-shrink-0 rounded-2xl bg-gradient-to-br from-wine-900/90 via-wine-950 to-black flex items-center justify-center shadow-lg border border-champagne-500/30 shadow-wine-950/60">
            <WineIcon className="w-4 h-4 text-champagne-accent" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-xl tracking-[0.18em] gold-text-shimmer uppercase">
                Vino
              </span>
            </div>
            <p className="text-xs text-stone-300 mt-0.5 font-sans truncate">
              <span className="text-stone-200 font-medium">{me.name}</span>
              {partner && (
                <>
                  {' '}
                  <span className="text-champagne-400 font-serif italic">&</span>{' '}
                  <span className="text-stone-200 font-medium">{partner.name}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
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
            onClick={onOpenSettings}
            aria-label={`Settings and account (signed in as ${me.name})`}
            className="w-10 h-10 rounded-full bg-champagne-950 border border-champagne-500/40 text-sm font-bold text-champagne-accent flex items-center justify-center hover:border-champagne-gold"
          >
            {me.name.charAt(0).toUpperCase()}
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
