'use client';

import React, { useEffect, useState } from 'react';
import { X, Star, Check } from 'lucide-react';
import { PublicUser, Wine } from '@/lib/types';
import { ReviewInput, reviewFor } from '@/lib/wine-logic';
import { SwipeVerdict } from '@/components/SwipeVerdict';
import { wineTitle } from '@/lib/format';

interface RateSheetProps {
  // The wines to go through, in order. Usually the "your turn" list; one wine
  // when rating from its detail page.
  queue: Wine[];
  me: PublicUser;
  partner: PublicUser | null;
  onRate: (wineId: string, review: ReviewInput | null) => Promise<void>;
  onClose: () => void;
}

// Swipe, then optional stars and a note, for each wine your partner logged
// that you haven't rated yet.
export function RateSheet({ queue, me, partner, onRate, onClose }: RateSheetProps) {
  // The queue shrinks as wines get rated, so hold on to the starting list.
  const [items] = useState(queue);
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wine = items[index];

  useEffect(() => {
    setLiked(null);
    setRating(0);
    setNotes('');
    setError(null);
  }, [index]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md max-h-[94dvh] bg-[#0f0a0d] border border-champagne-500/25 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-slideUp">
        <div className="p-4 border-b border-champagne-500/15 flex items-center justify-between">
          <div>
            <h2 className="font-serif font-semibold text-lg text-stone-100">Your turn to rate</h2>
            {items.length > 1 && (
              <p className="text-xs text-stone-300">
                {index + 1} of {items.length}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-stone-900 text-stone-300 hover:text-white flex items-center justify-center border border-white/10"
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
              name={wineTitle(wine).title}
              producer={wineTitle(wine).subtitle}
              vintage={wine.vintage}
              onChoose={(choice) => setLiked(choice === 'liked')}
              onNotTasted={() => save(null)}
            />
          ) : (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center space-y-1">
                <p className="font-serif text-xl text-white font-semibold">{wineTitle(wine).title}</p>
                <p className={`text-sm font-semibold ${liked ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {liked ? 'You’d buy it again' : 'You wouldn’t buy it again'}
                </p>
                {partner && partnerReview && typeof partnerReview.liked === 'boolean' && (
                  <p className="text-xs text-stone-300">
                    {partner.name} {partnerReview.liked ? 'liked it' : 'didn’t like it'}
                    {partnerReview.liked !== liked ? ', so it’s a Split Decision.' : ' too.'}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating((r) => (r === star ? 0 : star))}
                    aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    className="p-1"
                  >
                    <Star className={`w-8 h-8 ${rating >= star ? 'fill-champagne-gold text-champagne-gold' : 'text-stone-700'}`} />
                  </button>
                ))}
              </div>
              <p className="text-center text-xs text-stone-400">Stars are optional</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any notes? (optional)"
                className="w-full px-3 py-2.5 rounded-xl bg-black/70 border border-white/15 text-sm text-white focus:outline-none focus:border-champagne-gold resize-none"
              />
              <button type="button" onClick={() => setLiked(null)} className="text-xs text-stone-400 underline">
                Change my swipe
              </button>
            </div>
          )}
          {error && (
            <p className="text-xs text-rose-300" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="p-4 modal-footer-safe border-t border-champagne-500/15 flex items-center gap-3">
          <button
            type="button"
            onClick={next}
            className="px-4 py-3 rounded-xl bg-stone-900 text-sm font-semibold text-stone-200 border border-white/15"
          >
            Later
          </button>
          {liked !== null && (
            <button
              type="button"
              disabled={saving}
              onClick={() => save({ liked, rating, notes: notes.trim() })}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-wine-900 via-wine-800 to-black text-champagne-100 border border-champagne-500/35 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Check className="w-4 h-4 text-champagne-gold" />
              <span>{saving ? 'Saving…' : index + 1 < items.length ? 'Save and next' : 'Save'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
