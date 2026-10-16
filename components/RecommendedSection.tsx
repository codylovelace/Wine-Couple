'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RecommendationSet, WineRecommendation } from '@/lib/recommendations';
import { UserSettings } from '@/lib/types';
import { api, isAbort, retryWhileBusy } from '@/lib/api-client';
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
      if (!isAbort(err) && !ctrl.signal.aborted) setError(err instanceof Error ? err.message : 'Suggestions failed. Try again.');
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

  const names = `${settings.partner1Name} & ${settings.partner2Name}`;

  return (
    <div className="space-y-4 font-sans">
      <div className="luxury-banner p-5 rounded-3xl space-y-2 relative overflow-hidden">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 text-champagne-200 border border-champagne-500/30 text-[11px] font-semibold tracking-wider uppercase">
          <Sparkles className="w-3.5 h-3.5 text-champagne-gold" />
          <span>For {names}</span>
        </span>
        <h2 className="font-serif text-2xl font-semibold text-white leading-tight">Wines you might both like</h2>
        <p className="text-xs text-stone-200 leading-relaxed">
          Gemini suggests these from the {status?.bothLikedCount ?? ''} wine{status?.bothLikedCount === 1 ? '' : 's'} you both
          liked, steering away from ones you both disliked.
        </p>
        {set && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-stone-400">Updated {timeAgo(set.generatedAt)}</span>
            <button
              onClick={generate}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 border border-champagne-500/30 text-xs font-semibold text-champagne-100 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Thinking…' : 'New suggestions'}
            </button>
          </div>
        )}
      </div>

      {generating && (
        <div className="p-3.5 rounded-2xl luxury-card">
          <StillTrying label="Finding wines you might both like" attempt={attempt} onCancel={() => abortRef.current?.abort()} />
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-sm text-rose-100 space-y-2">
          <p>{error}</p>
          {/key/i.test(error) && (
            <button onClick={onOpenSettings} className="underline font-semibold text-xs">
              Open Settings
            </button>
          )}
        </div>
      )}

      {loading ? (
        <p className="py-16 text-center text-xs text-stone-300">Loading suggestions…</p>
      ) : status && !status.hasKey && !set ? (
        <EmptyState
          title="Add a Gemini key"
          text="Suggestions come from Google Gemini. Add a key in Settings (the same one that reads wine labels)."
          action={{ label: 'Open Settings', onClick: onOpenSettings }}
        />
      ) : status && status.bothLikedCount === 0 && !set ? (
        <EmptyState
          title="Nothing to go on yet"
          text="Once you've both liked a wine or two, suggestions based on them will appear here."
        />
      ) : generating && !set ? null
      : set ? (
        <div className="space-y-4">
          {set.recommendations.map((rec) => {
            const isWishlisted = wishlistWineNames.includes(rec.name.toLowerCase());
            return (
              <article key={rec.id} className="luxury-card p-4 rounded-3xl space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-serif text-xl text-white font-semibold leading-snug">{rec.name}</h3>
                    {rec.producer && <p className="text-sm text-champagne-200 font-medium">{rec.producer}</p>}
                  </div>
                  {rec.estimatedPrice > 0 && (
                    <span className="text-sm font-bold text-champagne-accent flex-shrink-0">
                      ~{rec.currency}
                      {rec.estimatedPrice.toFixed(2)}
                    </span>
                  )}
                </div>
                <p className="flex items-center gap-1.5 text-xs text-stone-300">
                  <MapPin className="w-3.5 h-3.5 text-champagne-400/80 flex-shrink-0" />
                  <span>{[rec.grape, rec.region, rec.country].filter(Boolean).join(' · ')}</span>
                </p>
                {rec.reason && (
                  <p className="p-3 rounded-2xl bg-[#140b10]/95 border-l-2 border-l-champagne-gold/70 text-sm text-stone-100 leading-relaxed">
                    {rec.reason}
                  </p>
                )}
                {rec.basedOn.length > 0 && (
                  <p className="text-xs text-stone-400">Because you both liked {rec.basedOn.join(', ')}</p>
                )}
                <div className="flex flex-wrap gap-2">
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
                        className="px-3 py-2 rounded-xl bg-stone-900/80 border border-white/10 text-xs text-stone-100 flex items-center gap-1.5"
                      >
                        {label}
                        <ExternalLink className="w-3 h-3 text-stone-400" />
                      </a>
                    ))}
                </div>
                <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onAddToWishlist(rec)}
                    aria-pressed={isWishlisted}
                    className={`py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 border ${
                      isWishlisted ? 'bg-champagne-950 text-champagne-accent border-champagne-500/45' : 'bg-stone-900/90 text-stone-200 border-white/15'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${isWishlisted ? 'fill-champagne-gold text-champagne-gold' : ''}`} />
                    {isWishlisted ? 'On wishlist' : 'Wishlist'}
                  </button>
                  <button
                    onClick={() => onLogAsTasted(rec)}
                    className="py-2.5 rounded-xl bg-gradient-to-r from-wine-800 via-wine-900 to-black text-champagne-100 border border-champagne-500/35 text-sm font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    We tried it
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

function EmptyState({ title, text, action }: { title: string; text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="py-12 text-center space-y-3 px-6">
      <Sparkles className="w-8 h-8 text-champagne-500/50 mx-auto" />
      <h3 className="font-serif text-xl font-semibold text-stone-100">{title}</h3>
      <p className="text-xs text-stone-300 max-w-xs mx-auto leading-relaxed">{text}</p>
      {action && (
        <button onClick={action.onClick} className="px-4 py-2.5 rounded-xl bg-stone-900 text-stone-100 text-sm font-semibold border border-white/15">
          {action.label}
        </button>
      )}
    </div>
  );
}
