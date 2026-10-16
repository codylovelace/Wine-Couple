'use client';

import React, { useMemo, useState } from 'react';
import { PublicUser, VERDICTS, Wine, isTasted } from '@/lib/types';
import { wineTitle } from '@/lib/format';
import { canonicalShop, shopKey } from '@/lib/shops';
import { WineCard } from '@/components/WineCard';
import { ShoppingBag, ChevronRight, Star } from 'lucide-react';

interface ShoppingListProps {
  wines: Wine[];
  me: PublicUser;
  partner: PublicUser | null;
  onOpen: (wine: Wine) => void;
  onShopClick: (shop: string) => void;
}

const NO_SHOP = 'Shop not recorded';

// What to pick up next time you're out: wines worth buying again, grouped by
// the shop you bought them in, and the wishlist of ones to try.
export function ShoppingList({ wines, me, partner, onOpen, onShopClick }: ShoppingListProps) {
  const [view, setView] = useState<'again' | 'try'>('again');

  const groups = useMemo(() => {
    const byShop = new Map<string, { shop: string; wines: Wine[] }>();
    for (const w of wines) {
      if (!isTasted(w) || (w.coupleVerdict !== 'loved-it' && w.coupleVerdict !== 'good-value')) continue;
      const shop = canonicalShop(w.purchase?.store) || NO_SHOP;
      const key = shop === NO_SHOP ? NO_SHOP : shopKey(shop);
      if (!byShop.has(key)) byShop.set(key, { shop, wines: [] });
      byShop.get(key)!.wines.push(w);
    }
    for (const g of byShop.values()) {
      g.wines.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0) || a.name.localeCompare(b.name));
    }
    // Busiest shops first; wines with no shop recorded go last.
    return [...byShop.values()].sort((a, b) => {
      if (a.shop === NO_SHOP) return 1;
      if (b.shop === NO_SHOP) return -1;
      return b.wines.length - a.wines.length || a.shop.localeCompare(b.shop);
    });
  }, [wines]);

  const toTry = useMemo(() => wines.filter((w) => w.wishlist), [wines]);
  const buyAgainCount = groups.reduce((n, g) => n + g.wines.length, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-stone-900/70 border border-white/10" role="tablist">
        {(
          [
            ['again', `Buy again (${buyAgainCount})`],
            ['try', `To try (${toTry.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`py-2.5 rounded-xl text-sm font-semibold ${
              view === id ? 'bg-wine-900 text-champagne-100 border border-champagne-500/40' : 'text-stone-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'again' ? (
        groups.length === 0 ? (
          <Empty text="Wines you mark Must Buy Again or Great Value show up here, grouped by the shop you bought them in." />
        ) : (
          groups.map((group) => (
            <section key={group.shop} className="space-y-2">
              <h3 className="px-1 text-sm font-bold text-champagne-200">
                {group.shop === NO_SHOP ? (
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-champagne-gold" />
                    <span className="truncate">{group.shop}</span>
                    <span className="text-xs font-medium text-stone-400">{group.wines.length}</span>
                  </span>
                ) : (
                  // Opens everything bought there, not just the buy-again ones.
                  <button onClick={() => onShopClick(group.shop)} className="flex items-center gap-2 max-w-full text-left">
                    <ShoppingBag className="w-4 h-4 text-champagne-gold flex-shrink-0" />
                    <span className="truncate underline decoration-champagne-500/50 underline-offset-4">{group.shop}</span>
                    <span className="text-xs font-medium text-stone-400">{group.wines.length}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
                  </button>
                )}
              </h3>
              <ul className="rounded-2xl luxury-card divide-y divide-white/10 overflow-hidden">
                {group.wines.map((w) => {
                  const { title, subtitle } = wineTitle(w);
                  const verdict = VERDICTS[w.coupleVerdict];
                  return (
                    <li key={w.id}>
                      <button onClick={() => onOpen(w)} className="w-full flex items-center gap-3 p-3 text-left">
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold text-stone-100 truncate">{title}</span>
                          <span className="block text-xs text-stone-400 truncate">
                            {[subtitle, w.vintage !== 'NV' ? w.vintage : ''].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                        <span className="flex flex-col items-end gap-0.5 flex-shrink-0">
                          {w.purchase?.price > 0 && (
                            <span className="text-sm font-bold text-champagne-accent">
                              {w.purchase.currency}
                              {Number(w.purchase.price).toFixed(2)}
                            </span>
                          )}
                          <span className={`text-[11px] font-semibold ${verdict.colorClass}`}>
                            {verdict.shortLabel}
                            {w.averageRating > 0 && (
                              <>
                                {' · '}
                                <Star className="inline w-3 h-3 -mt-0.5 fill-champagne-gold text-champagne-gold" /> {w.averageRating.toFixed(1)}
                              </>
                            )}
                          </span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-stone-500 flex-shrink-0" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )
      ) : toTry.length === 0 ? (
        <Empty text="Tap the bookmark on any wine, or add ideas from For You." />
      ) : (
        <div className="space-y-3">
          {toTry.map((w) => (
            <WineCard key={w.id} wine={w} me={me} partner={partner} onClick={() => onOpen(w)} />
          ))}
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-12 px-6 text-center text-sm text-stone-300 leading-relaxed">{text}</p>;
}
