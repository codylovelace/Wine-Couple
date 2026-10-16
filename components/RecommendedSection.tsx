'use client';

import React, { useState } from 'react';
import { WineRecommendation } from '@/lib/recommendations';
import { UserSettings } from '@/lib/types';
import { 
  Sparkles, ExternalLink, Bookmark, Plus, MapPin
} from 'lucide-react';

interface RecommendedSectionProps {
  recommendations: WineRecommendation[];
  settings: UserSettings;
  onAddToWishlist: (rec: WineRecommendation) => void;
  onLogAsTasted: (rec: WineRecommendation) => void;
  wishlistWineNames: string[];
}

export function RecommendedSection({
  recommendations,
  settings,
  onAddToWishlist,
  onLogAsTasted,
  wishlistWineNames,
}: RecommendedSectionProps) {
  const [activeType, setActiveType] = useState<string>('all');

  const filteredRecs = activeType === 'all'
    ? recommendations
    : recommendations.filter((r) => r.type === activeType);

  return (
    <div className="space-y-4 pb-8 font-sans">
      {/* Editorial Sommelier Header Banner */}
      <div className="luxury-banner p-5 rounded-3xl space-y-2.5 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-champagne-gold/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 text-champagne-200 border border-champagne-500/30 text-[11px] font-sans font-semibold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5 text-champagne-gold" />
            <span>Curated For {settings.partner1Name} & {settings.partner2Name}</span>
          </span>
          <span className="font-sans text-xs font-medium text-stone-300">
            {filteredRecs.length} Selections
          </span>
        </div>

        <h2 className="font-serif text-2xl font-semibold tracking-wide text-white leading-tight">
          Recommended for Your Palate
        </h2>

        <p className="text-xs text-stone-200 leading-relaxed max-w-sm font-sans">
          Sommelier selections matched to your highest-rated bottles, varietal preferences, and aroma notes.
        </p>
      </div>

      {/* Style Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {[
          { id: 'all', label: 'All Recommendations' },
          { id: 'red', label: 'Reds' },
          { id: 'white', label: 'Whites' },
          { id: 'rose', label: 'Rosés' },
          { id: 'sparkling', label: 'Sparkling' },
        ].map((tab) => {
          const isSelected = activeType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveType(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-sans font-medium tracking-wide whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-gradient-to-r from-wine-900 to-wine-950 text-champagne-100 border border-champagne-500/45 shadow-sm font-semibold'
                  : 'bg-stone-900/60 border border-white/10 text-stone-300 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Luxury Recommendation Cards */}
      <div className="space-y-4">
        {filteredRecs.map((rec) => {
          const isWishlisted = wishlistWineNames.includes(rec.name.toLowerCase());

          return (
            <div
              key={rec.id}
              className="luxury-card p-4.5 rounded-3xl space-y-3.5 relative overflow-hidden transition-all hover:border-champagne-500/35 group"
            >
              {/* Top Row: Match Score & Estimated Price */}
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-champagne-950/70 text-champagne-100 border border-champagne-500/30 text-xs font-sans tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-champagne-gold" />
                  <span className="font-semibold">{rec.matchScore}% Match</span>
                </span>

                <span className="font-sans text-sm font-bold text-champagne-accent tracking-wide">
                  ~{rec.currency}{rec.estimatedPrice.toFixed(2)}
                </span>
              </div>

              {/* Main Wine Identification */}
              <div className="flex gap-4 items-start">
                {/* Bottle Thumbnail */}
                <div className="relative w-20 h-28 rounded-2xl bg-black border border-champagne-500/20 flex-shrink-0 overflow-hidden shadow-md group-hover:border-champagne-500/40 transition-colors">
                  <img
                    src={rec.imageUrl}
                    alt={rec.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-xl text-white font-semibold leading-snug tracking-wide truncate">
                    {rec.name}
                  </h3>
                  <p className="text-xs text-champagne-200 font-sans font-medium tracking-wide truncate mt-0.5">
                    {rec.producer} · {rec.vintage}
                  </p>

                  <div className="flex items-center gap-1.5 text-xs text-stone-300 mt-1.5 truncate font-sans">
                    <MapPin className="w-3.5 h-3.5 text-champagne-400/80 flex-shrink-0" />
                    <span className="truncate">{[rec.grape, rec.region, rec.country].filter(Boolean).join(' · ')}</span>
                  </div>

                  {/* Flavor Notes Badges */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {rec.flavorNotes.slice(0, 3).map((f) => (
                      <span
                        key={f}
                        className="px-2.5 py-0.5 rounded-md bg-stone-900/90 text-[11px] text-stone-200 border border-white/10 font-sans font-medium"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sommelier Taste Harmony Reason */}
              <div className="p-3.5 rounded-2xl bg-[#140b10]/95 border-l-2 border-l-champagne-gold/70 border-y border-r border-white/10 text-xs text-stone-100 font-sans leading-relaxed">
                {rec.matchedReason}
              </div>

              {/* Where To Buy Online Pill Links */}
              <div className="pt-0.5 space-y-2">
                <span className="text-[11px] uppercase font-sans font-semibold tracking-wider text-champagne-300 block">
                  Where To Purchase Online
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <a
                    href={rec.onlineLinks.wineSearcher}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-champagne-500/15 hover:border-champagne-500/35 text-xs text-stone-100 flex items-center justify-center gap-1.5 transition-all group font-sans font-medium"
                  >
                    <span>Wine-Searcher</span>
                    <ExternalLink className="w-3 h-3 text-stone-400 group-hover:text-champagne-300" />
                  </a>

                  <a
                    href={rec.onlineLinks.vivino}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-champagne-500/15 hover:border-champagne-500/35 text-xs text-stone-100 flex items-center justify-center gap-1.5 transition-all group font-sans font-medium"
                  >
                    <span>Vivino</span>
                    <ExternalLink className="w-3 h-3 text-stone-400 group-hover:text-champagne-300" />
                  </a>

                  <a
                    href={rec.onlineLinks.googleShopping}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-champagne-500/15 hover:border-champagne-500/35 text-xs text-stone-100 flex items-center justify-center gap-1.5 transition-all group font-sans font-medium"
                  >
                    <span>Google Buy</span>
                    <ExternalLink className="w-3 h-3 text-stone-400 group-hover:text-champagne-300" />
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-white/10 flex items-center gap-2.5">
                <button
                  onClick={() => onAddToWishlist(rec)}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-sans font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-all ${
                    isWishlisted
                      ? 'bg-champagne-950 text-champagne-accent border border-champagne-500/45'
                      : 'bg-stone-900/90 hover:bg-stone-800 text-stone-200 border border-white/15'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-champagne-gold text-champagne-gold' : 'text-stone-300'}`} />
                  <span>{isWishlisted ? 'Saved to Wishlist' : 'Add to Wishlist'}</span>
                </button>

                <button
                  onClick={() => onLogAsTasted(rec)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-wine-800 via-wine-900 to-black hover:from-wine-700 hover:to-wine-900 text-champagne-100 border border-champagne-500/35 text-xs font-sans font-semibold tracking-wide flex items-center justify-center gap-1.5 shadow-md shadow-wine-950 transition-all"
                >
                  <Plus className="w-3.5 h-3.5 text-champagne-300" />
                  <span>We Tasted This</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
