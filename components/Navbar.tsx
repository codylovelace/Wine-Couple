'use client';

import React from 'react';
import { Wine as WineIcon, SlidersHorizontal } from 'lucide-react';
import { PublicUser } from '@/lib/types';

interface NavbarProps {
  me: PublicUser;
  partner: PublicUser | null;
  onOpenSettings: () => void;
}

export function Navbar({ me, partner, onOpenSettings }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 pt-safe glass-bar border-b border-white/[0.07] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        {/* Brand & Couple Names */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-wine-950/90 border border-champagne-400/25 flex items-center justify-center shadow-sm">
            <WineIcon className="w-4 h-4 text-champagne-gold" />
          </div>
          <div className="min-w-0">
            <span className="block font-serif font-bold text-lg tracking-[0.22em] text-champagne-100 uppercase leading-none">
              Vino
            </span>
            <p className="text-[11px] text-stone-400 mt-1 font-sans truncate leading-none">
              <span className="text-stone-200 font-medium">{me.name}</span>
              {partner && (
                <>
                  {' '}
                  <span className="text-champagne-400 font-serif italic text-xs">&amp;</span>{' '}
                  <span className="text-stone-200 font-medium">{partner.name}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Account & Settings */}
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label={`Settings and account (signed in as ${me.name})`}
          className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full bg-cellar-850 hover:bg-cellar-800 border border-white/10 hover:border-champagne-400/35 transition-all flex-shrink-0"
        >
          <span className="w-7 h-7 rounded-full bg-wine-900 border border-champagne-400/40 text-xs font-bold text-champagne-100 flex items-center justify-center">
            {me.name.charAt(0).toUpperCase()}
          </span>
          <span className="text-xs font-medium text-stone-200 max-w-[80px] truncate hidden min-[360px]:inline">
            {me.name}
          </span>
          <SlidersHorizontal className="w-3.5 h-3.5 text-champagne-400/80" />
        </button>
      </div>
    </header>
  );
}
