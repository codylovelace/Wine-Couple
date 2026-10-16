'use client';

import React from 'react';
import { Wine, UserSettings } from '@/lib/types';
import { 
  X, BarChart3, Sparkles
} from 'lucide-react';

interface CoupleStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  wines: Wine[];
  settings: UserSettings;
  onSelectWine: (wine: Wine) => void;
}

export function CoupleStatsModal({
  isOpen,
  onClose,
  wines,
  settings,
  onSelectWine,
}: CoupleStatsModalProps) {
  if (!isOpen) return null;

  const totalBottles = wines.length;
  let totalSpend = 0;
  let pricedCount = 0;
  let goodValueCount = 0;
  let lovedItCount = 0;
  let agreementDiffSum = 0;
  let dualRatedCount = 0;

  const typeCounts: Record<string, number> = { red: 0, white: 0, rose: 0, sparkling: 0, dessert: 0, orange: 0 };

  let highestRatedWine: Wine | null = null;
  let bestValueWine: Wine | null = null;

  for (const w of wines) {
    if (w.purchase?.price) {
      totalSpend += Number(w.purchase.price);
      pricedCount++;
    }
    if (w.coupleVerdict === 'good-value') goodValueCount++;
    if (w.coupleVerdict === 'loved-it') lovedItCount++;

    if (w.type && typeCounts[w.type] !== undefined) {
      typeCounts[w.type]++;
    }

    if (w.partner1Review?.rating && w.partner2Review?.rating) {
      dualRatedCount++;
      agreementDiffSum += Math.abs(w.partner1Review.rating - w.partner2Review.rating);
    } else if (
      typeof w.partner1Review?.liked === 'boolean' &&
      typeof w.partner2Review?.liked === 'boolean'
    ) {
      // No stars from both: use the swipes. A split counts as the widest gap.
      dualRatedCount++;
      agreementDiffSum += w.partner1Review.liked === w.partner2Review.liked ? 0 : 4;
    }

    if (w.averageRating > 0 && (!highestRatedWine || w.averageRating > highestRatedWine.averageRating)) {
      highestRatedWine = w;
    }

    if (w.coupleVerdict === 'good-value' || (w.averageRating >= 4.2 && w.purchase?.price && w.purchase.price < 20)) {
      if (!bestValueWine || (w.purchase?.price && bestValueWine.purchase?.price && w.purchase.price < bestValueWine.purchase.price)) {
        bestValueWine = w;
      }
    }
  }

  // Average over bottles with a recorded price, so unpriced ones don't drag it down.
  const avgPrice = pricedCount > 0 ? (totalSpend / pricedCount).toFixed(2) : '0.00';
  const avgDiff = dualRatedCount > 0 ? agreementDiffSum / dualRatedCount : 0;
  const agreementScore = Math.max(65, Math.round(100 - avgDiff * 18));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-md max-h-[90dvh] bg-[#0f0a0d] border border-champagne-500/25 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-champagne-500/15 flex items-center justify-between bg-[#0f0a0d]/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-wine-900/70 border border-champagne-500/35 flex items-center justify-center text-champagne-gold">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif font-semibold text-lg text-stone-100 tracking-wide">
                Cellar & Tasting Insights
              </h2>
              <p className="text-xs text-stone-300 font-sans">
                {settings.partner1Name} & {settings.partner2Name}'s Palate Profile
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-900 text-stone-300 hover:text-white flex items-center justify-center border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans">
          {/* Couple Compatibility Banner */}
          <div className="luxury-banner p-4.5 rounded-3xl flex items-center gap-3.5 shadow-wine-glow">
            <div className="w-12 h-12 rounded-2xl bg-black/50 border border-champagne-500/35 flex items-center justify-center text-champagne-gold flex-shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-sans font-semibold uppercase tracking-wider text-champagne-200">Palate Compatibility</span>
                <span className="text-sm font-sans font-bold text-champagne-accent">{agreementScore}%</span>
              </div>
              <p className="text-xs text-stone-200 mt-1 font-sans leading-relaxed">
                {agreementScore >= 85
                  ? `You and ${settings.partner2Name} share a strong harmony in wine preferences.`
                  : `You both appreciate distinct, complementary tasting notes.`}
              </p>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl luxury-card">
              <span className="text-[11px] uppercase font-sans font-semibold tracking-wider text-champagne-300 block mb-1">
                Bottles Logged
              </span>
              <span className="text-2xl font-serif font-bold text-stone-100">
                {totalBottles}
              </span>
              <span className="text-xs text-champagne-200 font-sans block mt-0.5">
                {lovedItCount} Favorites · {goodValueCount} Great Value
              </span>
            </div>

            <div className="p-3.5 rounded-2xl luxury-card">
              <span className="text-[11px] uppercase font-sans font-semibold tracking-wider text-champagne-300 block mb-1">
                Cellar Valuation
              </span>
              <span className="text-2xl font-serif font-bold text-champagne-accent">
                {settings.defaultCurrency}{totalSpend.toFixed(0)}
              </span>
              <span className="text-xs text-stone-300 font-sans block mt-0.5">
                Avg. {settings.defaultCurrency}{avgPrice} / bottle
              </span>
            </div>
          </div>

          {/* Value Champion & Top Rated Cards */}
          <div className="space-y-2">
            <h3 className="text-xs font-sans font-semibold uppercase tracking-wider text-champagne-300">
              Cellar Distinctions
            </h3>

            {bestValueWine && (
              <div
                onClick={() => {
                  onSelectWine(bestValueWine);
                  onClose();
                }}
                className="p-3.5 rounded-2xl luxury-card flex items-center justify-between cursor-pointer hover:border-champagne-500/45 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-black/60 border border-emerald-500/35 flex items-center justify-center text-emerald-300 text-[10px] font-sans font-bold tracking-wider">
                    VALUE
                  </div>
                  <div>
                    <span className="text-[11px] font-sans uppercase tracking-wider text-emerald-300 font-semibold block">
                      Value Distinction
                    </span>
                    <h4 className="text-sm font-serif font-semibold text-stone-100 truncate max-w-[190px]">
                      {bestValueWine.name}
                    </h4>
                    <p className="text-xs text-stone-300 font-sans">
                      {bestValueWine.purchase?.store} · {bestValueWine.purchase?.currency}{bestValueWine.purchase?.price} ({bestValueWine.averageRating}★)
                    </p>
                  </div>
                </div>
                <span className="text-champagne-gold font-sans font-bold text-sm">→</span>
              </div>
            )}

            {highestRatedWine && (
              <div
                onClick={() => {
                  onSelectWine(highestRatedWine);
                  onClose();
                }}
                className="p-3.5 rounded-2xl luxury-card-gold flex items-center justify-between cursor-pointer hover:border-champagne-gold transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-black/60 border border-champagne-gold/45 flex items-center justify-center text-champagne-gold text-[10px] font-sans font-bold tracking-wider">
                    TOP
                  </div>
                  <div>
                    <span className="text-[11px] font-sans uppercase tracking-wider text-champagne-gold font-semibold block">
                      Grand Cru Highlight
                    </span>
                    <h4 className="text-sm font-serif font-semibold text-stone-100 truncate max-w-[190px]">
                      {highestRatedWine.name}
                    </h4>
                    <p className="text-xs text-stone-300 font-sans">
                      {highestRatedWine.producer} · {highestRatedWine.averageRating}★
                    </p>
                  </div>
                </div>
                <span className="text-champagne-gold font-sans font-bold text-sm">→</span>
              </div>
            )}
          </div>

          {/* Style Breakdown */}
          <div className="p-4 rounded-3xl luxury-card space-y-2.5">
            <h3 className="text-xs font-sans font-semibold uppercase tracking-wider text-champagne-300">
              Style Distribution
            </h3>
            <div className="grid grid-cols-4 gap-2 text-center font-sans">
              <div className="p-2.5 rounded-2xl bg-black/60 border border-white/10">
                <span className="text-sm font-bold block text-stone-100">{typeCounts.red}</span>
                <span className="text-xs text-stone-300">Reds</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-black/60 border border-white/10">
                <span className="text-sm font-bold block text-stone-100">{typeCounts.white}</span>
                <span className="text-xs text-stone-300">Whites</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-black/60 border border-white/10">
                <span className="text-sm font-bold block text-stone-100">{typeCounts.rose}</span>
                <span className="text-xs text-stone-300">Rosés</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-black/60 border border-white/10">
                <span className="text-sm font-bold block text-stone-100">{typeCounts.sparkling}</span>
                <span className="text-xs text-stone-300">Sparkling</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 modal-footer-safe border-t border-champagne-500/15 bg-[#0f0a0d]">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-100 text-xs font-sans font-bold tracking-wide border border-white/15"
          >
            Close Insights
          </button>
        </div>
      </div>
    </div>
  );
}
