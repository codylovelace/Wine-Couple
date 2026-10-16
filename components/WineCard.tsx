'use client';

import React from 'react';
import { Wine, VERDICTS, PublicUser, isTasted } from '@/lib/types';
import { awaitingRating, reviewFor } from '@/lib/wine-logic';
import { wineTitle } from '@/lib/format';
import { canonicalShop } from '@/lib/shops';
import { Star, MapPin, ShoppingBag, Wine as WineIcon, Heart, X, MessageCircle } from 'lucide-react';

interface WineCardProps {
  wine: Wine;
  me: PublicUser;
  partner: PublicUser | null;
  onClick: () => void;
  // Tapping the shop chip lists every wine bought there.
  onShopClick?: (shop: string) => void;
}

export function WineCard({ wine, me, partner, onClick, onShopClick }: WineCardProps) {
  const verdictConfig = VERDICTS[wine.coupleVerdict] || VERDICTS['okay'];
  const tasted = isTasted(wine);
  const myTurn = awaitingRating(wine, me.slot);
  const partnerPending = partner ? awaitingRating(wine, partner.slot) : false;
  const commentCount = wine.comments?.length ?? 0;
  const { title, subtitle } = wineTitle(wine);
  const shop = canonicalShop(wine.purchase?.store);

  return (
    // The whole card opens the wine through a button stretched over it; the
    // shop chip is its own button on top (buttons can't be nested).
    <div className="w-full text-left luxury-card p-4 rounded-3xl active:scale-[0.99] transition-all hover:border-champagne-500/40 group relative overflow-hidden">
      <button type="button" onClick={onClick} aria-label={`Open ${title}`} className="absolute inset-0 z-0 rounded-3xl cursor-pointer" />
      <div className="flex gap-4">
        {/* Wine Bottle Image Thumbnail */}
        <div className="relative w-20 h-28 flex-shrink-0 rounded-2xl overflow-hidden bg-black border border-champagne-500/20 flex items-center justify-center shadow-inner group-hover:border-champagne-500/40 transition-colors">
          {wine.imageUrl ? (
            <img
              src={wine.imageUrl}
              alt={title}
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
              {tasted ? (
                <span
                  className={`inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-[11px] font-sans font-semibold tracking-wide uppercase border ${verdictConfig.bgClass} ${verdictConfig.colorClass} ${verdictConfig.borderClass}`}
                >
                  <span>{verdictConfig.shortLabel}</span>
                </span>
              ) : (
                <span className="inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-[11px] font-sans font-semibold tracking-wide uppercase border bg-stone-900/80 text-stone-300 border-white/15">
                  <span>Not tasted yet</span>
                </span>
              )}

              {/* Star Rating Badge */}
              {wine.averageRating > 0 && (
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/70 border border-champagne-500/25 text-champagne-accent text-xs font-sans font-bold">
                  <Star className="w-3.5 h-3.5 fill-champagne-gold text-champagne-gold" />
                  <span>{wine.averageRating.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Wine Name & Producer */}
            <h3 className="font-serif font-semibold text-stone-100 text-xl leading-snug tracking-wide truncate">
              {title}
            </h3>
            <p className="text-xs text-champagne-200 font-sans font-medium tracking-wide truncate mt-0.5">
              {subtitle}
            </p>

            {/* Grape & Origin */}
            <div className="flex items-center gap-1.5 text-xs text-stone-300 mt-1.5 truncate font-sans">
              <MapPin className="w-3.5 h-3.5 text-champagne-400/80 flex-shrink-0" />
              <span className="truncate">
                {[subtitle === wine.grape ? '' : wine.grape, wine.region, wine.country].filter(Boolean).join(' · ')}
              </span>
            </div>
          </div>

          {/* Bottom row: Purchase Info & Partner Scores */}
          <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 font-sans">
            {/* Where Bought & Price */}
            <div className="flex items-center gap-2 text-xs">
              {shop ? (
                onShopClick ? (
                  <button
                    type="button"
                    onClick={() => onShopClick(shop)}
                    aria-label={`All wines from ${shop}`}
                    className="relative z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-900/90 text-stone-200 font-medium border border-white/10 text-xs underline-offset-2 hover:underline hover:border-champagne-500/40"
                  >
                    <ShoppingBag className="w-3 h-3 text-champagne-400" />
                    <span className="truncate max-w-[95px]">{shop}</span>
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-900/90 text-stone-200 font-medium border border-white/10 text-xs">
                    <ShoppingBag className="w-3 h-3 text-champagne-400" />
                    <span className="truncate max-w-[95px]">{shop}</span>
                  </span>
                )
              ) : null}
              {wine.purchase?.price ? (
                <span className="font-sans font-bold text-champagne-accent text-sm">
                  {wine.purchase.currency || '£'}{Number(wine.purchase.price).toFixed(2)}
                </span>
              ) : null}
            </div>

            {/* Each partner's swipe (and stars, if given), or who still needs to rate */}
            <div className="flex items-center gap-1.5 text-xs text-stone-300 font-sans">
              {commentCount > 0 && (
                <span className="flex items-center gap-1 text-stone-300" aria-label={`${commentCount} comments`}>
                  <MessageCircle className="w-3.5 h-3.5" />
                  {commentCount}
                </span>
              )}
              {myTurn && (
                <span className="px-2 py-0.5 rounded-md bg-wine-900 border border-champagne-500/45 text-champagne-100 font-semibold">
                  Your turn
                </span>
              )}
              {!myTurn && partnerPending && partner && (
                <span className="px-2 py-0.5 rounded-md bg-yellow-950 border border-yellow-400/50 text-yellow-100 font-semibold">
                  Waiting for {partner.name}
                </span>
              )}
              {[me, partner].map((person) => {
                if (!person) return null;
                const review = reviewFor(wine, person.slot);
                if (!review || (typeof review.liked !== 'boolean' && !(review.rating > 0))) return null;
                return (
                  <span
                    key={person.id}
                    className="px-2 py-0.5 rounded-md bg-black/70 border border-white/15 flex items-center gap-1"
                    aria-label={`${person.name}: ${review.liked === true ? 'liked it' : review.liked === false ? "didn't like it" : ''}${review.rating > 0 ? ` ${review.rating} stars` : ''}`}
                  >
                    <span className="text-champagne-400 font-bold">{person.name.charAt(0).toUpperCase()}</span>
                    {review.liked === true && <Heart className="w-3 h-3 text-emerald-300 fill-emerald-400/40" />}
                    {review.liked === false && <X className="w-3 h-3 text-rose-300" />}
                    {review.rating > 0 && <span className="text-stone-100 font-semibold">{review.rating}★</span>}
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
