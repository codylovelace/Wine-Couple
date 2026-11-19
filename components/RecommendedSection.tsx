'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RecommendationSet, WineRecommendation } from '@/lib/recommendations';
import { UserSettings } from '@/lib/types';
import { api, isAbort, retryWhileBusy } from '@/lib/api-client';
import { WINE_TYPE_META } from '@/lib/wine-meta';
import { StillTrying } from '@/components/StillTrying';
import { timeAgo } from '@/lib/format';
import { Sparkles, ExternalLink, Bookmark, Plus, MapPin, RefreshCw } from 'lucide-react';

interface RecommendedSectionProps {
  settings: UserSettings;
  wishlistWineNames: string[];
  onAddToWishlist: (rec: WineRecommendation) => void;
  onLogAsTasted: (rec: WineRecommendation) => void;
  onOpenSettings: () => void;
}

interface CachedResponse {
  set: RecommendationSet | null;
  stale: boolean;
  bothLikedCount: number;
  hasKey: boolean;
}

export function RecommendedSection({
  settings,
  wishlistWineNames,
  onAddToWishlist,
  onLogAsTasted,
  onOpenSettings,
}: RecommendedSectionProps) {
  const [set, setSet] = useState<RecommendationSet | null>(null);
  const [status, setStatus] = useState<CachedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoRequested = useRef(false);

  const [attempt, setAttempt] = useState(1);
  const abortRef = useRef<AbortController | null>(null);

  // Keeps asking while Gemini is busy, until it answers or you cancel.
  const generate = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setGenerating(true);
    setAttempt(1);
    setError(null);
    try {
      const { set: fresh } = await retryWhileBusy(
        (signal) => api<{ set: RecommendationSet }>('/api/recommendations', { method: 'POST', signal }),
        { signal: ctrl.signal, onRetry: setAttempt }
      );
      setSet(fresh);
      setStatus((s) => (s ? { ...s, stale: false } : s));
    } catch (err) {
      if (abortRef.current !== ctrl) return;
      if (!isAbort(err) && !ctrl.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Suggestions failed. Try again.');
      }
    } finally {
      if (abortRef.current === ctrl) {
        abortRef.current = null;
        setGenerating(false);
      }
    }
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    (async () => {
      try {
        const cached = await api<CachedResponse>('/api/recommendations');
        setStatus(cached);
        setSet(cached.set);
        // New likes since the last set: fetch fresh suggestions once.
        if (cached.stale && cached.hasKey && cached.bothLikedCount > 0 && !autoRequested.current) {
          autoRequested.current = true;
          generate();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load suggestions.');
      } finally {
        setLoading(false);
      }
    })();
  }, [generate]);

  const names = [settings.partner1Name, settings.partner2Name].filter(Boolean).join(' & ') || 'You two';

  return (
    <div className="space-y-4 font-sans">
      {/* Editorial Sommelier Hero */}
      <div className="surface-highlight p-5 rounded-2xl space-y-2.5 relative overflow-hidden">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cellar-950/70 text-champagne-200 border border-champagne-400/25 text-[11px] font-semibold tracking-wider uppercase">
          <Sparkles className="w-3.5 h-3.5 text-champagne-gold" />
          <span>Curated for {names}</span>
        </span>
        <h2 className="font-serif text-2xl font-semibold text-champagne-50 leading-tight">
          Wines you might both love
        </h2>
        <p className="text-xs text-stone-300 leading-relaxed">
          Picked by Gemini from the{' '}
          <strong className="text-champagne-100 tabular-nums">{status?.bothLikedCount ?? 0}</strong>{' '}
          bottle{status?.bothLikedCount === 1 ? '' : 's'} you both rated Buy Again, steering clear of styles you passed on.
        </p>
        {set && (
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/[0.08]">
            <span className="text-[11px] text-stone-400">Updated {timeAgo(set.generatedAt)}</span>
            <button
              type="button"
              onClick={generate}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl btn-secondary text-xs font-semibold disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-champagne-gold ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Thinking…' : 'Refresh picks'}
            </button>
          </div>
        )}
      </div>

      {generating && (
        <div className="p-4 rounded-2xl surface-card">
          <StillTrying
            label="Curating wines you might both enjoy"
            attempt={attempt}
            onCancel={() => abortRef.current?.abort()}
          />
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-400/30 text-xs text-rose-100 space-y-2">
          <p>{error}</p>
          {/key/i.test(error) && (
            <button type="button" onClick={onOpenSettings} className="underline font-semibold text-champagne-200">
              Open Settings
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center space-y-2">
          <Sparkles className="w-7 h-7 text-champagne-400/40 animate-pulse mx-auto" />
          <p className="text-xs text-stone-400">Loading suggestions…</p>
        </div>
      ) : status && !status.hasKey && !set ? (
        <EmptyState
          title="Add a Gemini key"
          text="Recommendations come from Google Gemini. Add your API key in Settings (the same key that reads bottle labels)."
          action={{ label: 'Open Settings', onClick: onOpenSettings }}
        />
      ) : status && status.bothLikedCount === 0 && !set ? (
        <EmptyState
          title="Nothing to go on yet"
          text="Once you've both swiped right on a bottle or two together, personalized suggestions will appear here."
        />
      ) : generating && !set ? null : set ? (
        <div className="space-y-3.5">
          {set.recommendations.map((rec) => {
            const isWishlisted = wishlistWineNames.includes(rec.name.toLowerCase());
            const typeMeta = WINE_TYPE_META[rec.type] || WINE_TYPE_META.red;
            return (
              <article
                key={rec.id}
                className="surface-card p-4 rounded-2xl space-y-3 relative overflow-hidden"
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-0 bottom-0 w-[3.5px] ${typeMeta.barClass}`}
                />

                <div className="flex items-start justify-between gap-3 pl-1.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`w-2 h-2 rounded-full ${typeMeta.dotClass}`} />
                      <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">
                        {typeMeta.label}
                      </span>
                    </div>
                    <h3 className="font-serif text-2xl text-champagne-50 font-semibold leading-tight">
                      {rec.name}
                    </h3>
                    {rec.producer && (
                      <p className="text-xs text-champagne-300/90 font-medium mt-0.5">{rec.producer}</p>
                    )}
                  </div>
                  {rec.estimatedPrice > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-cellar-950 border border-white/[0.08] text-xs font-semibold text-champagne-200 flex-shrink-0 tabular-nums">
                      ~{rec.currency}
                      {rec.estimatedPrice.toFixed(2)}
                    </span>
                  )}
                </div>

                <p className="flex items-center gap-1.5 text-xs text-stone-400 pl-1.5">
                  <MapPin className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
                  <span>{[rec.grape, rec.region, rec.country].filter(Boolean).join(' · ')}</span>
                </p>

                {rec.reason && (
                  <blockquote className="ml-1.5 p-3 rounded-xl bg-cellar-950/75 border-l-2 border-l-champagne-gold/75 text-xs text-stone-200 leading-relaxed">
                    {rec.reason}
                  </blockquote>
                )}

                {rec.basedOn.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pl-1.5">
                    <span className="text-[11px] text-stone-400">Inspired by</span>
                    {rec.basedOn.map((b) => (
                      <span
                        key={b}
                        className="px-2 py-0.5 rounded-md bg-cellar-850 border border-white/[0.07] text-[11px] text-champagne-200"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 pl-1.5">
                  {[
                    ['Wine-Searcher', rec.onlineLinks.wineSearcher],
                    ['Vivino', rec.onlineLinks.vivino],
                    ['Supermarkets', rec.onlineLinks.supermarketSearch],
                  ]
                    .filter((l): l is [string, string] => Boolean(l[1]))
                    .map(([label, href]) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-cellar-950/80 border border-white/[0.08] hover:border-white/20 text-[11px] text-stone-200 flex items-center gap-1 transition-colors"
                      >
                        <span>{label}</span>
                        <ExternalLink className="w-3 h-3 text-stone-400" />
                      </a>
                    ))}
                </div>

                <div className="pt-2.5 border-t border-white/[0.07] grid grid-cols-2 gap-2 pl-1.5">
                  <button
                    type="button"
                    onClick={() => onAddToWishlist(rec)}
                    aria-pressed={isWishlisted}
                    className={`py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-colors ${
                      isWishlisted
                        ? 'bg-wine-800/80 text-champagne-100 border-champagne-400/40'
                        : 'btn-secondary'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-champagne-gold text-champagne-gold' : ''}`} />
                    <span>{isWishlisted ? 'Saved to Try' : 'Save to Try'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onLogAsTasted(rec)}
                    className="py-2.5 rounded-xl btn-primary text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-champagne-gold" />
                    <span>We Tried It</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="py-14 px-6 text-center space-y-3 surface-card rounded-2xl">
      <div className="w-14 h-14 rounded-2xl bg-cellar-950 border border-white/10 flex items-center justify-center mx-auto">
        <Sparkles className="w-6 h-6 text-champagne-400/50" />
      </div>
      <div className="space-y-1">
        <h3 className="font-serif text-xl font-semibold text-champagne-50">{title}</h3>
        <p className="text-xs text-stone-400 max-w-xs mx-auto leading-relaxed">{text}</p>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="px-4 py-2.5 rounded-xl btn-secondary text-xs font-semibold"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
