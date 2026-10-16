'use client';

import React, { useEffect, useState } from 'react';
import { RecommendationSet, WineRecommendation } from '@/lib/recommendations';
import { api } from '@/lib/api-client';
import { timeAgo } from '@/lib/format';
import { Sparkles, Bookmark, RefreshCw, ExternalLink } from 'lucide-react';

interface MoreLikeThisProps {
  wineId: string;
  wishlistNames: string[];
  onAddToWishlist: (rec: WineRecommendation) => void;
}

interface CachedResponse {
  set: RecommendationSet | null;
  stale: boolean;
  hasKey: boolean;
}

// Gemini suggestions for wines that taste like this one. Shows the saved set
// when there is one; otherwise waits for a tap, so opening a wine never
// spends a Gemini call on its own.
export function MoreLikeThis({ wineId, wishlistNames, onAddToWishlist }: MoreLikeThisProps) {
  const [status, setStatus] = useState<CachedResponse | null>(null);
  const [set, setSet] = useState<RecommendationSet | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<CachedResponse>(`/api/wines/${encodeURIComponent(wineId)}/similar`)
      .then((cached) => {
        if (cancelled) return;
        setStatus(cached);
        setSet(cached.set);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Could not load suggestions.'));
    return () => {
      cancelled = true;
    };
  }, [wineId]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const { set: fresh } = await api<{ set: RecommendationSet }>(`/api/wines/${encodeURIComponent(wineId)}/similar`, {
        method: 'POST',
      });
      setSet(fresh);
      setStatus((s) => (s ? { ...s, stale: false } : s));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suggestions failed. Try again.');
    } finally {
      setGenerating(false);
    }
  };

  const sectionTitle = 'text-[11px] font-bold uppercase tracking-wider text-champagne-300';

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className={`${sectionTitle} flex items-center gap-1.5`}>
          <Sparkles className="w-3.5 h-3.5 text-champagne-gold" />
          More like this
        </h3>
        {set && (
          <button
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-900 border border-white/10 text-[11px] font-semibold text-stone-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Thinking…' : status?.stale ? 'Update' : 'New ideas'}
          </button>
        )}
      </div>

      {error && (
        <p className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-100" role="alert">
          {error}
        </p>
      )}

      {!status && !error ? (
        <p className="text-xs text-stone-400">Loading…</p>
      ) : !set ? (
        status && !status.hasKey ? (
          <p className="text-xs text-stone-400">Add a Gemini key in Settings to get suggestions for wines like this one.</p>
        ) : (
          <button
            onClick={generate}
            disabled={generating}
            className="w-full py-3 rounded-xl bg-stone-900/80 border border-champagne-500/30 text-sm font-semibold text-champagne-100 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-champagne-gold" />}
            {generating ? 'Finding similar wines…' : 'Find wines that taste like this'}
          </button>
        )
      ) : (
        <>
          <ul className="space-y-2">
            {set.recommendations.map((rec) => {
              const saved = wishlistNames.includes(rec.name.toLowerCase());
              return (
                <li key={rec.id} className="p-3 rounded-2xl bg-stone-900/60 border border-white/10 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-100 leading-snug">{rec.name}</p>
                      <p className="text-xs text-stone-400 truncate">
                        {[rec.producer, rec.grape, rec.country].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {rec.estimatedPrice > 0 && (
                      <span className="text-xs font-bold text-champagne-accent flex-shrink-0">
                        ~{rec.currency}
                        {rec.estimatedPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {rec.reason && <p className="text-xs text-stone-200 leading-relaxed">{rec.reason}</p>}
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      onClick={() => onAddToWishlist(rec)}
                      aria-pressed={saved}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 border ${
                        saved ? 'bg-champagne-950 text-champagne-accent border-champagne-500/45' : 'bg-black/40 text-stone-200 border-white/15'
                      }`}
                    >
                      <Bookmark className={`w-3 h-3 ${saved ? 'fill-champagne-gold text-champagne-gold' : ''}`} />
                      {saved ? 'On wishlist' : 'Wishlist'}
                    </button>
                    {rec.onlineLinks.wineSearcher && (
                      <a
                        href={rec.onlineLinks.wineSearcher}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/15 text-[11px] text-stone-200 flex items-center gap-1"
                      >
                        Find it
                        <ExternalLink className="w-3 h-3 text-stone-400" />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-stone-500">Suggested by Gemini {timeAgo(set.generatedAt)}</p>
        </>
      )}
    </section>
  );
}
