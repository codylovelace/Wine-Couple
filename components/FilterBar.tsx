'use client';

import React from 'react';
import { Search, X, ArrowUpDown, Store, RotateCcw } from 'lucide-react';
import { VERDICTS, Verdict } from '@/lib/types';
import { VERDICT_DOT, VERDICT_ORDER, WINE_TYPE_META, WINE_TYPES_LIST } from '@/lib/wine-meta';

export type SortOption = 'newest' | 'rating' | 'price-low' | 'price-high';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeVerdict: string;
  onSelectVerdict: (verdict: string) => void;
  activeType: string;
  onSelectType: (type: string) => void;
  activeShop: string;
  onSelectShop: (shop: string) => void;
  shops: string[];
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  verdictCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  totalFiltered: number;
  filtersActive: boolean;
  onResetFilters: () => void;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  activeVerdict,
  onSelectVerdict,
  activeType,
  onSelectType,
  activeShop,
  onSelectShop,
  shops,
  sortBy,
  onSortChange,
  verdictCounts,
  typeCounts,
  totalFiltered,
  filtersActive,
  onResetFilters,
}: FilterBarProps) {
  const verdictOptions: { id: 'all' | Verdict; label: string; dotClass?: string }[] = [
    { id: 'all', label: 'All' },
    ...VERDICT_ORDER.map((id) => ({
      id,
      label: VERDICTS[id].shortLabel,
      dotClass: VERDICT_DOT[id],
    })),
  ];

  const styleOptions = [
    { id: 'all', label: 'All Styles', dotClass: '' },
    ...WINE_TYPES_LIST.filter(
      (t) => t === 'red' || t === 'white' || t === 'rose' || t === 'sparkling' || (typeCounts[t] ?? 0) > 0 || activeType === t
    ).map((t) => ({
      id: t,
      label: WINE_TYPE_META[t].label,
      dotClass: WINE_TYPE_META[t].dotClass,
    })),
  ];

  return (
    <div className="space-y-3">
      {/* Always-visible Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search wine, producer, grape, region, or shop…"
          aria-label="Search cellar"
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

      {/* Verdict Filter Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {verdictOptions.map((opt) => {
          const isSelected = activeVerdict === opt.id;
          const count = verdictCounts[opt.id] ?? 0;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelectVerdict(opt.id)}
              aria-pressed={isSelected}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap font-sans transition-all border ${
                isSelected
                  ? 'bg-wine-700 text-white border-wine-700 font-semibold shadow-sm'
                  : 'bg-white text-ink-700 border-linen-200 hover:border-linen-300 font-medium'
              }`}
            >
              {opt.dotClass && (
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    isSelected ? 'bg-white/90' : opt.dotClass
                  }`}
                />
              )}
              <span>{opt.label}</span>
              {count > 0 && (
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full tabular-nums ${
                    isSelected ? 'bg-black/20 text-white' : 'text-ink-500'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Wine Style Filter Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {styleOptions.map((opt) => {
          const isSelected = activeType === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelectType(opt.id)}
              aria-pressed={isSelected}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap font-sans transition-all border ${
                isSelected
                  ? 'bg-linen-100 text-wine-800 border-wine-300 font-semibold'
                  : 'bg-transparent text-ink-500 border-transparent hover:text-ink-900 hover:bg-linen-100/70 font-medium'
              }`}
            >
              {opt.dotClass && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dotClass}`} />}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Results Count, Shop Filter, Sort & Reset */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-sm text-ink-700">
        <div className="flex items-center gap-2.5">
          <span className="tabular-nums text-xs sm:text-sm">
            <strong className="text-ink-900 font-semibold">{totalFiltered}</strong>{' '}
            {totalFiltered === 1 ? 'bottle' : 'bottles'}
          </span>
          {filtersActive && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-xs text-wine-700 hover:text-wine-900 font-semibold underline underline-offset-2"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {shops.length > 0 && (
            <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-linen-200 text-ink-900 shadow-sm">
              <Store className="w-3.5 h-3.5 text-wine-700 flex-shrink-0" />
              <span className="sr-only">Filter by shop</span>
              <select
                value={activeShop}
                onChange={(e) => onSelectShop(e.target.value)}
                className="bg-transparent text-xs font-medium text-ink-900 focus:outline-none cursor-pointer max-w-[115px] truncate"
              >
                <option value="all" className="bg-white text-ink-900">
                  All shops
                </option>
                {shops.map((s) => (
                  <option key={s} value={s} className="bg-white text-ink-900">
                    {s}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-linen-200 text-ink-900 shadow-sm">
            <ArrowUpDown className="w-3.5 h-3.5 text-wine-700 flex-shrink-0" />
            <span className="sr-only">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="bg-transparent text-xs font-medium text-ink-900 focus:outline-none cursor-pointer"
            >
              <option value="newest" className="bg-white text-ink-900">
                Newest
              </option>
              <option value="rating" className="bg-white text-ink-900">
                Top rated
              </option>
              <option value="price-low" className="bg-white text-ink-900">
                Price: low
              </option>
              <option value="price-high" className="bg-white text-ink-900">
                Price: high
              </option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
