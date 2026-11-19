'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Upload,
  X,
  RefreshCw,
  Sparkles,
  Bookmark,
  Plus,
  ExternalLink,
  ShoppingBag,
  Wine as WineIcon,
  CheckCircle2,
  AlertTriangle,
  ScanLine,
} from 'lucide-react';
import { PublicUser, VERDICTS, Wine, WineScanResult, isTasted } from '@/lib/types';
import { api, isAbort, retryWhileBusy } from '@/lib/api-client';
import { prepareBottlePhoto } from '@/lib/client-image';
import { wineTitle } from '@/lib/format';
import { canonicalShop } from '@/lib/shops';
import { WINE_TYPE_META } from '@/lib/wine-meta';
import { reviewFor } from '@/lib/wine-logic';
import { StillTrying } from '@/components/StillTrying';
import type { ShelfPrediction } from '@/app/api/shelf-check/route';

interface ShelfCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  me: PublicUser;
  partner: PublicUser | null;
  hasGeminiKey?: boolean;
  onOpenExisting: (wine: Wine) => void;
  onBoughtAgain: (wine: Wine) => void;
  onSaveToTry: (draft: Partial<Wine>) => Promise<void>;
  onLogTasted: (draft: Partial<Wine>) => void;
}

interface ShelfCheckResponse {
  scanResult: WineScanResult;
  existingWine: Wine | null;
  prediction: ShelfPrediction | null;
}

export function ShelfCheckModal({
  isOpen,
  onClose,
  me,
  partner,
  hasGeminiKey,
  onOpenExisting,
  onBoughtAgain,
  onSaveToTry,
  onLogTasted,
}: ShelfCheckModalProps) {
  const [frontPhoto, setFrontPhoto] = useState('');
  const [backPhoto, setBackPhoto] = useState('');
  const [includeBack, setIncludeBack] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [attempt, setAttempt] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShelfCheckResponse | null>(null);
  const [savingWishlist, setSavingWishlist] = useState(false);

  const frontCameraRef = useRef<HTMLInputElement>(null);
  const frontFileRef = useRef<HTMLInputElement>(null);
  const backCameraRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = () => {
    abortRef.current?.abort();
    setFrontPhoto('');
    setBackPhoto('');
    setIncludeBack(false);
    setScanning(false);
    setAttempt(1);
    setError(null);
    setResult(null);
    setSavingWishlist(false);
  };

  useEffect(() => {
    if (!isOpen) {
      abortRef.current?.abort();
      return;
    }
    reset();
  }, [isOpen]);

  useEffect(() => () => abortRef.current?.abort(), []);

  if (!isOpen) return null;

  const runCheck = async (front: string, back?: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setScanning(true);
    setAttempt(1);
    setError(null);
    try {
      const res = await retryWhileBusy(
        (signal) =>
          api<ShelfCheckResponse>('/api/shelf-check', {
            method: 'POST',
            body: { imageBase64: front, backImageBase64: back || undefined },
            signal,
          }),
        { signal: ctrl.signal, onRetry: (n) => abortRef.current === ctrl && setAttempt(n) }
      );
      if (abortRef.current !== ctrl) return;
      setResult(res);
    } catch (err) {
      if (abortRef.current !== ctrl) return;
      if (!isAbort(err) && !ctrl.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Shelf check failed. Try again.');
      }
    } finally {
      if (abortRef.current === ctrl) {
        abortRef.current = null;
        setScanning(false);
      }
    }
  };

  const handlePickFront = async (file: File) => {
    setError(null);
    try {
      const { dataUrl } = await prepareBottlePhoto(file);
      setFrontPhoto(dataUrl);
      if (!includeBack) {
        await runCheck(dataUrl);
      }
    } catch {
      setError("Couldn't read that photo. Try another shot.");
    }
  };

  const handlePickBack = async (file: File) => {
    setError(null);
    try {
      const { dataUrl } = await prepareBottlePhoto(file);
      setBackPhoto(dataUrl);
    } catch {
      setError("Couldn't read that back label photo.");
    }
  };

  const buildDraftFromScan = (scan: WineScanResult): Partial<Wine> => ({
    name: scan.name,
    producer: scan.producer,
    vintage: scan.vintage || 'NV',
    type: scan.type,
    grape: scan.grape,
    region: scan.region,
    country: scan.country,
    abv: scan.abv,
    imageUrl: frontPhoto || undefined,
    backImageUrl: backPhoto || undefined,
    aromaTags: scan.suggestedAromas,
    foodPairings: scan.foodPairings,
    body: scan.body,
    sweetness: scan.sweetness,
    tannin: scan.tannin,
    acidity: scan.acidity,
    jointNotes: scan.tastingNotesSummary ? `Label: ${scan.tastingNotesSummary}` : '',
  });

  const handleSaveToTry = async () => {
    if (!result) return;
    setSavingWishlist(true);
    try {
      await onSaveToTry(buildDraftFromScan(result.scanResult));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save to wishlist.');
      setSavingWishlist(false);
    }
  };

  const handleLogTasted = () => {
    if (!result) return;
    const draft = buildDraftFromScan(result.scanResult);
    onClose();
    onLogTasted(draft);
  };

  const predBadgeStyle = (v: ShelfPrediction['verdict']) => {
    if (v === 'great-match') return 'bg-emerald-50 border-emerald-200 text-emerald-900';
    if (v === 'worth-trying') return 'bg-sky-50 border-sky-200 text-sky-900';
    if (v === 'risky') return 'bg-amber-50 border-amber-200 text-amber-900';
    return 'bg-rose-50 border-rose-200 text-rose-900';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink-900/45 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[94dvh] bg-linen-50 border border-linen-200 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-white border-b border-linen-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-wine-50 border border-wine-200 flex items-center justify-center text-wine-700">
              <ScanLine className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif font-semibold text-xl text-ink-900 leading-tight">Shelf Check</h2>
              <p className="text-xs text-ink-500">Scan a bottle before you buy it</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-linen-100 hover:bg-linen-200 text-ink-700 flex items-center justify-center border border-linen-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans modal-footer-safe">
          {!result ? (
            <>
              <div className="text-center space-y-1 py-1">
                <h3 className="font-serif text-2xl font-semibold text-ink-900">
                  Is this bottle a winner?
                </h3>
                <p className="text-xs text-ink-500 max-w-xs mx-auto leading-relaxed">
                  {hasGeminiKey
                    ? "We'll check if you've already tried it—or predict how well it matches your shared palate."
                    : 'Add a Gemini API key in Settings to use Shelf Check in the aisle.'}
                </p>
              </div>

              {/* Optional Back Label Toggle */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl surface-card">
                <span className="text-xs font-medium text-ink-700">Include back label photo too</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={includeBack}
                  onClick={() => setIncludeBack((v) => !v)}
                  className={`w-10 h-6 rounded-full p-0.5 transition-colors ${
                    includeBack ? 'bg-wine-700' : 'bg-linen-200'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      includeBack ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {scanning ? (
                <div className="space-y-3">
                  <div className="relative h-56 rounded-2xl bg-linen-100 border border-wine-300 overflow-hidden flex flex-col items-center justify-center p-6 text-center">
                    {frontPhoto && (
                      <img src={frontPhoto} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
                    )}
                    <RefreshCw className="w-8 h-8 text-wine-700 animate-spin mb-3 z-10" />
                    <span className="font-serif text-lg font-semibold text-ink-900 z-10">
                      Checking bottle &amp; your cellar…
                    </span>
                  </div>
                  <StillTrying
                    label="Checking label against your cellar"
                    attempt={attempt}
                    onCancel={() => abortRef.current?.abort()}
                  />
                </div>
              ) : includeBack ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => frontCameraRef.current?.click()}
                      className="h-36 rounded-2xl surface-card hover:border-wine-300 overflow-hidden flex flex-col items-center justify-center gap-2 relative"
                    >
                      {frontPhoto ? (
                        <img src={frontPhoto} alt="Front label" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Camera className="w-5 h-5 text-wine-700" />
                          <span className="text-xs font-semibold text-ink-900">Front label *</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => backCameraRef.current?.click()}
                      className="h-36 rounded-2xl surface-card hover:border-wine-300 overflow-hidden flex flex-col items-center justify-center gap-2 relative"
                    >
                      {backPhoto ? (
                        <img src={backPhoto} alt="Back label" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Camera className="w-5 h-5 text-ink-500" />
                          <span className="text-xs font-semibold text-ink-700">Back label</span>
                        </>
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={!frontPhoto}
                    onClick={() => runCheck(frontPhoto, backPhoto)}
                    className="w-full py-3 rounded-xl btn-primary text-sm font-semibold disabled:opacity-50"
                  >
                    Check bottle
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => frontCameraRef.current?.click()}
                    className="p-5 rounded-2xl surface-highlight hover:border-wine-400 flex flex-col items-center justify-center gap-2.5 text-center transition-all active:scale-[0.98]"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-wine-700 text-white flex items-center justify-center shadow-sm">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-sm text-ink-900 font-semibold">Take photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => frontFileRef.current?.click()}
                    className="p-5 rounded-2xl surface-card hover:border-linen-300 flex flex-col items-center justify-center gap-2.5 text-center transition-all active:scale-[0.98]"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-linen-100 border border-linen-200 flex items-center justify-center text-ink-700">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-sm text-ink-900 font-semibold">Choose photo</span>
                  </button>
                </div>
              )}

              {error && (
                <p className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800" role="alert">
                  {error}
                </p>
              )}

              <input
                ref={frontCameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) handlePickFront(f);
                }}
              />
              <input
                ref={frontFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) handlePickFront(f);
                }}
              />
              <input
                ref={backCameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) handlePickBack(f);
                }}
              />
            </>
          ) : result.existingWine ? (
            /* MATCHED AN EXISTING CELLAR BOTTLE */
            (() => {
              const w = result.existingWine!;
              const tasted = isTasted(w);
              const vCfg = VERDICTS[w.coupleVerdict] || VERDICTS.okay;
              const { title, subtitle } = wineTitle(w);
              const shop = canonicalShop(w.purchase?.store);
              const isAvoid = tasted && w.coupleVerdict === 'bad';
              return (
                <div className="space-y-4 animate-fadeIn">
                  <div
                    className={`p-4 rounded-2xl border text-center space-y-1 ${
                      tasted ? `${vCfg.bgClass} ${vCfg.borderClass}` : 'bg-champagne-50 border-champagne-300'
                    }`}
                  >
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                      {isAvoid ? (
                        <AlertTriangle className="w-4 h-4 text-rose-700" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      )}
                      <span className={tasted ? vCfg.colorClass : 'text-champagne-700'}>
                        {tasted ? 'Already in your cellar' : 'On your To Try wishlist'}
                      </span>
                    </div>
                    <p className="font-serif text-2xl font-semibold text-ink-900">
                      {tasted ? vCfg.label : 'Saved to Try'}
                    </p>
                    {w.averageRating > 0 && (
                      <p className="text-xs font-semibold text-ink-700 tabular-nums">
                        Average rating: {w.averageRating.toFixed(1)}★
                      </p>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl surface-card flex gap-3.5 items-center">
                    <div className="w-16 h-22 rounded-xl overflow-hidden bg-linen-100 border border-linen-200 flex-shrink-0 flex items-center justify-center">
                      {w.imageUrl || frontPhoto ? (
                        <img src={w.imageUrl || frontPhoto} alt={title} className="w-full h-full object-cover" />
                      ) : (
                        <WineIcon className="w-6 h-6 text-wine-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <h3 className="font-serif text-xl font-semibold text-ink-900 leading-tight truncate">{title}</h3>
                      {subtitle && <p className="text-xs text-wine-700 font-medium truncate">{subtitle}</p>}
                      {(shop || w.purchase?.price > 0) && (
                        <p className="text-xs text-ink-500 flex items-center gap-1.5 tabular-nums">
                          <ShoppingBag className="w-3.5 h-3.5 text-wine-700" />
                          <span>
                            {[
                              shop,
                              w.purchase?.price ? `${w.purchase.currency}${Number(w.purchase.price).toFixed(2)}` : '',
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </p>
                      )}
                      {(w.stock ?? 0) > 0 && (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-wine-50 border border-wine-200 text-[11px] font-semibold text-wine-700 tabular-nums">
                          {w.stock} already at home
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Partner reviews snapshot */}
                  {tasted && (
                    <div className="grid grid-cols-2 gap-2">
                      {[me, partner]
                        .filter((p): p is PublicUser => Boolean(p))
                        .map((person) => {
                          const rev = reviewFor(w, person.slot);
                          return (
                            <div key={person.id} className="p-3 rounded-xl surface-card text-xs space-y-0.5">
                              <span className="font-semibold text-ink-900 block">
                                {person.id === me.id ? 'You' : person.name}
                              </span>
                              <span className="text-ink-500 block">
                                {rev
                                  ? `${rev.liked === true ? 'Buy Again' : rev.liked === false ? 'Pass' : 'Rated'}${
                                      rev.rating > 0 ? ` · ${rev.rating}★` : ''
                                    }`
                                  : 'Not rated yet'}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenExisting(w);
                      }}
                      className="py-3 rounded-xl btn-secondary text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open bottle</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onBoughtAgain(w);
                      }}
                      className="py-3 rounded-xl btn-primary text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Log bought again</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={reset}
                    className="w-full py-2 text-xs font-semibold text-ink-500 hover:text-wine-700"
                  >
                    Scan another bottle
                  </button>
                </div>
              );
            })()
          ) : (
            /* NEW BOTTLE + MATCH PREDICTION */
            (() => {
              const s = result.scanResult;
              const pred = result.prediction;
              const typeMeta = WINE_TYPE_META[s.type] || WINE_TYPE_META.red;
              return (
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-4 rounded-2xl surface-card flex gap-3.5">
                    <div className="w-16 h-24 rounded-xl overflow-hidden bg-linen-100 border border-linen-200 flex-shrink-0">
                      {frontPhoto ? (
                        <img src={frontPhoto} alt={s.name} className="w-full h-full object-cover" />
                      ) : (
                        <WineIcon className="w-6 h-6 text-wine-300 m-auto mt-8" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${typeMeta.dotClass}`} />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                          {typeMeta.label} {s.vintage ? `· ${s.vintage}` : ''}
                        </span>
                      </div>
                      <h3 className="font-serif text-xl font-semibold text-ink-900 leading-tight">
                        {s.name || s.producer}
                      </h3>
                      {s.producer && s.name && <p className="text-xs text-wine-700 font-medium">{s.producer}</p>}
                      <p className="text-xs text-ink-500">
                        {[s.grape, s.region, s.country].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>

                  {pred ? (
                    <div className={`p-4 rounded-2xl border space-y-2 ${predBadgeStyle(pred.verdict)}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Palate Match</span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-white/80 text-xs font-bold tabular-nums">
                          {pred.matchScore}% match
                        </span>
                      </div>
                      <p className="font-serif text-xl font-semibold">{pred.headline}</p>
                      {pred.summary && <p className="text-xs leading-relaxed opacity-90">{pred.summary}</p>}
                      {pred.similarTo.length > 0 && (
                        <p className="text-[11px] font-medium opacity-80">
                          Similar to: {pred.similarTo.join(', ')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl surface-card text-xs text-ink-500">
                      Not in your cellar yet. Rate a bottle or two together to unlock palate match predictions.
                    </div>
                  )}

                  {s.tastingNotesSummary && (
                    <p className="text-xs text-ink-700 leading-relaxed px-1">{s.tastingNotesSummary}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={savingWishlist}
                      onClick={handleSaveToTry}
                      className="py-3 rounded-xl btn-secondary text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Bookmark className="w-3.5 h-3.5 text-wine-700" />
                      <span>{savingWishlist ? 'Saving…' : 'Save to Try'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLogTasted}
                      className="py-3 rounded-xl btn-primary text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>We Tried It</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={reset}
                    className="w-full py-2 text-xs font-semibold text-ink-500 hover:text-wine-700"
                  >
                    Scan another bottle
                  </button>
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}
