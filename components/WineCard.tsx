'use client';

import React from 'react';
import { Wine, VERDICTS, UserSettings } from '@/lib/types';
import { Star, MapPin, ShoppingBag, Wine as WineIcon } from 'lucide-react';

interface WineCardProps {
  wine: Wine;
  settings: UserSettings;
  onClick: () => void;
  onToggleWishlist?: (e: React.MouseEvent) => void;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}

export function WineCard({
  wine,
  settings,
  onClick,
}: WineCardProps) {
  const verdictConfig = VERDICTS[wine.coupleVerdict] || VERDICTS['good'];

  return (
    <div
      onClick={onClick}
      className="luxury-card p-4 rounded-3xl active:scale-[0.99] transition-all cursor-pointer hover:border-champagne-500/40 group relative overflow-hidden"
    >
      <div className="flex gap-4">
        {/* Wine Bottle Image Thumbnail */}
        <div className="relative w-20 h-28 flex-shrink-0 rounded-2xl overflow-hidden bg-black border border-champagne-500/20 flex items-center justify-center shadow-inner group-hover:border-champagne-500/40 transition-colors">
          {wine.imageUrl ? (
            <img
              src={wine.imageUrl}
              alt={wine.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <WineIcon className="w-8 h-8 text-champagne-500/40" />
          )}
          {/* Vintage Badge */}
          {wine.vintage && (
            <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/85 backdrop-blur-md text-[10px] font-sans font-bold text-champagne-100 border border-champagne-500/25">
              {wine.vintage}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            {/* Top row: Verdict Badge & Star Rating */}
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-sans font-semibold tracking-wide uppercase border ${verdictConfig.bgClass} ${verdictConfig.colorClass} ${verdictConfig.borderClass}`}
              >
                <span>{verdictConfig.shortLabel}</span>
              </span>

              {/* Star Rating Badge */}
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/70 border border-champagne-500/25 text-champagne-accent text-xs font-sans font-bold">
                <Star className="w-3.5 h-3.5 fill-champagne-gold text-champagne-gold" />
                <span>{wine.averageRating.toFixed(1)}</span>
              </div>
            </div>

            {/* Wine Name & Producer */}
            <h3 className="font-serif font-semibold text-stone-100 text-xl leading-snug tracking-wide truncate">
              {wine.name}
            </h3>
            <p className="text-xs text-champagne-200 font-sans font-medium tracking-wide truncate mt-0.5">
              {wine.producer}
            </p>

            {/* Grape & Origin */}
            <div className="flex items-center gap-1.5 text-xs text-stone-300 mt-1.5 truncate font-sans">
              <MapPin className="w-3.5 h-3.5 text-champagne-400/80 flex-shrink-0" />
              <span className="truncate">
                {[wine.grape, wine.region, wine.country].filter(Boolean).join(' · ')}
              </span>
            </div>
          </div>

          {/* Bottom row: Purchase Info & Partner Scores */}
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2 font-sans">
            {/* Where Bought & Price */}
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-900/90 text-stone-200 font-medium border border-white/10 text-xs">
                <ShoppingBag className="w-3 h-3 text-champagne-400" />
                <span className="truncate max-w-[95px]">{wine.purchase?.store || 'Store'}</span>
              </span>
              {wine.purchase?.price ? (
                <span className="font-sans font-bold text-champagne-accent text-sm">
                  {wine.purchase.currency || '£'}{Number(wine.purchase.price).toFixed(2)}
                </span>
              ) : null}
            </div>

            {/* Partner Scores with Initials */}
            <div className="flex items-center gap-1.5 text-xs text-stone-300 font-sans">
              {wine.partner1Review && (
                <span className="px-2 py-0.5 rounded-md bg-black/70 border border-white/15 flex items-center gap-1" title={`${settings.partner1Name}: ${wine.partner1Review.rating}★`}>
                  <span className="text-champagne-400 font-bold">{settings.partner1Name.charAt(0)}</span>
                  <span className="text-stone-100 font-semibold">{wine.partner1Review.rating}★</span>
                </span>
              )}
              {wine.partner2Review && (
                <span className="px-2 py-0.5 rounded-md bg-black/70 border border-white/15 flex items-center gap-1" title={`${settings.partner2Name}: ${wine.partner2Review.rating}★`}>
                  <span className="text-champagne-400 font-bold">{settings.partner2Name.charAt(0)}</span>
                  <span className="text-stone-100 font-semibold">{wine.partner2Review.rating}★</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
