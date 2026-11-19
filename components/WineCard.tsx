'use client';

import React from 'react';
import { Wine, VERDICTS, PublicUser, isTasted } from '@/lib/types';
import { awaitingRating, reviewFor } from '@/lib/wine-logic';
import { wineTitle } from '@/lib/format';
import { canonicalShop } from '@/lib/shops';
import { WINE_TYPE_META } from '@/lib/wine-meta';
import { Star, MapPin, ShoppingBag, Wine as WineIcon, Heart, X, MessageCircle } from 'lucide-react';

interface WineCardProps {
  wine: Wine;
  me: PublicUser;
  partner: PublicUser | null;
  onClick: () => void;
  // Tapping the shop chip lists every wine bought there.
  onShopClick?: (shop: string) => void;
  // Tapping the "Rate" pill lets you rate directly from the list.
  onQuickRate?: () => void;
}

export function WineCard({ wine, me, partner, onClick, onShopClick, onQuickRate }: WineCardProps) {
  const verdictConfig = VERDICTS[wine.coupleVerdict] || VERDICTS['okay'];
  const typeMeta = WINE_TYPE_META[wine.type] || WINE_TYPE_META.red;
  const tasted = isTasted(wine);
  const myTurn = awaitingRating(wine, me.slot);
  const partnerPending = partner ? awaitingRating(wine, partner.slot) : false;
  const commentCount = wine.comments?.length ?? 0;
  const { title, subtitle } = wineTitle(wine);
  const shop = canonicalShop(wine.purchase?.store);

  return (
    // The whole card opens the wine through a button stretched over it; interactive
    // chips (shop & quick-rate) sit at z-10 so buttons aren't nested.
    <div className="w-full text-left surface-card rounded-2xl p-3.5 transition-all hover:border-champagne-400/25 active:scale-[0.99] group relative overflow-hidden">
      <button
        type="button"
        onClick={onClick}
        aria-label={`Open ${title}`}
        className="absolute inset-0 z-0 rounded-2xl cursor-pointer"
      />
      <div className="flex gap-3.5">
        {/* Wine Bottle Image Thumbnail with Wine-Style Accent Strip */}
        <div className="relative w-20 h-[108px] flex-shrink-0 rounded-xl overflow-hidden bg-cellar-950 border border-white/[0.08] flex items-center justify-center group-hover:border-champagne-400/30 transition-colors">
          <span
            aria-hidden="true"
            className={`absolute left-0 top-0 bottom-0 w-[3px] z-10 ${typeMeta.barClass}`}
          />
          {wine.imageUrl ? (
            <img
              src={wine.imageUrl}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <WineIcon className="w-7 h-7 text-champagne-400/35" />
          )}
          {wine.vintage && (
            <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[10px] font-sans font-semibold text-champagne-100 border border-white/10 tabular-nums">
              {wine.vintage}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            {/* Top row: Verdict Badge & Star Rating */}
            <div className="flex items-center justify-between gap-2 mb-1">
              {tasted ? (
                <span
                  className={`inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-[11px] font-sans font-semibold tracking-wide border ${verdictConfig.bgClass} ${verdictConfig.colorClass} ${verdictConfig.borderClass}`}
                >
                  {verdictConfig.shortLabel}
                </span>
              ) : (
                <span className="inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-[11px] font-sans font-semibold tracking-wide border bg-champagne-950/60 text-champagne-200 border-champagne-400/25">
                  To Try
                </span>
              )}

              {wine.averageRating > 0 && (
                <div className="flex items-center gap-1 text-champagne-200 text-xs font-sans font-semibold tabular-nums flex-shrink-0">
                  <Star className="w-3.5 h-3.5 fill-champagne-gold text-champagne-gold" />
                  <span>{wine.averageRating.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Wine Name & Producer */}
            <h3 className="font-serif font-semibold text-champagne-50 text-xl leading-tight tracking-wide truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-champagne-300/85 font-sans font-medium truncate mt-0.5">
                {subtitle}
              </p>
            )}

            {/* Grape & Origin */}
            <div className="flex items-center gap-1.5 text-xs text-stone-400 mt-1.5 truncate font-sans">
              <MapPin className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
              <span className="truncate">
                {[subtitle === wine.grape ? '' : wine.grape, wine.region, wine.country]
                  .filter(Boolean)
                  .join(' · ') || typeMeta.label}
              </span>
            </div>
          </div>

          {/* Bottom row: Purchase Info & Partner Verdicts */}
          <div className="mt-2.5 pt-2.5 border-t border-white/[0.07] flex flex-wrap items-center justify-between gap-2 font-sans">
            {/* Where Bought & Price */}
            <div className="flex items-center gap-2 text-xs min-w-0">
              {shop ? (
                onShopClick ? (
                  <button
                    type="button"
                    onClick={() => onShopClick(shop)}
                    aria-label={`All wines from ${shop}`}
                    className="relative z-10 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cellar-850 hover:bg-cellar-800 text-stone-200 font-medium border border-white/[0.08] hover:border-champagne-400/35 text-xs transition-colors"
                  >
                    <ShoppingBag className="w-3 h-3 text-champagne-400 flex-shrink-0" />
                    <span className="truncate max-w-[95px]">{shop}</span>
                  </button>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cellar-850 text-stone-200 font-medium border border-white/[0.08] text-xs">
                    <ShoppingBag className="w-3 h-3 text-champagne-400 flex-shrink-0" />
                    <span className="truncate max-w-[95px]">{shop}</span>
                  </span>
                )
              ) : null}
              {wine.purchase?.price ? (
                <span className="font-sans font-semibold text-champagne-200 text-xs tabular-nums">
                  {wine.purchase.currency || '£'}
                  {Number(wine.purchase.price).toFixed(2)}
                </span>
              ) : null}
            </div>

            {/* Comments, Partner Swipes & Pending Action */}
            <div className="flex items-center gap-1.5 text-xs text-stone-300 font-sans">
              {commentCount > 0 && (
                <span className="flex items-center gap-1 text-stone-400 tabular-nums" aria-label={`${commentCount} comments`}>
                  <MessageCircle className="w-3.5 h-3.5" />
                  {commentCount}
                </span>
              )}

              {myTurn &&
                (onQuickRate ? (
                  <button
                    type="button"
                    onClick={onQuickRate}
                    className="relative z-10 px-2.5 py-0.5 rounded-full bg-wine-700 hover:bg-wine-600 border border-champagne-400/40 text-champagne-50 text-[11px] font-semibold transition-colors"
                  >
                    Rate
                  </button>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-wine-900/90 border border-champagne-400/35 text-champagne-100 text-[11px] font-semibold">
                    Your turn
                  </span>
                ))}

              {!myTurn && partnerPending && partner && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-400/25 text-amber-200 text-[11px] font-medium">
                  Awaiting {partner.name}
                </span>
              )}

              {[me, partner].map((person) => {
                if (!person) return null;
                const review = reviewFor(wine, person.slot);
                if (!review || (typeof review.liked !== 'boolean' && !(review.rating > 0))) return null;
                return (
                  <span
                    key={person.id}
                    className="px-2 py-0.5 rounded-md bg-cellar-950/90 border border-white/10 flex items-center gap-1"
                    aria-label={`${person.name}: ${review.liked === true ? 'liked it' : review.liked === false ? "didn't like it" : ''}${review.rating > 0 ? ` ${review.rating} stars` : ''}`}
                  >
                    <span className="text-champagne-300 font-bold text-[11px]">
                      {person.name.charAt(0).toUpperCase()}
                    </span>
                    {review.liked === true && <Heart className="w-3 h-3 text-emerald-300 fill-emerald-400/40" />}
                    {review.liked === false && <X className="w-3 h-3 text-rose-300" />}
                    {review.rating > 0 && (
                      <span className="text-stone-100 font-semibold text-[11px] tabular-nums">{review.rating}★</span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
