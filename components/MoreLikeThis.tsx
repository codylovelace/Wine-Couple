'use client';

import React, { useEffect, useRef, useState } from 'react';
import { RecommendationSet, WineRecommendation } from '@/lib/recommendations';
import { api, isAbort, retryWhileBusy } from '@/lib/api-client';
import { WINE_TYPE_META } from '@/lib/wine-meta';
import { StillTrying } from '@/components/StillTrying';
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

  const [attempt, setAttempt] = useState(1);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  // Keeps asking while Gemini is busy, until it answers or you cancel.
  const generate = async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setGenerating(true);
    setAttempt(1);
    setError(null);
    try {
      const { set: fresh } = await retryWhileBusy(
        (signal) => api<{ set: RecommendationSet }>(`/api/wines/${encodeURIComponent(wineId)}/similar`, { method: 'POST', signal }),
        { signal: ctrl.signal, onRetry: setAttempt }
      );
      setSet(fresh);
      setStatus((s) => (s ? { ...s, stale: false } : s));
    } catch (err) {
      if (abortRef.current !== ctrl) return;
      if (!isAbort(err) && !ctrl.signal.aborted) setError(err instanceof Error ? err.message : 'Suggestions failed. Try again.');
    } finally {
      if (abortRef.current === ctrl) {
        abortRef.current = null;
        setGenerating(false);
      }
    }
  };

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-wine-700 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-wine-700" />
          More like this
        </h3>
        {set && (
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg btn-secondary text-[11px] font-semibold disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Thinking…' : status?.stale ? 'Update' : 'New ideas'}
          </button>
        )}
      </div>

      {error && (
        <p className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800" role="alert">
          {error}
        </p>
      )}

      {generating && (
        <div className="p-3.5 rounded-2xl surface-card">
          <StillTrying label="Finding similar wines" attempt={attempt} onCancel={() => abortRef.current?.abort()} />
        </div>
      )}

      {!status && !error ? (
        <p className="text-xs text-ink-500">Loading…</p>
      ) : !set ? (
        status && !status.hasKey ? (
          <p className="text-xs text-ink-500">Add a Gemini key in Settings to get suggestions for wines like this one.</p>
        ) : generating ? null : (
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="w-full py-3 rounded-xl surface-card hover:border-wine-300 text-sm font-semibold text-ink-900 flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4 text-wine-700" />
            <span>Find wines that taste like this</span>
          </button>
        )
      ) : (
        <>
          <ul className="space-y-2">
            {set.recommendations.map((rec) => {
              const saved = wishlistNames.includes(rec.name.toLowerCase());
              const typeMeta = WINE_TYPE_META[rec.type] || WINE_TYPE_META.red;
              return (
                <li
                  key={rec.id}
                  className="p-3.5 rounded-2xl surface-card space-y-2 relative overflow-hidden"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-0 bottom-0 w-[3px] ${typeMeta.barClass}`}
                  />
                  <div className="flex items-start justify-between gap-2 pl-1">
                    <div className="min-w-0">
                      <p className="font-serif text-lg font-semibold text-ink-900 leading-snug">{rec.name}</p>
                      <p className="text-xs text-ink-500 truncate">
                        {[rec.producer, rec.grape, rec.country].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {rec.estimatedPrice > 0 && (
                      <span className="text-xs font-semibold text-ink-900 flex-shrink-0 tabular-nums">
                        ~{rec.currency}
                        {rec.estimatedPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {rec.reason && <p className="text-xs text-ink-700 leading-relaxed pl-1">{rec.reason}</p>}
                  <div className="flex items-center gap-2 pt-0.5 pl-1">
                    <button
                      type="button"
                      onClick={() => onAddToWishlist(rec)}
                      aria-pressed={saved}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 border transition-colors ${
                        saved
                          ? 'bg-wine-700 text-white border-wine-700'
                          : 'bg-linen-50 text-ink-900 border-linen-200 hover:border-linen-300'
                      }`}
                    >
                      <Bookmark className={`w-3 h-3 ${saved ? 'fill-white text-white' : ''}`} />
                      {saved ? 'On wishlist' : 'Wishlist'}
                    </button>
                    {rec.onlineLinks.wineSearcher && (
                      <a
                        href={rec.onlineLinks.wineSearcher}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-linen-50 border border-linen-200 hover:border-linen-300 text-[11px] text-ink-900 flex items-center gap-1 transition-colors"
                      >
                        Find it
                        <ExternalLink className="w-3 h-3 text-ink-500" />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-ink-400">Suggested by Gemini {timeAgo(set.generatedAt)}</p>
        </>
      )}
    </section>
  );
}
