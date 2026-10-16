'use client';

import React, { useMemo } from 'react';
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
  const key = shopKey(shop);
  const bought = useMemo(
    () =>
      wines
        .filter((w) => shopKey(w.purchase?.store) === key)
        .sort((a, b) => (b.purchase?.date || b.createdAt).localeCompare(a.purchase?.date || a.createdAt)),
    [wines, key]
  );

  const tasted = bought.filter(isTasted);
  const again = tasted.filter((w) => w.coupleVerdict === 'loved-it' || w.coupleVerdict === 'good-value').length;
  // Totals per currency, in case some were bought abroad.
  const spent = new Map<string, number>();
  for (const w of bought) {
    if (w.purchase?.price > 0) spent.set(w.purchase.currency || '£', (spent.get(w.purchase.currency || '£') ?? 0) + Number(w.purchase.price));
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg max-h-[94dvh] bg-[#0f0a0d] border border-champagne-500/25 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-slideUp">
        <div className="p-4 border-b border-champagne-500/15 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-serif font-semibold text-xl text-stone-100 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-champagne-gold flex-shrink-0" />
              <span className="truncate">{shop}</span>
            </h2>
            <p className="text-xs text-stone-300 mt-0.5">
              {bought.length} wine{bought.length === 1 ? '' : 's'}
              {again > 0 && ` · ${again} worth buying again`}
              {[...spent].map(([cur, total]) => ` · ${cur}${total.toFixed(2)} spent`).join('')}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-stone-900 text-stone-300 hover:text-white flex items-center justify-center border border-white/10 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 modal-footer-safe">
          {bought.length === 0 ? (
            <p className="py-12 text-center text-sm text-stone-300">No wines recorded from {shop} yet.</p>
          ) : (
            bought.map((w) => <WineCard key={w.id} wine={w} me={me} partner={partner} onClick={() => onOpenWine(w)} />)
          )}
        </div>
      </div>
    </div>
  );
}
