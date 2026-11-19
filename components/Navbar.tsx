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
    <header className="sticky top-0 z-30 pt-safe glass-bar border-b border-linen-200 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        {/* Brand & Couple Names */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-wine-50 border border-wine-200 flex items-center justify-center shadow-sm">
            <WineIcon className="w-4 h-4 text-wine-700" />
          </div>
          <div className="min-w-0">
            <span className="block font-serif font-bold text-lg tracking-[0.22em] text-ink-900 uppercase leading-none">
              Vino
            </span>
            <p className="text-[11px] text-ink-500 mt-1 font-sans truncate leading-none">
              <span className="text-ink-900 font-medium">{me.name}</span>
              {partner && (
                <>
                  {' '}
                  <span className="text-wine-700 font-serif italic text-xs">&amp;</span>{' '}
                  <span className="text-ink-900 font-medium">{partner.name}</span>
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
          className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full bg-white hover:bg-linen-100 border border-linen-200 hover:border-linen-300 shadow-sm transition-all flex-shrink-0"
        >
          <span className="w-7 h-7 rounded-full bg-wine-700 text-xs font-bold text-white flex items-center justify-center">
            {me.name.charAt(0).toUpperCase()}
          </span>
          <span className="text-xs font-semibold text-ink-900 max-w-[80px] truncate hidden min-[360px]:inline">
            {me.name}
          </span>
          <SlidersHorizontal className="w-3.5 h-3.5 text-ink-500" />
        </button>
      </div>
    </header>
  );
}
