'use client';

import React from 'react';

interface FilterBarProps {
  activeVerdict: string;
  onSelectVerdict: (verdict: string) => void;
  activeType: string;
  onSelectType: (type: string) => void;
  counts: Record<string, number>;
}

export function FilterBar({
  activeVerdict,
  onSelectVerdict,
  activeType,
  onSelectType,
  counts,
}: FilterBarProps) {
  const verdictOptions: { id: string; label: string }[] = [
    { id: 'all', label: 'All Cellar' },
    { id: 'good-value', label: 'Great Value' },
    { id: 'loved-it', label: 'Must Buy Again' },
    { id: 'good', label: 'Enjoyable' },
    { id: 'okay', label: 'Table Wine' },
    { id: 'bad', label: 'Avoid' },
    { id: 'special-occasion', label: 'Special Occasion' },
  ];

  const typeOptions: { id: string; label: string }[] = [
    { id: 'all', label: 'All Styles' },
    { id: 'red', label: 'Red' },
    { id: 'white', label: 'White' },
    { id: 'rose', label: 'Rosé' },
    { id: 'sparkling', label: 'Sparkling' },
  ];

  return (
    <div className="py-2 space-y-2.5">
      {/* Verdict Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-1">
        {verdictOptions.map((opt) => {
          const isSelected = activeVerdict === opt.id;
          const count = counts[opt.id] ?? 0;
          return (
            <button
              key={opt.id}
              onClick={() => onSelectVerdict(opt.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap font-sans font-medium tracking-wide transition-all ${
                isSelected
                  ? 'bg-gradient-to-r from-wine-900 to-wine-950 text-champagne-100 border border-champagne-500/45 shadow-sm font-semibold'
                  : 'bg-stone-900/60 text-stone-300 border border-white/10 hover:border-champagne-500/25 hover:text-white'
              }`}
            >
              <span>{opt.label}</span>
              {count > 0 && (
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full font-sans font-semibold ${
                    isSelected ? 'bg-black/50 text-champagne-200' : 'bg-stone-800 text-stone-300'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Wine Style Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-1 pb-1">
        {typeOptions.map((opt) => {
          const isSelected = activeType === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onSelectType(opt.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap font-sans tracking-wide transition-all ${
                isSelected
                  ? 'bg-stone-900 text-champagne-gold font-semibold border border-champagne-500/35'
                  : 'text-stone-300 hover:text-white font-medium'
              }`}
            >
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
