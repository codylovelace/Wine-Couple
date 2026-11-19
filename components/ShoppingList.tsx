'use client';

import React, { useMemo, useState } from 'react';
import { PublicUser, VERDICTS, Wine, isTasted } from '@/lib/types';
import { wineTitle } from '@/lib/format';
import { canonicalShop, shopKey } from '@/lib/shops';
import { WINE_TYPE_META } from '@/lib/wine-meta';
import { WineCard } from '@/components/WineCard';
import {
  ShoppingBag,
  ChevronRight,
  ChevronDown,
  Star,
  Search,
  X,
  Wine as WineIcon,
  AlertTriangle,
  Plus,
  Bookmark,
} from 'lucide-react';

interface ShoppingListProps {
  wines: Wine[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  me: PublicUser;
  partner: PublicUser | null;
  onOpen: (wine: Wine) => void;
  onShopClick: (shop: string) => void;
  onLogWishlistWine: (wine: Wine) => void;
  onAddToWishlist: () => void;
}

const NO_SHOP = 'Shop not recorded';

// What to pick up next time you're in the wine aisle: wines worth buying again
// (plus collapsible "Avoid" warnings per shop) and your "To Try" wishlist.
export function ShoppingList({
  wines,
  searchQuery,
  onSearchChange,
  me,
  partner,
  onOpen,
  onShopClick,
  onLogWishlistWine,
  onAddToWishlist,
}: ShoppingListProps) {
  const [view, setView] = useState<'again' | 'try'>('again');
  const [selectedShop, setSelectedShop] = useState<string>('all');
  const [expandedAvoid, setExpandedAvoid] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const byShop = new Map<string, { shop: string; buyAgain: Wine[]; avoid: Wine[] }>();
    for (const w of wines) {
      if (!isTasted(w)) continue;
      const isBuyAgain = w.coupleVerdict === 'loved-it' || w.coupleVerdict === 'good-value';
      const isAvoid = w.coupleVerdict === 'bad';
      if (!isBuyAgain && !isAvoid) continue;
      const shop = canonicalShop(w.purchase?.store) || NO_SHOP;
      const key = shop === NO_SHOP ? NO_SHOP : shopKey(shop);
      if (!byShop.has(key)) byShop.set(key, { shop, buyAgain: [], avoid: [] });
      const bucket = byShop.get(key)!;
      if (isBuyAgain) bucket.buyAgain.push(w);
      else bucket.avoid.push(w);
    }
    for (const g of byShop.values()) {
      g.buyAgain.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0) || a.name.localeCompare(b.name));
      g.avoid.sort((a, b) => a.name.localeCompare(b.name));
    }
    // Shops with buy-again wines come first, busiest first; unrecorded shop goes last.
    return [...byShop.values()].sort((a, b) => {
      if (a.shop === NO_SHOP) return 1;
      if (b.shop === NO_SHOP) return -1;
      if ((a.buyAgain.length > 0) !== (b.buyAgain.length > 0)) {
        return a.buyAgain.length > 0 ? -1 : 1;
      }
      return b.buyAgain.length - a.buyAgain.length || a.shop.localeCompare(b.shop);
    });
  }, [wines]);

  const toTry = useMemo(() => wines.filter((w) => w.wishlist), [wines]);
  const buyAgainCount = groups.reduce((n, g) => n + g.buyAgain.length, 0);

  const visibleGroups = useMemo(() => {
    if (selectedShop === 'all') return groups;
    return groups.filter((g) => g.shop === selectedShop);
  }, [groups, selectedShop]);

  const toggleAvoid = (shop: string) =>
    setExpandedAvoid((prev) => ({ ...prev, [shop]: !prev[shop] }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="px-0.5">
        <h2 className="font-serif text-2xl font-semibold text-ink-900 tracking-wide">
          Aisle Guide
        </h2>
        <p className="text-xs text-ink-500 mt-0.5">
          Standing in the wine aisle? Check what to re-buy or skip.
        </p>
      </div>

      {/* Inline Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search wine, grape, or shop…"
          aria-label="Search aisle guide"
          className="w-full pl-10 pr-9 py-2.5 text-sm field-input shadow-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-linen-100 hover:bg-linen-200 text-ink-700 flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Segmented Control */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-linen-100 border border-linen-200" role="tablist">
        {(
          [
            ['again', `At the Shop (${buyAgainCount})`],
            ['try', `To Try (${toTry.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`py-2 rounded-xl text-xs font-semibold transition-all tabular-nums ${
              view === id
                ? 'bg-white text-wine-700 border border-linen-200 shadow-sm'
                : 'text-ink-500 hover:text-ink-900 border border-transparent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'again' ? (
        groups.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="w-7 h-7 text-wine-700/60" />}
            title="Your aisle guide is empty"
            text="Wines marked Buy Again, Great Value, or Avoid will group here by shop so you can check at a glance."
          />
        ) : (
          <div className="space-y-3.5">
            {/* Quick Shop Jump Pills */}
            {groups.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedShop('all')}
                  className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-all ${
                    selectedShop === 'all'
                      ? 'bg-wine-700 text-white border-wine-700 font-semibold shadow-sm'
                      : 'bg-white text-ink-700 border-linen-200 hover:border-linen-300 font-medium'
                  }`}
                >
                  All shops
                </button>
                {groups.map((g) => (
                  <button
                    key={g.shop}
                    type="button"
                    onClick={() => setSelectedShop(g.shop)}
                    className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-all ${
                      selectedShop === g.shop
                        ? 'bg-wine-700 text-white border-wine-700 font-semibold shadow-sm'
                        : 'bg-white text-ink-700 border-linen-200 hover:border-linen-300 font-medium'
                    }`}
                  >
                    {g.shop}
                    {g.buyAgain.length > 0 && (
                      <span
                        className={`ml-1.5 tabular-nums ${
                          selectedShop === g.shop ? 'text-white/80' : 'text-ink-400'
                        }`}
                      >
                        {g.buyAgain.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Grouped Shop Cards */}
            {visibleGroups.map((group) => {
              const showAvoid = Boolean(expandedAvoid[group.shop]) || group.buyAgain.length === 0;
              return (
                <section key={group.shop} className="surface-card rounded-2xl overflow-hidden">
                  {/* Shop Header */}
                  <div className="px-4 py-3 bg-linen-100/70 border-b border-linen-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <ShoppingBag className="w-4 h-4 text-wine-700 flex-shrink-0" />
                      <h3 className="text-sm font-semibold text-ink-900 truncate">{group.shop}</h3>
                      <span className="text-xs text-ink-500 whitespace-nowrap tabular-nums">
                        {group.buyAgain.length > 0
                          ? `${group.buyAgain.length} to re-buy`
                          : `${group.avoid.length} to avoid`}
                      </span>
                    </div>
                    {group.shop !== NO_SHOP && (
                      <button
                        type="button"
                        onClick={() => onShopClick(group.shop)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-wine-700 hover:text-wine-900 flex-shrink-0"
                      >
                        <span>All history</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Buy Again / Great Value Bottles */}
                  {group.buyAgain.length > 0 && (
                    <ul className="divide-y divide-linen-100">
                      {group.buyAgain.map((w) => {
                        const { title, subtitle } = wineTitle(w);
                        const verdict = VERDICTS[w.coupleVerdict];
                        const typeMeta = WINE_TYPE_META[w.type] || WINE_TYPE_META.red;
                        return (
                          <li key={w.id}>
                            <button
                              type="button"
                              onClick={() => onOpen(w)}
                              className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-linen-50 transition-colors"
                            >
                              <div className="relative w-10 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-linen-100 border border-linen-200 flex items-center justify-center">
                                <span
                                  aria-hidden="true"
                                  className={`absolute left-0 top-0 bottom-0 w-[2.5px] ${typeMeta.barClass}`}
                                />
                                {w.imageUrl ? (
                                  <img src={w.imageUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
                                ) : (
                                  <WineIcon className="w-4 h-4 text-wine-400/45" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-serif text-lg font-semibold text-ink-900 leading-tight truncate">
                                  {title}
                                </p>
                                <p className="text-xs text-ink-500 truncate mt-0.5">
                                  {[subtitle, w.vintage !== 'NV' ? w.vintage : '', typeMeta.label]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                                {w.purchase?.price > 0 && (
                                  <span className="text-sm font-semibold text-ink-900 tabular-nums">
                                    {w.purchase.currency}
                                    {Number(w.purchase.price).toFixed(2)}
                                  </span>
                                )}
                                <span className={`text-[11px] font-semibold ${verdict.colorClass}`}>
                                  {verdict.shortLabel}
                                  {w.averageRating > 0 && (
                                    <span className="text-ink-700 tabular-nums">
                                      {' · '}
                                      <Star className="inline w-3 h-3 -mt-0.5 fill-champagne-gold text-champagne-gold" />{' '}
                                      {w.averageRating.toFixed(1)}
                                    </span>
                                  )}
                                </span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-ink-400 flex-shrink-0" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {/* Collapsible Avoid Section */}
                  {group.avoid.length > 0 && (
                    <div className="border-t border-rose-200/80 bg-rose-50/70">
                      {group.buyAgain.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleAvoid(group.shop)}
                          aria-expanded={showAvoid}
                          className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-rose-800 hover:text-rose-950"
                        >
                          <span className="flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Avoid at {group.shop} ({group.avoid.length})</span>
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${showAvoid ? 'rotate-180' : ''}`}
                          />
                        </button>
                      )}
                      {showAvoid && (
                        <ul className="divide-y divide-rose-200/60 border-t border-rose-200/60">
                          {group.avoid.map((w) => {
                            const { title, subtitle } = wineTitle(w);
                            const snippet =
                              w.jointNotes || w.partner1Review?.notes || w.partner2Review?.notes || '';
                            return (
                              <li key={w.id}>
                                <button
                                  type="button"
                                  onClick={() => onOpen(w)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-rose-100/50 transition-colors"
                                >
                                  <div className="w-8 h-11 flex-shrink-0 rounded-md overflow-hidden bg-white border border-rose-200 flex items-center justify-center">
                                    {w.imageUrl ? (
                                      <img src={w.imageUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
                                    ) : (
                                      <WineIcon className="w-3.5 h-3.5 text-rose-400" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-rose-950 truncate">{title}</p>
                                    <p className="text-xs text-rose-800/80 truncate">
                                      {snippet || subtitle || 'Marked Avoid'}
                                    </p>
                                  </div>
                                  {w.purchase?.price > 0 && (
                                    <span className="text-xs font-semibold text-rose-900 tabular-nums flex-shrink-0">
                                      {w.purchase.currency}
                                      {Number(w.purchase.price).toFixed(2)}
                                    </span>
                                  )}
                                  <ChevronRight className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )
      ) : toTry.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="w-7 h-7 text-wine-700/60" />}
          title="Nothing on your wishlist yet"
          text="Save bottles spotted in a shop, bookmark wines in Discover, or add one to try together later."
          action={{ label: 'Add bottle to try', onClick: onAddToWishlist }}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-xs text-ink-500 tabular-nums">
              {toTry.length} saved {toTry.length === 1 ? 'bottle' : 'bottles'}
            </span>
            <button
              type="button"
              onClick={onAddToWishlist}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl btn-secondary text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5 text-wine-700" />
              <span>Add bottle to try</span>
            </button>
          </div>
          {toTry.map((w) => (
            <div key={w.id} className="space-y-1.5">
              <WineCard
                wine={w}
                me={me}
                partner={partner}
                onClick={() => onOpen(w)}
                onShopClick={onShopClick}
              />
              {!isTasted(w) && (
                <div className="flex justify-end px-1">
                  <button
                    type="button"
                    onClick={() => onLogWishlistWine(w)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl btn-primary text-xs font-semibold"
                  >
                    <span>Log tasting</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="py-14 px-6 text-center space-y-3 surface-card rounded-2xl">
      <div className="w-14 h-14 rounded-2xl bg-linen-100 border border-linen-200 flex items-center justify-center mx-auto">
        {icon}
      </div>
      <div className="space-y-1">
        <h3 className="font-serif text-xl font-semibold text-ink-900">{title}</h3>
        <p className="text-xs text-ink-500 max-w-xs mx-auto leading-relaxed">{text}</p>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-2 px-4 py-2.5 rounded-xl btn-primary text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
}
