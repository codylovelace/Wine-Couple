'use client';

import React, { useState } from 'react';
import { UK_SHOPS, canonicalShop } from '@/lib/shops';

interface ShopPickerProps {
  value: string;
  onChange: (shop: string) => void;
  // Shops you've typed before that aren't in the main list.
  customShops: string[];
  selectClass: string;
  inputClass: string;
}

const CUSTOM = '__custom__';

// A dropdown of UK supermarkets and shops you've used before, with Custom for
// anywhere else.
export function ShopPicker({ value, onChange, customShops, selectClass, inputClass }: ShopPickerProps) {
  const canon = canonicalShop(value);
  const known = (UK_SHOPS as readonly string[]).includes(canon) || customShops.includes(canon);
  const [typing, setTyping] = useState(Boolean(value) && !known);

  return (
    <div className="space-y-2">
      <select
        value={typing ? CUSTOM : known ? canon : ''}
        onChange={(e) => {
          if (e.target.value === CUSTOM) {
            setTyping(true);
            onChange(known ? '' : value);
          } else {
            setTyping(false);
            onChange(e.target.value);
          }
        }}
        className={selectClass}
        aria-label="Shop"
      >
        <option value="">Not recorded</option>
        <optgroup label="Supermarkets and shops">
          {UK_SHOPS.map((shop) => (
            <option key={shop} value={shop}>
              {shop}
            </option>
          ))}
        </optgroup>
        {customShops.length > 0 && (
          <optgroup label="Your other shops">
            {customShops.map((shop) => (
              <option key={shop} value={shop}>
                {shop}
              </option>
            ))}
          </optgroup>
        )}
        <option value={CUSTOM}>Custom…</option>
      </select>
      {typing && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Shop name, e.g. The Wine Society"
          className={inputClass}
          autoFocus
          maxLength={100}
          aria-label="Custom shop name"
        />
      )}
    </div>
  );
}

// Shops used on these wines that aren't in the main list, most used first.
export function customShopsFrom(stores: (string | undefined)[]): string[] {
  const counts = new Map<string, number>();
  for (const raw of stores) {
    const shop = canonicalShop(raw);
    if (!shop || (UK_SHOPS as readonly string[]).includes(shop)) continue;
    counts.set(shop, (counts.get(shop) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([shop]) => shop);
}
