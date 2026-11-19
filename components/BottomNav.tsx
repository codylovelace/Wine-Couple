'use client';

import React from 'react';
import { Wine, Plus, BarChart3, ShoppingBag, Camera, Sparkles } from 'lucide-react';

export type TabType = 'journal' | 'shopping' | 'recommendations' | 'stats';

interface BottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenAddModal: () => void;
  pendingCount?: number;
}

export function BottomNav({
  activeTab,
  onSelectTab,
  onOpenAddModal,
  pendingCount = 0,
}: BottomNavProps) {
  const navBtnClass = (isActive: boolean) =>
    `flex flex-col items-center justify-center gap-1 py-1.5 px-2 min-[380px]:px-3.5 rounded-xl transition-all font-sans relative ${
      isActive ? 'text-champagne-gold font-semibold' : 'text-stone-400 hover:text-stone-100 font-medium'
    }`;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 glass-bar border-t border-white/[0.08] pb-safe">
      <div className="max-w-2xl mx-auto px-2 min-[380px]:px-4 pt-2 flex items-center justify-between relative">
        {/* Tab 1: Cellar */}
        <button
          type="button"
          onClick={() => onSelectTab('journal')}
          className={navBtnClass(activeTab === 'journal')}
        >
          <div className="relative">
            <Wine className={`w-5 h-5 transition-transform ${activeTab === 'journal' ? 'scale-105 text-champagne-gold' : ''}`} />
            {pendingCount > 0 && (
              <span
                aria-label={`${pendingCount} awaiting your rating`}
                className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-wine-600 border border-champagne-400/50 text-[10px] font-bold text-champagne-50 flex items-center justify-center tabular-nums"
              >
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </div>
          <span className="text-[11px] tracking-wide whitespace-nowrap">Cellar</span>
        </button>

        {/* Tab 2: Shop / Aisle Guide */}
        <button
          type="button"
          onClick={() => onSelectTab('shopping')}
          className={navBtnClass(activeTab === 'shopping')}
        >
          <ShoppingBag className={`w-5 h-5 transition-transform ${activeTab === 'shopping' ? 'scale-105 text-champagne-gold' : ''}`} />
          <span className="text-[11px] tracking-wide whitespace-nowrap">Shop</span>
        </button>

        {/* Center Floating Action Button: Log / Scan Bottle */}
        <div className="relative -mt-6 flex justify-center">
          <button
            type="button"
            onClick={onOpenAddModal}
            className="w-14 h-14 rounded-full bg-wine-700 hover:bg-wine-600 flex items-center justify-center text-champagne-50 border-2 border-champagne-400/45 shadow-[0_8px_24px_rgba(126,29,52,0.55)] active:scale-95 transition-all group"
            aria-label="Scan or add wine"
          >
            <div className="relative flex items-center justify-center">
              <Camera className="w-5 h-5 text-champagne-100 group-hover:scale-105 transition-transform" />
              <Plus className="w-3.5 h-3.5 absolute -top-1.5 -right-2 text-champagne-gold stroke-[2.5]" />
            </div>
          </button>
        </div>

        {/* Tab 3: Discover / AI Sommelier */}
        <button
          type="button"
          onClick={() => onSelectTab('recommendations')}
          className={navBtnClass(activeTab === 'recommendations')}
        >
          <Sparkles className={`w-5 h-5 transition-transform ${activeTab === 'recommendations' ? 'scale-105 text-champagne-gold' : ''}`} />
          <span className="text-[11px] tracking-wide whitespace-nowrap">Discover</span>
        </button>

        {/* Tab 4: Insights */}
        <button
          type="button"
          onClick={() => onSelectTab('stats')}
          className={navBtnClass(activeTab === 'stats')}
        >
          <BarChart3 className={`w-5 h-5 transition-transform ${activeTab === 'stats' ? 'scale-105 text-champagne-gold' : ''}`} />
          <span className="text-[11px] tracking-wide whitespace-nowrap">Insights</span>
        </button>
      </div>
    </nav>
  );
}
