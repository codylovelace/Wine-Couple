'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Heart, X, Wine as WineIcon, ShoppingBag, MapPin } from 'lucide-react';
import { WineType } from '@/lib/types';
import { WINE_TYPE_META } from '@/lib/wine-meta';

export type SwipeChoice = 'liked' | 'disliked';

interface SwipeVerdictProps {
  // Who's rating, e.g. "Cody".
  taster: string;
  imageUrl?: string;
  name?: string;
  producer?: string;
  vintage?: string;
  wineType?: WineType;
  grape?: string;
  region?: string;
  shop?: string;
  price?: string;
  onChoose: (choice: SwipeChoice) => void;
  onNotTasted: () => void;
}

// How far (px) the card must travel before a release counts as a swipe, and
// the fling speed (px/ms) that counts even when the drag was shorter.
const SWIPE_DISTANCE = 100;
const SWIPE_VELOCITY = 0.5;
const FLY_OUT_MS = 220;

export function SwipeVerdict({
  taster,
  imageUrl,
  name,
  producer,
  vintage,
  wineType,
  grape,
  region,
  shop,
  price,
  onChoose,
  onNotTasted,
}: SwipeVerdictProps) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<SwipeChoice | null>(null);
  const start = useRef<{ x: number; t: number } | null>(null);
  const last = useRef<{ x: number; t: number } | null>(null);

  const choose = (choice: SwipeChoice) => {
    if (leaving) return;
    setLeaving(choice);
    setDx(choice === 'liked' ? 480 : -480);
    window.setTimeout(() => onChoose(choice), FLY_OUT_MS);
  };

  // Arrow keys for anyone using a keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
      if (e.key === 'ArrowRight') choose('liked');
      if (e.key === 'ArrowLeft') choose('disliked');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (leaving) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, t: e.timeStamp };
    last.current = start.current;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !start.current) return;
    last.current = { x: e.clientX, t: e.timeStamp };
    setDx(e.clientX - start.current.x);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !start.current) return;
    setDragging(false);
    const moved = e.clientX - start.current.x;
    const prev = last.current ?? start.current;
    const dt = Math.max(1, e.timeStamp - prev.t);
    const velocity = (e.clientX - prev.x) / dt;
    start.current = null;

    if (moved > SWIPE_DISTANCE || (moved > 30 && velocity > SWIPE_VELOCITY)) choose('liked');
    else if (moved < -SWIPE_DISTANCE || (moved < -30 && velocity < -SWIPE_VELOCITY)) choose('disliked');
    else setDx(0);
  };

  // 0..1 strength of the BUY AGAIN / PASS stamp as the card moves.
  const likeStrength = Math.min(1, Math.max(0, dx / SWIPE_DISTANCE));
  const nopeStrength = Math.min(1, Math.max(0, -dx / SWIPE_DISTANCE));
  const typeMeta = wineType ? WINE_TYPE_META[wineType] : null;
  const purchaseLine = [shop, price].filter(Boolean).join(' · ');
  const originLine = [grape, region].filter(Boolean).join(' · ');
  const hasPhoto = Boolean(imageUrl);

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-wine-700 text-xs font-bold text-white flex items-center justify-center">
            {taster.charAt(0).toUpperCase()}
          </span>
          <h3 className="font-serif text-2xl text-ink-900 font-semibold">
            {taster}, would you buy it again?
          </h3>
        </div>
        <p className="text-xs text-ink-500 font-sans">
          Swipe right to buy again, left to pass.
        </p>
      </div>

      <div className="relative h-[38dvh] min-h-[240px] max-h-[390px] select-none">
        <div
          role="group"
          aria-label={`${taster}: swipe right to buy again, left to pass`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          // pan-y keeps vertical scrolling of the sheet working while
          // horizontal drags come to us.
          style={{
            touchAction: 'pan-y',
            transform: `translateX(${dx}px) rotate(${dx / 18}deg)`,
            transition: dragging ? 'none' : `transform ${FLY_OUT_MS}ms ease-out`,
          }}
          className={`absolute inset-0 rounded-3xl overflow-hidden border border-linen-200 shadow-elevated cursor-grab active:cursor-grabbing ${
            hasPhoto ? 'bg-ink-900' : 'bg-linen-100'
          }`}
        >
          {typeMeta && (
            <span
              aria-hidden="true"
              className={`absolute left-0 top-0 bottom-0 w-1.5 z-10 ${typeMeta.barClass}`}
            />
          )}

          {hasPhoto ? (
            <img
              src={imageUrl}
              alt={name || 'Bottle'}
              draggable={false}
              className="w-full h-full object-cover pointer-events-none"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-white to-linen-100">
              <WineIcon className="w-16 h-16 text-wine-300" />
            </div>
          )}

          {/* Subtle top pills for style & purchase context */}
          {(typeMeta || purchaseLine) && (
            <div className="absolute top-3.5 left-4 right-3.5 flex items-center justify-between gap-2 pointer-events-none">
              {typeMeta ? (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md border text-[11px] font-medium ${
                    hasPhoto
                      ? 'bg-ink-900/75 border-white/15 text-white'
                      : 'bg-white/90 border-linen-200 text-ink-900 shadow-sm'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${typeMeta.dotClass}`} />
                  {typeMeta.label}
                </span>
              ) : (
                <span />
              )}
              {purchaseLine && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md border text-[11px] font-medium tabular-nums max-w-[65%] truncate ${
                    hasPhoto
                      ? 'bg-ink-900/75 border-white/15 text-white'
                      : 'bg-white/90 border-linen-200 text-ink-900 shadow-sm'
                  }`}
                >
                  <ShoppingBag className={`w-3 h-3 flex-shrink-0 ${hasPhoto ? 'text-champagne-300' : 'text-wine-700'}`} />
                  <span className="truncate">{purchaseLine}</span>
                </span>
              )}
            </div>
          )}

          {/* Bottom title overlay */}
          <div
            className={`absolute inset-x-0 bottom-0 p-4 pt-12 pointer-events-none space-y-0.5 ${
              hasPhoto
                ? 'bg-gradient-to-t from-black/90 via-black/60 to-transparent'
                : 'bg-gradient-to-t from-linen-100 via-linen-100/90 to-transparent'
            }`}
          >
            <p className={`font-serif text-2xl font-semibold leading-tight truncate ${hasPhoto ? 'text-white' : 'text-ink-900'}`}>
              {name || 'This bottle'}
            </p>
            {(producer || vintage) && (
              <p className={`text-xs font-sans truncate ${hasPhoto ? 'text-champagne-200' : 'text-wine-700 font-medium'}`}>
                {[producer, vintage && vintage !== 'NV' ? vintage : vintage].filter(Boolean).join(' · ')}
              </p>
            )}
            {originLine && (
              <p className={`flex items-center gap-1 text-[11px] font-sans truncate pt-0.5 ${hasPhoto ? 'text-stone-200' : 'text-ink-500'}`}>
                <MapPin className={`w-3 h-3 flex-shrink-0 ${hasPhoto ? 'text-champagne-300' : 'text-ink-400'}`} />
                <span className="truncate">{originLine}</span>
              </p>
            )}
          </div>

          <span
            style={{ opacity: likeStrength }}
            className="absolute top-12 left-5 -rotate-12 px-3 py-1 rounded-xl bg-white/95 border-2 border-emerald-600 text-emerald-700 font-sans font-extrabold text-xl tracking-wider pointer-events-none shadow-lg"
          >
            BUY AGAIN
          </span>
          <span
            style={{ opacity: nopeStrength }}
            className="absolute top-12 right-5 rotate-12 px-3 py-1 rounded-xl bg-white/95 border-2 border-rose-600 text-rose-700 font-sans font-extrabold text-xl tracking-wider pointer-events-none shadow-lg"
          >
            PASS
          </span>
        </div>
      </div>

      {/* Tactile Choice Buttons */}
      <div className="flex items-center justify-center gap-10 pt-1">
        <button
          type="button"
          onClick={() => choose('disliked')}
          aria-label={`${taster} would pass`}
          className="group flex flex-col items-center gap-1.5"
        >
          <span className="w-16 h-16 rounded-full bg-white border-2 border-rose-300 group-hover:border-rose-500 group-hover:bg-rose-50 text-rose-600 flex items-center justify-center shadow-sm active:scale-95 transition-all">
            <X className="w-7 h-7" />
          </span>
          <span className="text-[11px] font-semibold text-ink-500 group-hover:text-rose-700">Pass</span>
        </button>

        <button
          type="button"
          onClick={() => choose('liked')}
          aria-label={`${taster} would buy again`}
          className="group flex flex-col items-center gap-1.5"
        >
          <span className="w-16 h-16 rounded-full bg-white border-2 border-emerald-300 group-hover:border-emerald-500 group-hover:bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm active:scale-95 transition-all">
            <Heart className="w-7 h-7" />
          </span>
          <span className="text-[11px] font-semibold text-ink-500 group-hover:text-emerald-700">Buy Again</span>
        </button>
      </div>

      <button
        type="button"
        onClick={onNotTasted}
        className="w-full py-1 text-center text-xs text-ink-500 hover:text-wine-700 font-sans font-medium transition-colors"
      >
        I didn&apos;t taste this one
      </button>
    </div>
  );
}
