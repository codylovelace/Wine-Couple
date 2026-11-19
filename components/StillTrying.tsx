'use client';

import React from 'react';

interface StillTryingProps {
  // What's happening, e.g. "Reading the label".
  label: string;
  // 1 for the first try; from 2 on, Gemini has been busy.
  attempt: number;
  onCancel: () => void;
}

// Progress for a Gemini request that keeps retrying while Gemini is busy.
export function StillTrying({ label, attempt, onCancel }: StillTryingProps) {
  return (
    <div className="space-y-2.5" role="status" aria-live="polite">
      <div className="h-1.5 rounded-full bg-cellar-950 border border-white/[0.06] overflow-hidden">
        <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-wine-600 to-champagne-gold animate-indeterminate" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-stone-200 leading-snug">
          {attempt > 1 ? (
            <>
              Gemini is busy, still trying
              <span className="text-stone-400 tabular-nums"> (attempt {attempt})</span>
            </>
          ) : (
            `${label}…`
          )}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg btn-secondary text-xs font-semibold flex-shrink-0"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
