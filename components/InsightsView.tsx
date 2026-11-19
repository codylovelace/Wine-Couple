'use client';

import React, { useMemo } from 'react';
import { PublicUser, UserSettings, VERDICTS, Verdict, Wine, WineType } from '@/lib/types';
import { wineTitle } from '@/lib/format';
import { canonicalShop, shopKey } from '@/lib/shops';
import { VERDICT_DOT, VERDICT_ORDER, WINE_TYPE_META, WINE_TYPES_LIST } from '@/lib/wine-meta';
import { Sparkles, Wine as WineIcon, ChevronRight, ShoppingBag, Award } from 'lucide-react';

interface InsightsViewProps {
  wines: Wine[];
  me: PublicUser;
  partner: PublicUser | null;
  settings: UserSettings;
  onSelectWine: (wine: Wine) => void;
  onShopClick: (shop: string) => void;
}

export function InsightsView({
  wines,
  me,
  partner,
  settings,
  onSelectWine,
  onShopClick,
}: InsightsViewProps) {
  const stats = useMemo(() => {
    const totalBottles = wines.length;
    let totalSpend = 0;
    let pricedCount = 0;
    let agreementDiffSum = 0;
    let dualRatedCount = 0;

    const verdictCounts: Record<Verdict, number> = {
      'loved-it': 0,
      'good-value': 0,
      split: 0,
      okay: 0,
      bad: 0,
    };
    const typeCounts: Record<WineType, number> = {
      red: 0,
      white: 0,
      rose: 0,
      sparkling: 0,
      dessert: 0,
      orange: 0,
    };

    let highestRatedWine: Wine | null = null;
    let bestValueWine: Wine | null = null;

    const shopMap = new Map<
      string,
      { shop: string; count: number; buyAgain: number; spend: number; currency: string }
    >();
    const grapeMap = new Map<string, number>();

    for (const w of wines) {
      if (w.purchase?.price > 0) {
        totalSpend += Number(w.purchase.price);
        pricedCount++;
      }

      if (w.coupleVerdict in verdictCounts) {
        verdictCounts[w.coupleVerdict]++;
      }
      if (w.type && w.type in typeCounts) {
        typeCounts[w.type]++;
      }

      if (w.partner1Review?.rating && w.partner2Review?.rating) {
        dualRatedCount++;
        agreementDiffSum += Math.abs(w.partner1Review.rating - w.partner2Review.rating);
      } else if (
        typeof w.partner1Review?.liked === 'boolean' &&
        typeof w.partner2Review?.liked === 'boolean'
      ) {
        dualRatedCount++;
        agreementDiffSum += w.partner1Review.liked === w.partner2Review.liked ? 0 : 4;
      }

      if (w.averageRating > 0 && (!highestRatedWine || w.averageRating > highestRatedWine.averageRating)) {
        highestRatedWine = w;
      }

      if (
        w.coupleVerdict === 'good-value' ||
        (w.averageRating >= 4.2 && w.purchase?.price && w.purchase.price < 20)
      ) {
        if (
          !bestValueWine ||
          (w.purchase?.price && bestValueWine.purchase?.price && w.purchase.price < bestValueWine.purchase.price)
        ) {
          bestValueWine = w;
        }
      }

      const shop = canonicalShop(w.purchase?.store);
      if (shop) {
        const key = shopKey(shop);
        const existing = shopMap.get(key) ?? {
          shop,
          count: 0,
          buyAgain: 0,
          spend: 0,
          currency: w.purchase?.currency || settings.defaultCurrency || '£',
        };
        existing.count++;
        if (w.coupleVerdict === 'loved-it' || w.coupleVerdict === 'good-value') {
          existing.buyAgain++;
        }
        if (w.purchase?.price > 0) {
          existing.spend += Number(w.purchase.price);
        }
        shopMap.set(key, existing);
      }

      if (
        (w.coupleVerdict === 'loved-it' || w.coupleVerdict === 'good-value') &&
        w.grape?.trim()
      ) {
        const g = w.grape.trim();
        grapeMap.set(g, (grapeMap.get(g) ?? 0) + 1);
      }
    }

    const buyAgainTotal = verdictCounts['loved-it'] + verdictCounts['good-value'];
    const buyAgainPct = totalBottles > 0 ? Math.round((buyAgainTotal / totalBottles) * 100) : 0;
    const avgPrice = pricedCount > 0 ? (totalSpend / pricedCount).toFixed(2) : '0.00';
    const avgDiff = dualRatedCount > 0 ? agreementDiffSum / dualRatedCount : 0;
    const agreementScore = Math.max(55, Math.round(100 - avgDiff * 18));

    const topShops = [...shopMap.values()]
      .sort((a, b) => b.count - a.count || b.buyAgain - a.buyAgain || a.shop.localeCompare(b.shop))
      .slice(0, 5);

    const topGrapes = [...grapeMap.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 6);

    return {
      totalBottles,
      totalSpend,
      avgPrice,
      buyAgainTotal,
      buyAgainPct,
      dualRatedCount,
      agreementScore,
      verdictCounts,
      typeCounts,
      highestRatedWine,
      bestValueWine,
      topShops,
      topGrapes,
    };
  }, [wines, settings.defaultCurrency]);

  const currency = settings.defaultCurrency || '£';
  const partnerName = partner?.name ?? 'your partner';
  const ringRadius = 26;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashOffset =
    stats.dualRatedCount > 0
      ? ringCircumference * (1 - stats.agreementScore / 100)
      : ringCircumference;

  return (
    <div className="space-y-4 font-sans">
      {/* Header */}
      <div className="px-0.5">
        <h2 className="font-serif text-2xl font-semibold text-champagne-50 tracking-wide">
          Insights
        </h2>
        <p className="text-xs text-stone-400 mt-0.5">
          {partner
            ? `${me.name} & ${partner.name}'s shared cellar profile`
            : `${me.name}'s cellar profile`}
        </p>
      </div>

      {stats.totalBottles === 0 ? (
        <div className="py-14 px-6 text-center space-y-3 surface-card rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-cellar-950 border border-white/10 flex items-center justify-center mx-auto">
            <WineIcon className="w-6 h-6 text-champagne-400/50" />
          </div>
          <h3 className="font-serif text-xl font-semibold text-champagne-50">No tasting data yet</h3>
          <p className="text-xs text-stone-400 max-w-xs mx-auto leading-relaxed">
            Log a bottle or two together and your palate harmony, top shops, and favorites will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Palate Harmony Card */}
          <div className="surface-highlight p-4 rounded-2xl flex items-center gap-4">
            <div className="relative w-16 h-16 flex-shrink-0 flex items-center justify-center">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
                <circle
                  cx="32"
                  cy="32"
                  r={ringRadius}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="5"
                />
                <circle
                  cx="32"
                  cy="32"
                  r={ringRadius}
                  fill="none"
                  stroke="#d4b06a"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringDashOffset}
                />
              </svg>
              <span className="absolute text-sm font-bold text-champagne-100 tabular-nums">
                {stats.dualRatedCount > 0 ? `${stats.agreementScore}%` : '—'}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-champagne-200">
                <Sparkles className="w-3.5 h-3.5 text-champagne-gold" />
                <span>Palate Harmony</span>
              </div>
              {stats.dualRatedCount > 0 ? (
                <p className="text-xs text-stone-200 mt-1 leading-relaxed">
                  {stats.agreementScore >= 85
                    ? `You and ${partnerName} strongly agree across ${stats.dualRatedCount} shared tasting${stats.dualRatedCount === 1 ? '' : 's'}.`
                    : `You and ${partnerName} bring complementary tastes across ${stats.dualRatedCount} shared tasting${stats.dualRatedCount === 1 ? '' : 's'}.`}
                </p>
              ) : (
                <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                  Rate a bottle together to see how closely your tastes match.
                </p>
              )}
            </div>
          </div>

          {/* 4-Tile KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3.5 rounded-2xl surface-card">
              <span className="text-[11px] uppercase font-semibold tracking-wider text-stone-400 block">
                Bottles
              </span>
              <span className="text-2xl font-serif font-bold text-champagne-50 tabular-nums mt-0.5 block">
                {stats.totalBottles}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl surface-card">
              <span className="text-[11px] uppercase font-semibold tracking-wider text-stone-400 block">
                Buy Again
              </span>
              <span className="text-2xl font-serif font-bold text-emerald-300 tabular-nums mt-0.5 block">
                {stats.buyAgainTotal}
                <span className="text-xs font-sans font-medium text-stone-400 ml-1">
                  ({stats.buyAgainPct}%)
                </span>
              </span>
            </div>

            <div className="p-3.5 rounded-2xl surface-card">
              <span className="text-[11px] uppercase font-semibold tracking-wider text-stone-400 block">
                Total Spent
              </span>
              <span className="text-2xl font-serif font-bold text-champagne-200 tabular-nums mt-0.5 block">
                {currency}
                {stats.totalSpend.toFixed(0)}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl surface-card">
              <span className="text-[11px] uppercase font-semibold tracking-wider text-stone-400 block">
                Avg / Bottle
              </span>
              <span className="text-2xl font-serif font-bold text-champagne-100 tabular-nums mt-0.5 block">
                {currency}
                {stats.avgPrice}
              </span>
            </div>
          </div>

          {/* Verdict Breakdown */}
          <section className="p-4 rounded-2xl surface-card space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-champagne-300">
              Verdict Breakdown
            </h3>
            <div className="h-2.5 rounded-full bg-cellar-950 overflow-hidden flex gap-0.5">
              {VERDICT_ORDER.map((v) => {
                const count = stats.verdictCounts[v];
                if (count === 0) return null;
                const pct = (count / stats.totalBottles) * 100;
                return (
                  <div
                    key={v}
                    style={{ width: `${pct}%` }}
                    className={`${VERDICT_DOT[v]} h-full transition-all`}
                    title={`${VERDICTS[v].shortLabel}: ${count}`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
              {VERDICT_ORDER.map((v) => {
                const count = stats.verdictCounts[v];
                if (count === 0) return null;
                return (
                  <span key={v} className="inline-flex items-center gap-1.5 text-stone-300">
                    <span className={`w-2 h-2 rounded-full ${VERDICT_DOT[v]}`} />
                    <span>{VERDICTS[v].shortLabel}</span>
                    <strong className="text-stone-100 tabular-nums">{count}</strong>
                  </span>
                );
              })}
            </div>
          </section>

          {/* Cellar Highlights */}
          {(stats.highestRatedWine || stats.bestValueWine) && (
            <section className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-champagne-300 px-0.5">
                Cellar Highlights
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {stats.highestRatedWine && (
                  <HighlightCard
                    label="Highest Rated"
                    accentClass="text-champagne-gold"
                    wine={stats.highestRatedWine}
                    meta={`${stats.highestRatedWine.averageRating.toFixed(1)}★`}
                    onClick={() => onSelectWine(stats.highestRatedWine!)}
                  />
                )}
                {stats.bestValueWine && (
                  <HighlightCard
                    label="Best Value"
                    accentClass="text-sky-300"
                    wine={stats.bestValueWine}
                    meta={[
                      canonicalShop(stats.bestValueWine.purchase?.store),
                      stats.bestValueWine.purchase?.price
                        ? `${stats.bestValueWine.purchase.currency}${Number(stats.bestValueWine.purchase.price).toFixed(2)}`
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    onClick={() => onSelectWine(stats.bestValueWine!)}
                  />
                )}
              </div>
            </section>
          )}

          {/* Style Breakdown */}
          <section className="p-4 rounded-2xl surface-card space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-champagne-300">
              Wine Styles
            </h3>
            <div className="space-y-2.5">
              {WINE_TYPES_LIST.filter(
                (t) => t === 'red' || t === 'white' || t === 'rose' || t === 'sparkling' || stats.typeCounts[t] > 0
              ).map((t) => {
                const count = stats.typeCounts[t];
                const pct = stats.totalBottles > 0 ? Math.round((count / stats.totalBottles) * 100) : 0;
                const meta = WINE_TYPE_META[t];
                return (
                  <div key={t} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-stone-200 font-medium">
                        <span className={`w-2.5 h-2.5 rounded-full ${meta.dotClass}`} />
                        <span>{meta.label}</span>
                      </span>
                      <span className="text-stone-400 tabular-nums">
                        <strong className="text-stone-100">{count}</strong> ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-cellar-950 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${meta.barClass} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Top Shops */}
          {stats.topShops.length > 0 && (
            <section className="surface-card rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.07] flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-champagne-gold" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-champagne-300">
                  Top Shops
                </h3>
              </div>
              <ul className="divide-y divide-white/[0.07]">
                {stats.topShops.map((s) => (
                  <li key={s.shop}>
                    <button
                      type="button"
                      onClick={() => onShopClick(s.shop)}
                      className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-stone-100 truncate">{s.shop}</p>
                        <p className="text-xs text-stone-400 tabular-nums">
                          {s.count} bottle{s.count === 1 ? '' : 's'} · {s.buyAgain} worth buying again
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {s.spend > 0 && (
                          <span className="text-xs font-semibold text-champagne-200 tabular-nums">
                            {s.currency}
                            {s.spend.toFixed(0)}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-stone-500" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Favorite Grapes */}
          {stats.topGrapes.length > 0 && (
            <section className="p-4 rounded-2xl surface-card space-y-2.5">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-champagne-gold" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-champagne-300">
                  Favorite Grapes
                </h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {stats.topGrapes.map(([grape, count]) => (
                  <span
                    key={grape}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cellar-950/80 border border-white/[0.08] text-xs text-stone-200"
                  >
                    <span>{grape}</span>
                    <span className="text-champagne-gold font-semibold tabular-nums">{count}</span>
                  </span>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function HighlightCard({
  label,
  accentClass,
  wine,
  meta,
  onClick,
}: {
  label: string;
  accentClass: string;
  wine: Wine;
  meta: string;
  onClick: () => void;
}) {
  const { title, subtitle } = wineTitle(wine);
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-3.5 rounded-2xl surface-card hover:border-champagne-400/35 flex items-center gap-3 text-left transition-colors"
    >
      <div className="w-11 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-cellar-950 border border-white/[0.08] flex items-center justify-center">
        {wine.imageUrl ? (
          <img src={wine.imageUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <WineIcon className="w-4 h-4 text-champagne-400/35" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className={`text-[11px] uppercase tracking-wider font-semibold block ${accentClass}`}>
          {label}
        </span>
        <p className="font-serif text-lg font-semibold text-champagne-50 leading-tight truncate">
          {title}
        </p>
        <p className="text-xs text-stone-400 truncate mt-0.5">
          {[meta, subtitle].filter(Boolean).join(' · ')}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-stone-500 flex-shrink-0" />
    </button>
  );
}
