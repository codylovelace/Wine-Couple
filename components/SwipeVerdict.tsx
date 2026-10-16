'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Heart, X, Wine as WineIcon } from 'lucide-react';

export type SwipeChoice = 'liked' | 'disliked';

interface SwipeVerdictProps {
  // Whose turn it is, e.g. "Cody".
  taster: string;
  imageUrl?: string;
  name?: string;
  producer?: string;
  vintage?: string;
  onChoose: (choice: SwipeChoice) => void;
  onNotTasted: () => void;
}

// How far (px) the card must travel before a release counts as a swipe, and
// the fling speed (px/ms) that counts even when the drag was shorter.
const SWIPE_DISTANCE = 100;
const SWIPE_VELOCITY = 0.5;
const FLY_OUT_MS = 220;

export function SwipeVerdict({ taster, imageUrl, name, producer, vintage, onChoose, onNotTasted }: SwipeVerdictProps) {
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

  // 0..1 strength of the like / nope stamp as the card moves.
  const likeStrength = Math.min(1, Math.max(0, dx / SWIPE_DISTANCE));
  const nopeStrength = Math.min(1, Math.max(0, -dx / SWIPE_DISTANCE));

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-champagne-950 border border-champagne-500/35 text-xs font-bold text-champagne-accent flex items-center justify-center">
            {taster.charAt(0)}
          </span>
          <h3 className="font-serif text-xl text-white font-semibold">{taster}, did you like it?</h3>
        </div>
        <p className="text-xs text-stone-300 font-sans">
          Swipe right if you&apos;d buy it again, left if you wouldn&apos;t.
        </p>
      </div>

      <div className="relative h-[36dvh] min-h-[220px] max-h-[380px] select-none">
        <div
          role="group"
          aria-label={`${taster}: swipe right if you liked it, left if you didn't`}
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
          className="absolute inset-0 rounded-3xl overflow-hidden bg-black border border-champagne-500/30 shadow-2xl cursor-grab active:cursor-grabbing"
        >
          {imageUrl ? (
            <img src={imageUrl} alt={name || 'Bottle'} draggable={false} className="w-full h-full object-cover pointer-events-none" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <WineIcon className="w-16 h-16 text-champagne-500/30" />
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none">
            <p className="font-serif text-2xl text-white font-semibold leading-tight truncate">
              {name || 'This bottle'}
            </p>
            {(producer || vintage) && (
              <p className="text-xs text-champagne-200 font-sans truncate">
                {[producer, vintage].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          <span
            style={{ opacity: likeStrength }}
            className="absolute top-5 left-5 -rotate-12 px-3 py-1 rounded-xl border-4 border-emerald-400 text-emerald-300 font-sans font-extrabold text-2xl tracking-wider pointer-events-none"
          >
            LIKED
          </span>
          <span
            style={{ opacity: nopeStrength }}
            className="absolute top-5 right-5 rotate-12 px-3 py-1 rounded-xl border-4 border-rose-400 text-rose-300 font-sans font-extrabold text-2xl tracking-wider pointer-events-none"
          >
            NOPE
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-8">
        <button
          type="button"
          onClick={() => choose('disliked')}
          aria-label={`${taster} didn't like it`}
          className="w-16 h-16 rounded-full bg-stone-900 border-2 border-rose-500/60 text-rose-300 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          <X className="w-7 h-7" />
        </button>
        <button
          type="button"
          onClick={() => choose('liked')}
          aria-label={`${taster} liked it`}
          className="w-16 h-16 rounded-full bg-stone-900 border-2 border-emerald-500/60 text-emerald-300 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          <Heart className="w-7 h-7" />
        </button>
      </div>

      <button
        type="button"
        onClick={onNotTasted}
        className="w-full py-1 text-center text-xs text-stone-300 hover:text-champagne-200 font-sans font-medium"
      >
        {taster} didn&apos;t taste this one
      </button>
    </div>
  );
}
