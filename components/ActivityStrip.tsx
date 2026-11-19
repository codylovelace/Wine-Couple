'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronDown, ChevronRight, Check, MessageCircle, Heart, Wine as WineIcon } from 'lucide-react';
import { PublicUser, VERDICTS, Wine } from '@/lib/types';
import { timeAgo, wineTitle } from '@/lib/format';
import { reviewStatus } from '@/lib/wine-logic';

interface ActivityStripProps {
  wines: Wine[];
  me: PublicUser;
  partner: PublicUser | null;
  onOpenWine: (wine: Wine) => void;
}

interface ActivityEvent {
  id: string;
  wine: Wine;
  kind: 'logged' | 'rated' | 'comment';
  label: string;
  createdAt: string;
  ts: number;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const INITIAL_LOOKBACK_MS = 48 * 60 * 60 * 1000;

export function ActivityStrip({ wines, me, partner, onOpenWine }: ActivityStripProps) {
  const storageKey = `vino_last_seen_${me.id}`;
  const [lastSeenMs, setLastSeenMs] = useState<number>(() => Date.now());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = Number(stored);
        if (Number.isFinite(parsed) && parsed > 0) {
          setLastSeenMs(parsed);
          return;
        }
      }
      const fallback = Date.now() - INITIAL_LOOKBACK_MS;
      window.localStorage.setItem(storageKey, String(fallback));
      setLastSeenMs(fallback);
    } catch {
      setLastSeenMs(Date.now() - INITIAL_LOOKBACK_MS);
    }
  }, [storageKey]);

  const events = useMemo(() => {
    if (!partner) return [];
    const now = Date.now();
    const minTs = Math.max(lastSeenMs, now - SEVEN_DAYS_MS);
    const list: ActivityEvent[] = [];

    for (const w of wines) {
      const { title } = wineTitle(w);

      for (const c of w.comments ?? []) {
        if (c.authorId !== partner.id) continue;
        const ts = Date.parse(c.createdAt);
        if (!Number.isFinite(ts) || ts <= minTs) continue;
        const snippet = c.text.length > 50 ? `${c.text.slice(0, 47)}…` : c.text;
        list.push({
          id: `comment-${c.id}`,
          wine: w,
          kind: 'comment',
          label: `${partner.name} commented on ${title}: "${snippet}"`,
          createdAt: c.createdAt,
          ts,
        });
      }

      const createdTs = Date.parse(w.createdAt);
      if (w.createdBy === partner.id && Number.isFinite(createdTs) && createdTs > minTs) {
        list.push({
          id: `logged-${w.id}`,
          wine: w,
          kind: 'logged',
          label: `${partner.name} logged ${title}`,
          createdAt: w.createdAt,
          ts: createdTs,
        });
      }

      const updatedTs = Date.parse(w.updatedAt);
      if (
        w.updatedBy === partner.id &&
        w.updatedAt !== w.createdAt &&
        Number.isFinite(updatedTs) &&
        updatedTs > minTs
      ) {
        const pRated = reviewStatus(w, partner.slot) === 'rated';
        const verdictLabel = VERDICTS[w.coupleVerdict]?.shortLabel;
        list.push({
          id: `rated-${w.id}-${w.updatedAt}`,
          wine: w,
          kind: 'rated',
          label: pRated
            ? `${partner.name} rated ${title}${verdictLabel ? ` · ${verdictLabel}` : ''}`
            : `${partner.name} updated ${title}`,
          createdAt: w.updatedAt,
          ts: updatedTs,
        });
      }
    }

    return list.sort((a, b) => b.ts - a.ts).slice(0, 6);
  }, [wines, partner, lastSeenMs]);

  if (!partner || events.length === 0) return null;

  const markRead = () => {
    const now = Date.now();
    setLastSeenMs(now);
    setExpanded(false);
    try {
      window.localStorage.setItem(storageKey, String(now));
    } catch {
      // ignore storage quota errors
    }
  };

  return (
    <section className="surface-highlight rounded-2xl overflow-hidden animate-fadeIn">
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="flex items-center gap-2 min-w-0 text-left flex-1"
        >
          <span className="w-7 h-7 rounded-lg bg-wine-700 text-white flex items-center justify-center flex-shrink-0">
            <Bell className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-semibold text-ink-900 truncate">
            {events.length} new update{events.length === 1 ? '' : 's'} from {partner.name}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-wine-700 flex-shrink-0 transition-transform ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        <button
          type="button"
          onClick={markRead}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-linen-100 border border-linen-200 text-[11px] font-semibold text-ink-700 flex-shrink-0"
        >
          <Check className="w-3 h-3 text-emerald-600" />
          <span>Mark read</span>
        </button>
      </div>

      {expanded && (
        <ul className="border-t border-wine-200/60 divide-y divide-wine-100 bg-white/80">
          {events.map((ev) => (
            <li key={ev.id}>
              <button
                type="button"
                onClick={() => onOpenWine(ev.wine)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2.5 text-left hover:bg-linen-50 transition-colors"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  {ev.kind === 'comment' ? (
                    <MessageCircle className="w-3.5 h-3.5 text-wine-700 flex-shrink-0" />
                  ) : ev.kind === 'rated' ? (
                    <Heart className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <WineIcon className="w-3.5 h-3.5 text-wine-700 flex-shrink-0" />
                  )}
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-ink-900 truncate">{ev.label}</span>
                    <span className="block text-[11px] text-ink-400">{timeAgo(ev.createdAt)}</span>
                  </span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-ink-400 flex-shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
