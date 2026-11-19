'use client';

import React, { useEffect, useState } from 'react';
import { X, Star, Check, Heart, Sparkles } from 'lucide-react';
import { PublicUser, Wine } from '@/lib/types';
import { ReviewInput, reviewFor } from '@/lib/wine-logic';
import { SwipeVerdict } from '@/components/SwipeVerdict';
import { wineTitle } from '@/lib/format';
import { canonicalShop } from '@/lib/shops';

interface RateSheetProps {
  // The wines to go through, in order. Usually the "your turn" list; one wine
  // when rating from its detail page.
  queue: Wine[];
  me: PublicUser;
  partner: PublicUser | null;
  // When true (e.g. editing an existing rating from WineDetailModal), jump right
  // to the summary/stars/notes view prefilled with the user's current review.
  startAtSummary?: boolean;
  onRate: (wineId: string, review: ReviewInput | null) => Promise<void>;
  onClose: () => void;
}

// Blind Swipe -> Instant Couple Reveal, then optional stars and a note.
export function RateSheet({
  queue,
  me,
  partner,
  startAtSummary = false,
  onRate,
  onClose,
}: RateSheetProps) {
  // The queue shrinks as wines get rated, so hold on to the starting list.
  const [items] = useState(queue);
  const [index, setIndex] = useState(0);
  const wine = items[index];

  const existing = wine && startAtSummary ? reviewFor(wine, me.slot) : undefined;
  const [liked, setLiked] = useState<boolean | null>(
    existing && typeof existing.liked === 'boolean' ? existing.liked : null
  );
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wine) return;
    const prev = startAtSummary ? reviewFor(wine, me.slot) : undefined;
    setLiked(prev && typeof prev.liked === 'boolean' ? prev.liked : null);
    setRating(prev?.rating ?? 0);
    setNotes(prev?.notes ?? '');
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, wine?.id, startAtSummary]);

  if (!wine) return null;

  const next = () => (index + 1 < items.length ? setIndex(index + 1) : onClose());

  const save = async (review: ReviewInput | null) => {
    setSaving(true);
    setError(null);
    try {
      await onRate(wine.id, review);
      next();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const partnerReview = partner ? reviewFor(wine, partner.slot) : undefined;
  const partnerLiked = typeof partnerReview?.liked === 'boolean' ? partnerReview.liked : null;
  const { title, subtitle } = wineTitle(wine);
  const shop = canonicalShop(wine.purchase?.store);
  const priceStr =
    wine.purchase?.price > 0 ? `${wine.purchase.currency || '£'}${Number(wine.purchase.price).toFixed(2)}` : '';

  const renderRevealCard = () => {
    if (liked === null) return null;

    if (partner && partnerLiked !== null) {
      if (liked && partnerLiked) {
        return (
          <div className="p-4 rounded-2xl bg-emerald-500/12 border border-emerald-400/30 text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>It&apos;s a Match</span>
            </div>
            <p className="font-serif text-xl font-semibold text-emerald-100">Must Buy Again</p>
            <p className="text-xs text-stone-300">
              Both you and {partner.name} would buy this bottle again.
            </p>
          </div>
        );
      }
      if (!liked && !partnerLiked) {
        return (
          <div className="p-4 rounded-2xl bg-rose-500/12 border border-rose-400/30 text-center space-y-1">
            <span className="block text-xs font-semibold uppercase tracking-wider text-rose-300">
              Both Passed
            </span>
            <p className="font-serif text-xl font-semibold text-rose-100">Marked Avoid</p>
            <p className="text-xs text-stone-300">
              Neither you nor {partner.name} want to pick this one up again.
            </p>
          </div>
        );
      }
      return (
        <div className="p-4 rounded-2xl bg-violet-500/12 border border-violet-400/30 text-center space-y-1">
          <span className="block text-xs font-semibold uppercase tracking-wider text-violet-300">
            Split Decision
          </span>
          <p className="font-serif text-xl font-semibold text-violet-100">
            {liked ? `You liked it · ${partner.name} passed` : `You passed · ${partner.name} liked it`}
          </p>
          <p className="text-xs text-stone-300">Saved as a Split Decision in your cellar.</p>
        </div>
      );
    }

    return (
      <div
        className={`p-4 rounded-2xl border text-center space-y-1 ${
          liked ? 'bg-emerald-500/10 border-emerald-400/25' : 'bg-rose-500/10 border-rose-400/25'
        }`}
      >
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
          {liked ? (
            <Heart className="w-3.5 h-3.5 text-emerald-300 fill-emerald-400/40" />
          ) : (
            <X className="w-3.5 h-3.5 text-rose-300" />
          )}
          <span className={liked ? 'text-emerald-300' : 'text-rose-300'}>
            {liked ? 'You would buy again' : 'You passed'}
          </span>
        </div>
        {partner && (
          <p className="text-xs text-stone-300">
            Saved — waiting for {partner.name}&apos;s verdict.
          </p>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[94dvh] bg-cellar-900 border border-white/10 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h2 className="font-serif font-semibold text-xl text-champagne-50">
              {startAtSummary ? 'Update your rating' : 'Your turn to rate'}
            </h2>
            {items.length > 1 && (
              <p className="text-xs text-stone-400 tabular-nums">
                Bottle {index + 1} of {items.length}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-cellar-800 hover:bg-cellar-700 text-stone-300 hover:text-white flex items-center justify-center border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans">
          {liked === null ? (
            <SwipeVerdict
              key={wine.id}
              taster={me.name}
              imageUrl={wine.imageUrl}
              name={title}
              producer={subtitle}
              vintage={wine.vintage}
              wineType={wine.type}
              grape={wine.grape}
              region={wine.region}
              shop={shop}
              price={priceStr}
              onChoose={(choice) => setLiked(choice === 'liked')}
              onNotTasted={() => save(null)}
            />
          ) : (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center space-y-0.5">
                <p className="font-serif text-2xl text-champagne-50 font-semibold leading-tight">{title}</p>
                {subtitle && <p className="text-xs text-champagne-300/85">{subtitle}</p>}
              </div>

              {/* Instant Couple Reveal Card */}
              {renderRevealCard()}

              {/* Optional Stars */}
              <div className="surface-card rounded-2xl p-4 space-y-2 text-center">
                <span className="text-xs font-medium text-stone-300 block">Star rating (optional)</span>
                <div className="flex items-center justify-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating((r) => (r === star ? 0 : star))}
                      aria-label={`${star} star${star > 1 ? 's' : ''}`}
                      className="p-1 active:scale-95 transition-transform"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          rating >= star ? 'fill-champagne-gold text-champagne-gold' : 'text-stone-700 hover:text-stone-500'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Tasting Notes */}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any tasting notes for your cellar? (optional)"
                className="w-full px-3.5 py-2.5 text-sm field-input resize-none"
              />

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setLiked(null)}
                  className="text-stone-400 hover:text-champagne-200 underline underline-offset-2"
                >
                  Change my swipe
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => save(null)}
                  className="text-stone-400 hover:text-stone-200"
                >
                  I didn&apos;t taste this one
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-400/25 rounded-xl p-2.5" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="p-4 modal-footer-safe border-t border-white/[0.08] flex items-center gap-3">
          <button
            type="button"
            onClick={next}
            className="px-4 py-3 rounded-xl btn-secondary text-sm font-semibold"
          >
            {items.length > 1 ? 'Skip for now' : 'Later'}
          </button>
          {liked !== null && (
            <button
              type="button"
              disabled={saving}
              onClick={() => save({ liked, rating, notes: notes.trim() })}
              className="flex-1 py-3 px-4 rounded-xl btn-primary text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Check className="w-4 h-4 text-champagne-gold" />
              <span>{saving ? 'Saving…' : index + 1 < items.length ? 'Save & Next' : 'Save Rating'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
