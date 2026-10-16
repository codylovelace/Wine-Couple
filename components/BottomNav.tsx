'use client';

import React from 'react';
import { Wine, Plus, BarChart3, Bookmark, Settings, Camera, Sparkles } from 'lucide-react';

export type TabType = 'journal' | 'recommendations' | 'wishlist' | 'stats' | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenAddModal: () => void;
  wishlistCount: number;
}

export function BottomNav({
  activeTab,
  onSelectTab,
  onOpenAddModal,
  wishlistCount,
}: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto glass-nav px-2 min-[375px]:px-3 pt-2.5 pb-safe border-t border-champagne-500/20">
      <div className="flex items-center justify-between relative">
        {/* Tab 1: Journal */}
        <button
          onClick={() => onSelectTab('journal')}
          className={`flex flex-col items-center gap-1 py-1 px-1.5 min-[375px]:px-3 rounded-xl transition-all font-sans ${
            activeTab === 'journal'
              ? 'text-champagne-gold font-semibold'
              : 'text-stone-300 hover:text-white font-medium'
          }`}
        >
          <Wine className={`w-5 h-5 ${activeTab === 'journal' ? 'scale-105 text-champagne-gold' : ''}`} />
          <span className="text-[11px] tracking-wide whitespace-nowrap">Journal</span>
        </button>

        {/* Tab 2: For You / Recommended */}
        <button
          onClick={() => onSelectTab('recommendations')}
          className={`flex flex-col items-center gap-1 py-1 px-1.5 min-[375px]:px-3 rounded-xl transition-all relative font-sans ${
            activeTab === 'recommendations'
              ? 'text-champagne-gold font-semibold'
              : 'text-stone-300 hover:text-white font-medium'
          }`}
        >
          <div className="relative">
            <Sparkles className={`w-5 h-5 ${activeTab === 'recommendations' ? 'scale-105 text-champagne-gold' : ''}`} />
            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-champagne-gold shadow-[0_0_8px_#d4af37]" />
          </div>
          <span className="text-[11px] tracking-wide whitespace-nowrap">For You</span>
        </button>

        {/* Center Floating Action Button: Add & Scan Wine */}
        <div className="relative -top-5 flex justify-center">
          <button
            onClick={onOpenAddModal}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-wine-900 via-wine-800 to-black flex items-center justify-center text-champagne-light shadow-2xl border-2 border-champagne-500/50 active:scale-95 transition-transform hover:shadow-gold-glow group"
            aria-label="Scan or add wine"
          >
            <div className="relative flex items-center justify-center">
              <Camera className="w-6 h-6 text-champagne-accent group-hover:scale-105 transition-transform" />
              <Plus className="w-3.5 h-3.5 absolute -top-1 -right-1 text-champagne-gold" />
            </div>
          </button>
        </div>

        {/* Tab 3: Wishlist */}
        <button
          onClick={() => onSelectTab('wishlist')}
          className={`flex flex-col items-center gap-1 py-1 px-1.5 min-[375px]:px-3 rounded-xl transition-all relative font-sans ${
            activeTab === 'wishlist'
              ? 'text-champagne-gold font-semibold'
              : 'text-stone-300 hover:text-white font-medium'
          }`}
        >
          <div className="relative">
            <Bookmark className={`w-5 h-5 ${activeTab === 'wishlist' ? 'scale-105 text-champagne-gold' : ''}`} />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-wine-700 text-champagne-100 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-champagne-500/30">
                {wishlistCount}
              </span>
            )}
          </div>
          <span className="text-[11px] tracking-wide whitespace-nowrap">Wishlist</span>
        </button>

        {/* Tab 4: Stats / Insights */}
        <button
          onClick={() => onSelectTab('stats')}
          className={`flex flex-col items-center gap-1 py-1 px-1.5 min-[375px]:px-3 rounded-xl transition-all font-sans ${
            activeTab === 'stats'
              ? 'text-champagne-gold font-semibold'
              : 'text-stone-300 hover:text-white font-medium'
          }`}
        >
          <BarChart3 className={`w-5 h-5 ${activeTab === 'stats' ? 'scale-105 text-champagne-gold' : ''}`} />
          <span className="text-[11px] tracking-wide whitespace-nowrap">Insights</span>
        </button>
      </div>
    </nav>
  );
}
