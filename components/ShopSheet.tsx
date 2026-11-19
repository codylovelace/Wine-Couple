'use client';

import React, { useMemo, useState } from 'react';
import { PublicUser, Wine, isTasted } from '@/lib/types';
import { shopKey } from '@/lib/shops';
import { WineCard } from '@/components/WineCard';
import { ShoppingBag, X } from 'lucide-react';

interface ShopSheetProps {
  shop: string;
  wines: Wine[];
  me: PublicUser;
  partner: PublicUser | null;
  onOpenWine: (wine: Wine) => void;
  onClose: () => void;
}

// Every wine you've bought at one shop, newest purchase first.
export function ShopSheet({ shop, wines, me, partner, onOpenWine, onClose }: ShopSheetProps) {
  const [filter, setFilter] = useState<'all' | 'again' | 'avoid'>('all');
  const key = shopKey(shop);

  const bought = useMemo(
    () =>
      wines
        .filter((w) => shopKey(w.purchase?.store) === key)
        .sort((a, b) => (b.purchase?.date || b.createdAt).localeCompare(a.purchase?.date || a.createdAt)),
    [wines, key]
  );

  const tasted = bought.filter(isTasted);
  const buyAgainWines = tasted.filter((w) => w.coupleVerdict === 'loved-it' || w.coupleVerdict === 'good-value');
  const avoidWines = tasted.filter((w) => w.coupleVerdict === 'bad');

  // Totals per currency, in case some were bought abroad.
  const spent = new Map<string, number>();
  for (const w of bought) {
    if (w.purchase?.price > 0) {
      spent.set(w.purchase.currency || '£', (spent.get(w.purchase.currency || '£') ?? 0) + Number(w.purchase.price));
    }
  }
  const spentLabel = [...spent].map(([cur, total]) => `${cur}${total.toFixed(0)}`).join(' · ');

  const visible =
    filter === 'again' ? buyAgainWines : filter === 'avoid' ? avoidWines : bought;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink-900/45 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[92dvh] bg-linen-50 border border-linen-200 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 bg-white border-b border-linen-200 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-serif font-semibold text-2xl text-ink-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-wine-700 flex-shrink-0" />
                <span className="truncate">{shop}</span>
              </h2>
              <p className="text-xs text-ink-500 mt-0.5 tabular-nums">
                {bought.length} bottle{bought.length === 1 ? '' : 's'} logged
                {spentLabel ? ` · ${spentLabel} total` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 rounded-full bg-linen-100 hover:bg-linen-200 text-ink-700 flex items-center justify-center border border-linen-200 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Summary KPI Pills */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="px-2.5 py-2 rounded-xl bg-linen-50 border border-linen-200">
              <span className="block text-sm font-semibold text-ink-900 tabular-nums">{bought.length}</span>
              <span className="block text-[11px] text-ink-500">Bottles</span>
            </div>
            <div className="px-2.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="block text-sm font-semibold text-emerald-800 tabular-nums">{buyAgainWines.length}</span>
              <span className="block text-[11px] text-emerald-700">Buy Again</span>
            </div>
            <div className="px-2.5 py-2 rounded-xl bg-rose-50 border border-rose-200">
              <span className="block text-sm font-semibold text-rose-800 tabular-nums">{avoidWines.length}</span>
              <span className="block text-[11px] text-rose-700">Avoid</span>
            </div>
          </div>

          {/* Quick Filter Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-linen-100 border border-linen-200">
            {(
              [
                ['all', `All (${bought.length})`],
                ['again', `Buy Again (${buyAgainWines.length})`],
                ['avoid', `Avoid (${avoidWines.length})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`py-1.5 rounded-lg text-xs font-medium transition-colors tabular-nums ${
                  filter === id
                    ? 'bg-white text-wine-700 font-semibold shadow-sm'
                    : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 modal-footer-safe">
          {visible.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink-500">
              {filter === 'all' ? `No wines recorded from ${shop} yet.` : `No matching bottles from ${shop}.`}
            </p>
          ) : (
            visible.map((w) => (
              <WineCard key={w.id} wine={w} me={me} partner={partner} onClick={() => onOpenWine(w)} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
