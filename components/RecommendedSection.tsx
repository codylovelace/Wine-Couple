'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RecommendationSet, WineRecommendation } from '@/lib/recommendations';
import { UserSettings, Wine } from '@/lib/types';
import { api, isAbort, retryWhileBusy } from '@/lib/api-client';
import { WINE_TYPE_META } from '@/lib/wine-meta';
import { wineTitle } from '@/lib/format';
import { canonicalShop } from '@/lib/shops';
import { StillTrying } from '@/components/StillTrying';
import { timeAgo } from '@/lib/format';
import {
  Sparkles,
  ExternalLink,
  Bookmark,
  Plus,
  MapPin,
  RefreshCw,
  Utensils,
  ChevronRight,
  Wine as WineIcon,
} from 'lucide-react';

interface RecommendedSectionProps {
  settings: UserSettings;
  wines: Wine[];
  wishlistWineNames: string[];
  onAddToWishlist: (rec: WineRecommendation) => void;
  onLogAsTasted: (rec: WineRecommendation) => void;
  onOpenWine: (wine: Wine) => void;
  onOpenSettings: () => void;
}

interface CachedResponse {
  set: RecommendationSet | null;
  stale: boolean;
  bothLikedCount: number;
  hasKey: boolean;
}

interface PairingResponse {
  meal: string;
  cellarPicks: { wineId: string; why: string }[];
  shopPicks: WineRecommendation[];
  source: 'gemini-ai' | 'cellar-only';
}

const QUICK_MEALS = ['Steak', 'Roast Chicken', 'Pasta', 'Fish', 'Curry', 'Cheese'];

export function RecommendedSection({
  settings,
  wines,
  wishlistWineNames,
  onAddToWishlist,
  onLogAsTasted,
  onOpenWine,
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

  // Dinner pairing state
  const [meal, setMeal] = useState('');
  const [pairingBusy, setPairingBusy] = useState(false);
  const [pairingAttempt, setPairingAttempt] = useState(1);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [pairingResult, setPairingResult] = useState<PairingResponse | null>(null);
  const pairingAbortRef = useRef<AbortController | null>(null);

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

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      pairingAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const cached = await api<CachedResponse>('/api/recommendations');
        setStatus(cached);
        setSet(cached.set);
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

  const findPairing = async (targetMeal: string) => {
    const clean = targetMeal.trim();
    if (!clean) return;
    setMeal(clean);
    pairingAbortRef.current?.abort();
    const ctrl = new AbortController();
    pairingAbortRef.current = ctrl;
    setPairingBusy(true);
    setPairingAttempt(1);
    setPairingError(null);
    try {
      const res = await retryWhileBusy(
        (signal) => api<PairingResponse>('/api/pairings', { method: 'POST', body: { meal: clean }, signal }),
        { signal: ctrl.signal, onRetry: (n) => pairingAbortRef.current === ctrl && setPairingAttempt(n) }
      );
      if (pairingAbortRef.current !== ctrl) return;
      setPairingResult(res);
    } catch (err) {
      if (pairingAbortRef.current !== ctrl) return;
      if (!isAbort(err) && !ctrl.signal.aborted) {
        setPairingError(err instanceof Error ? err.message : 'Could not find pairings right now.');
      }
    } finally {
      if (pairingAbortRef.current === ctrl) {
        pairingAbortRef.current = null;
        setPairingBusy(false);
      }
    }
  };

  const names = [settings.partner1Name, settings.partner2Name].filter(Boolean).join(' & ') || 'You two';

  return (
    <div className="space-y-4 font-sans">
      {/* What's for Dinner? Pairing Finder */}
      <section className="surface-card p-4 rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-wine-50 border border-wine-200 flex items-center justify-center text-wine-700 flex-shrink-0">
            <Utensils className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-semibold text-ink-900 leading-tight">
              What&apos;s for dinner?
            </h2>
            <p className="text-xs text-ink-500">
              Match tonight&apos;s meal with bottles at home or in the shop
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            findPairing(meal);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={meal}
            onChange={(e) => setMeal(e.target.value)}
            placeholder="e.g. roast lamb, spicy curry…"
            aria-label="Dinner meal"
            className="flex-1 px-3 py-2 text-sm field-input min-w-0"
          />
          <button
            type="submit"
            disabled={pairingBusy || !meal.trim()}
            className="px-3.5 py-2 rounded-xl btn-primary text-xs font-semibold whitespace-nowrap disabled:opacity-50"
          >
            {pairingBusy ? 'Matching…' : 'Pair wine'}
          </button>
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {QUICK_MEALS.map((qm) => (
            <button
              key={qm}
              type="button"
              onClick={() => findPairing(qm)}
              className="px-2.5 py-1 rounded-lg bg-linen-50 hover:bg-linen-100 border border-linen-200 text-xs font-medium text-ink-700 whitespace-nowrap transition-colors"
            >
              {qm}
            </button>
          ))}
        </div>

        {pairingBusy && (
          <StillTrying
            label={`Matching bottles for ${meal}`}
            attempt={pairingAttempt}
            onCancel={() => pairingAbortRef.current?.abort()}
          />
        )}

        {pairingError && (
          <p className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800" role="alert">
            {pairingError}
          </p>
        )}

        {pairingResult && !pairingBusy && (
          <div className="pt-2 border-t border-linen-100 space-y-3 animate-fadeIn">
            {/* From Your Cellar */}
            <div className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-wine-700">
                From Your Cellar for {pairingResult.meal}
              </h3>
              {pairingResult.cellarPicks.length === 0 ? (
                <p className="text-xs text-ink-500">
                  No close cellar matches logged yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {pairingResult.cellarPicks.map((pick) => {
                    const matched = wines.find((w) => w.id === pick.wineId);
                    if (!matched) return null;
                    const { title } = wineTitle(matched);
                    const shop = canonicalShop(matched.purchase?.store);
                    return (
                      <li key={pick.wineId}>
                        <button
                          type="button"
                          onClick={() => onOpenWine(matched)}
                          className="w-full p-2.5 rounded-xl bg-linen-50 hover:bg-linen-100 border border-linen-200 flex items-center gap-3 text-left transition-colors"
                        >
                          <div className="w-9 h-12 rounded-lg overflow-hidden bg-white border border-linen-200 flex-shrink-0 flex items-center justify-center">
                            {matched.imageUrl ? (
                              <img src={matched.imageUrl} alt={title} className="w-full h-full object-cover" />
                            ) : (
                              <WineIcon className="w-4 h-4 text-wine-300" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-semibold text-ink-900 truncate">{title}</span>
                              {(matched.stock ?? 0) > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-wine-50 border border-wine-200 text-[10px] font-semibold text-wine-700">
                                  {matched.stock} at home
                                </span>
                              )}
                            </div>
                            {shop && <p className="text-[11px] text-ink-500">{shop}</p>}
                            {pick.why && <p className="text-xs text-ink-700 mt-0.5 leading-snug">{pick.why}</p>}
                          </div>
                          <ChevronRight className="w-4 h-4 text-ink-400 flex-shrink-0" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Pick Up at the Shop */}
            {pairingResult.shopPicks.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-wine-700">
                  Pick Up at the Shop
                </h3>
                <ul className="space-y-2">
                  {pairingResult.shopPicks.map((rec) => {
                    const isWishlisted = wishlistWineNames.includes(rec.name.toLowerCase());
                    return (
                      <li key={rec.id} className="p-3 rounded-xl bg-linen-50 border border-linen-200 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-ink-900">{rec.name}</p>
                            <p className="text-xs text-ink-500">
                              {[rec.producer, rec.grape, rec.country].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          {rec.estimatedPrice > 0 && (
                            <span className="text-xs font-semibold text-ink-900 tabular-nums">
                              ~{rec.currency}
                              {rec.estimatedPrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {rec.reason && <p className="text-xs text-ink-700 leading-snug">{rec.reason}</p>}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onAddToWishlist(rec)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border flex items-center gap-1 ${
                              isWishlisted
                                ? 'bg-wine-50 text-wine-800 border-wine-300'
                                : 'bg-white text-ink-900 border-linen-200'
                            }`}
                          >
                            <Bookmark className={`w-3 h-3 ${isWishlisted ? 'fill-wine-700 text-wine-700' : ''}`} />
                            <span>{isWishlisted ? 'Saved to Try' : 'Save to Try'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onLogAsTasted(rec)}
                            className="px-2.5 py-1.5 rounded-lg btn-primary text-[11px] font-semibold flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>We Tried It</span>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Editorial Sommelier Hero */}
      <div className="surface-highlight p-5 rounded-2xl space-y-2.5 relative overflow-hidden">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-wine-700 border border-wine-200 text-[11px] font-semibold tracking-wider uppercase shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-wine-700" />
          <span>Curated for {names}</span>
        </span>
        <h2 className="font-serif text-2xl font-semibold text-ink-900 leading-tight">
          Wines you might both love
        </h2>
        <p className="text-xs text-ink-700 leading-relaxed">
          Picked by Gemini from the{' '}
          <strong className="text-ink-900 tabular-nums">{status?.bothLikedCount ?? 0}</strong>{' '}
          bottle{status?.bothLikedCount === 1 ? '' : 's'} you both rated Buy Again, steering clear of styles you passed on.
        </p>
        {set && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-wine-200/60">
            <span className="text-[11px] text-ink-500">Updated {timeAgo(set.generatedAt)}</span>
            <button
              type="button"
              onClick={generate}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-linen-100 border border-linen-200 text-xs font-semibold text-ink-900 shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-wine-700 ${generating ? 'animate-spin' : ''}`} />
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
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2">
          <p>{error}</p>
          {/key/i.test(error) && (
            <button type="button" onClick={onOpenSettings} className="underline font-semibold text-wine-700">
              Open Settings
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center space-y-2">
          <Sparkles className="w-7 h-7 text-wine-400 animate-pulse mx-auto" />
          <p className="text-xs text-ink-500">Loading suggestions…</p>
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
                      <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wider">
                        {typeMeta.label}
                      </span>
                    </div>
                    <h3 className="font-serif text-2xl text-ink-900 font-semibold leading-tight">
                      {rec.name}
                    </h3>
                    {rec.producer && (
                      <p className="text-xs text-wine-700 font-medium mt-0.5">{rec.producer}</p>
                    )}
                  </div>
                  {rec.estimatedPrice > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-linen-100 border border-linen-200 text-xs font-semibold text-ink-900 flex-shrink-0 tabular-nums">
                      ~{rec.currency}
                      {rec.estimatedPrice.toFixed(2)}
                    </span>
                  )}
                </div>

                <p className="flex items-center gap-1.5 text-xs text-ink-500 pl-1.5">
                  <MapPin className="w-3.5 h-3.5 text-ink-400 flex-shrink-0" />
                  <span>{[rec.grape, rec.region, rec.country].filter(Boolean).join(' · ')}</span>
                </p>

                {rec.reason && (
                  <blockquote className="ml-1.5 p-3 rounded-xl bg-linen-50 border-l-2 border-l-wine-600 text-xs text-ink-700 leading-relaxed">
                    {rec.reason}
                  </blockquote>
                )}

                {rec.basedOn.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pl-1.5">
                    <span className="text-[11px] text-ink-500">Inspired by</span>
                    {rec.basedOn.map((b) => (
                      <span
                        key={b}
                        className="px-2 py-0.5 rounded-md bg-linen-100 border border-linen-200 text-[11px] text-ink-900 font-medium"
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
                        className="px-2.5 py-1.5 rounded-lg bg-linen-50 border border-linen-200 hover:border-linen-300 text-[11px] text-ink-900 font-medium flex items-center gap-1 transition-colors"
                      >
                        <span>{label}</span>
                        <ExternalLink className="w-3 h-3 text-ink-400" />
                      </a>
                    ))}
                </div>

                <div className="pt-2.5 border-t border-linen-100 grid grid-cols-2 gap-2 pl-1.5">
                  <button
                    type="button"
                    onClick={() => onAddToWishlist(rec)}
                    aria-pressed={isWishlisted}
                    className={`py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-colors ${
                      isWishlisted
                        ? 'bg-wine-50 text-wine-800 border-wine-300'
                        : 'btn-secondary'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-wine-700 text-wine-700' : ''}`} />
                    <span>{isWishlisted ? 'Saved to Try' : 'Save to Try'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onLogAsTasted(rec)}
                    className="py-2.5 rounded-xl btn-primary text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
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
      <div className="w-14 h-14 rounded-2xl bg-linen-100 border border-linen-200 flex items-center justify-center mx-auto">
        <Sparkles className="w-6 h-6 text-wine-700/60" />
      </div>
      <div className="space-y-1">
        <h3 className="font-serif text-xl font-semibold text-ink-900">{title}</h3>
        <p className="text-xs text-ink-500 max-w-xs mx-auto leading-relaxed">{text}</p>
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
