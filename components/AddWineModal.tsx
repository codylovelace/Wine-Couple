'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Wine,
  WineType,
  Verdict,
  VERDICTS,
  UserSettings,
  WineScanResult,
  PublicUser,
  isTasted,
  verdictFromSwipes,
} from '@/lib/types';
import { reviewFor, reviewStatus, SharedWineFields } from '@/lib/wine-logic';
import { WineSubmission, api, isAbort, retryWhileBusy } from '@/lib/api-client';
import { WINE_TYPE_META, WINE_TYPES_LIST, VERDICT_ORDER } from '@/lib/wine-meta';
import { canonicalShop } from '@/lib/shops';
import { StillTrying } from '@/components/StillTrying';
import { SwipeVerdict, SwipeChoice } from '@/components/SwipeVerdict';
import {
  X,
  Camera,
  Upload,
  Sparkles,
  Star,
  Store,
  Check,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Heart,
  Wine as WineIcon,
  Bookmark,
} from 'lucide-react';
import { POPULAR_AROMAS } from '@/lib/wine-search-links';
import { ShopPicker } from '@/components/ShopPicker';
import { prepareBottlePhoto } from '@/lib/client-image';

interface AddWineModalProps {
  isOpen: boolean;
  onClose: () => void;
  me: PublicUser;
  partner: PublicUser | null;
  settings: UserSettings;
  // An existing wine: edit it, or log a tasting of an untasted wishlist pick.
  editingWine?: Wine | null;
  // Details to start a brand-new wine from (e.g. a recommendation).
  draft?: Partial<Wine> | null;
  // Start in tasting mode or wishlist ("Save to try") mode.
  initialMode?: 'tasted' | 'wishlist';
  // Resolves when saved; throws with a message to show if it wasn't.
  onSubmit: (submission: WineSubmission, existingId?: string) => Promise<void>;
  // Shops you've used before that aren't in the dropdown's main list.
  customShops: string[];
  // Most frequently used shops for 1-tap quick chips.
  popularShops?: string[];
}

const today = () => new Date().toISOString().split('T')[0];

const inputClass = 'w-full mt-1 px-3 py-2.5 text-sm field-input';
const labelClass = 'text-[11px] text-stone-400 uppercase font-sans font-semibold tracking-wider';

export function AddWineModal({
  isOpen,
  onClose,
  me,
  partner,
  settings,
  editingWine,
  draft,
  initialMode = 'tasted',
  onSubmit,
  customShops,
  popularShops = [],
}: AddWineModalProps) {
  // photo -> your swipe -> details (wishlist skips swipe)
  const [step, setStep] = useState<'photo' | 'verdict' | 'details'>('photo');
  const [mode, setMode] = useState<'tasted' | 'wishlist'>(initialMode);
  const [showMoreDetails, setShowMoreDetails] = useState(true);

  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  // Which try the label scan is on; above 1 means Gemini has been busy.
  const [scanAttempt, setScanAttempt] = useState(1);
  // Set from the moment a photo is picked, so Cancel works while it's being
  // prepared as well as while Gemini is busy.
  const scanAbort = useRef<AbortController | null>(null);

  // Stop retrying a scan when the form closes, or when you skip ahead to
  // type the details yourself.
  useEffect(() => {
    if (!isOpen || step !== 'photo') scanAbort.current?.abort();
  }, [isOpen, step]);
  useEffect(() => () => scanAbort.current?.abort(), []);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Wine (shared by both of you)
  const [name, setName] = useState('');
  const [producer, setProducer] = useState('');
  const [vintage, setVintage] = useState('');
  const [type, setType] = useState<WineType>('red');
  const [grape, setGrape] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [abv, setAbv] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [store, setStore] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState(settings.defaultCurrency || '£');
  const [boughtOn, setBoughtOn] = useState(today());
  const [jointNotes, setJointNotes] = useState('');
  const [selectedAromas, setSelectedAromas] = useState<string[]>([]);
  const [foodPairings, setFoodPairings] = useState<string[]>([]);
  // Only set when the label scan read them; there's no manual entry for these.
  const [scanProfile, setScanProfile] = useState<Pick<Wine, 'body' | 'sweetness' | 'tannin' | 'acidity'> | null>(null);

  // Couple verdict: follows the swipes until someone picks one by hand.
  const [pickedVerdict, setPickedVerdict] = useState<Verdict | null>(null);
  const [unpinVerdict, setUnpinVerdict] = useState(false);

  // Your own review. The partner's is theirs to add from their own phone.
  const [myTasted, setMyTasted] = useState(true);
  const [myLiked, setMyLiked] = useState<boolean | undefined>(undefined);
  const [myRating, setMyRating] = useState(0);
  const [myNotes, setMyNotes] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const editing = Boolean(editingWine && isTasted(editingWine));
  const loggingWishlistPick = Boolean(editingWine && !isTasted(editingWine));

  useEffect(() => {
    if (!isOpen) return;
    const source: Partial<Wine> = editingWine ?? draft ?? {};
    setName(source.name ?? '');
    setProducer(source.producer ?? '');
    setVintage(source.vintage ?? '');
    setType(source.type ?? 'red');
    setGrape(source.grape ?? '');
    setRegion(source.region ?? '');
    setCountry(source.country ?? '');
    setAbv(source.abv ?? '');
    setImageUrl(source.imageUrl ?? '');
    setStore(source.purchase?.store ?? '');
    setPrice(source.purchase?.price ? String(source.purchase.price) : '');
    setCurrency(source.purchase?.currency || settings.defaultCurrency || '£');
    setBoughtOn(source.purchase?.date || today());
    setJointNotes(source.jointNotes ?? '');
    setSelectedAromas(source.aromaTags ?? []);
    setFoodPairings(source.foodPairings ?? []);
    setScanProfile(null);
    setPickedVerdict(null);
    setUnpinVerdict(false);

    const mine = editingWine ? reviewFor(editingWine, me.slot) : undefined;
    setMyTasted(!editingWine || reviewStatus(editingWine, me.slot) !== 'not-tasted');
    setMyLiked(mine?.liked);
    setMyRating(mine?.rating ?? 0);
    setMyNotes(mine?.notes ?? '');

    setScanned(false);
    setScanMessage(null);
    setSaveError(null);
    setSaving(false);

    // Editing or logging an existing wishlist pick is always in 'tasted' mode.
    const nextMode = editingWine ? 'tasted' : initialMode;
    setMode(nextMode);
    setShowMoreDetails(true);
    // Editing goes straight to the form; a wishlist pick or recommendation
    // already has its details, so it starts at the swipe.
    setStep(editing ? 'details' : editingWine || draft ? 'verdict' : 'photo');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingWine, draft, isOpen, initialMode]);

  if (!isOpen) return null;

  const partnerReview = editingWine && partner ? reviewFor(editingWine, partner.slot) : undefined;
  const partnerStatus = editingWine && partner ? reviewStatus(editingWine, partner.slot) : 'pending';
  const pinned = Boolean(editingWine?.verdictPinned) && !unpinVerdict;
  const autoVerdict =
    verdictFromSwipes(myTasted ? myLiked : undefined, partnerReview?.liked) ?? editingWine?.coupleVerdict;
  const shownVerdict: Verdict | undefined = pickedVerdict ?? (pinned ? editingWine?.coupleVerdict : autoVerdict);

  const applyScanResult = (r: WineScanResult) => {
    // Only overwrite fields the scan actually found; blanks stay for manual entry.
    if (r.name) setName(r.name);
    if (r.producer) setProducer(r.producer);
    if (r.vintage) setVintage(r.vintage);
    if (r.type) setType(r.type);
    if (r.grape) setGrape(r.grape);
    if (r.region) setRegion(r.region);
    if (r.country) setCountry(r.country);
    if (r.abv) setAbv(r.abv);
    if (r.suggestedAromas?.length) setSelectedAromas(r.suggestedAromas);
    if (r.foodPairings?.length) setFoodPairings(r.foodPairings);
    if (r.body || r.sweetness || r.tannin || r.acidity) {
      setScanProfile({ body: r.body, sweetness: r.sweetness, tannin: r.tannin, acidity: r.acidity });
    }
    if (r.tastingNotesSummary) setJointNotes((prev) => prev || `Label: ${r.tastingNotesSummary}`);
  };

  const handleImageFile = async (file: File) => {
    const ctrl = startScan();

    let dataUrl: string;
    try {
      // The resized JPEG data URL is used for the preview and the scan, and is
      // sent with the wine on save; the server writes it to the photos volume.
      dataUrl = (await prepareBottlePhoto(file)).dataUrl;
    } catch (err) {
      console.error('Could not read photo:', err);
      finishScan(ctrl, "Couldn't read that photo. Try another one, or enter the details by hand.");
      return;
    }
    if (ctrl.signal.aborted) return finishScan(ctrl, 'Scan cancelled.');
    setImageUrl(dataUrl);

    if (!settings.hasGeminiKey) {
      finishScan(ctrl, null);
      setStep(mode === 'wishlist' ? 'details' : 'verdict');
      return;
    }
    await scanLabel(dataUrl, ctrl);
  };

  const startScan = () => {
    scanAbort.current?.abort();
    const ctrl = new AbortController();
    scanAbort.current = ctrl;
    setIsScanning(true);
    setScanned(false);
    setScanMessage(null);
    setScanAttempt(1);
    return ctrl;
  };

  const finishScan = (ctrl: AbortController, message: string | null) => {
    // A newer scan has taken over; leave its state alone.
    if (scanAbort.current !== ctrl) return;
    scanAbort.current = null;
    setScanMessage(message);
    setIsScanning(false);
  };

  // Reads the label, retrying for as long as Gemini is busy. Only moves on
  // once the label is read; on a real failure or Cancel it stays on the photo.
  const scanLabel = async (dataUrl: string, ctrl = startScan()) => {
    try {
      const { scanResult } = await retryWhileBusy(
        (signal) =>
          api<{ scanResult: WineScanResult }>('/api/scan-wine', {
            method: 'POST',
            body: { imageBase64: dataUrl },
            signal,
          }),
        { signal: ctrl.signal, onRetry: (attempt) => scanAbort.current === ctrl && setScanAttempt(attempt) }
      );
      if (scanAbort.current !== ctrl) return;
      applyScanResult(scanResult);
      setScanned(true);
      // Auto-collapse extra fields only after a fresh scan so the form stays super crisp.
      if (!editing) setShowMoreDetails(false);
      finishScan(ctrl, null);
      setStep(mode === 'wishlist' ? 'details' : 'verdict');
    } catch (err) {
      finishScan(
        ctrl,
        isAbort(err) || ctrl.signal.aborted
          ? 'Scan cancelled.'
          : err instanceof Error
            ? err.message
            : 'Label scan failed.'
      );
    }
  };

  const handleSwipe = (liked: boolean | null) => {
    setMyTasted(liked !== null);
    setMyLiked(liked ?? undefined);
    setStep('details');
  };

  const buildFields = (): Partial<SharedWineFields> => ({
    name: name.trim(),
    producer: producer.trim(),
    vintage: vintage.trim() || 'NV',
    type,
    grape: grape.trim(),
    region: region.trim(),
    country: country.trim(),
    abv: abv.trim(),
    imageUrl,
    jointNotes: jointNotes.trim(),
    aromaTags: selectedAromas,
    foodPairings,
    purchase: {
      store: store.trim(),
      price: parseFloat(price) || 0,
      currency,
      date: boughtOn || undefined,
      isSpecialOffer: editingWine?.purchase?.isSpecialOffer ?? false,
      notes: editingWine?.purchase?.notes ?? '',
    },
    ...(scanProfile ?? {}),
  });

  const handleSave = async () => {
    if (!name.trim()) {
      setSaveError('Give the wine a name first.');
      return;
    }
    const fields = buildFields();
    let changes: Partial<SharedWineFields>;
    if (editingWine) {
      // Send only what changed, so this can't overwrite something your
      // partner edited on their phone in the meantime.
      changes = {};
      for (const [key, value] of Object.entries(fields) as [keyof SharedWineFields, unknown][]) {
        if (JSON.stringify(value) !== JSON.stringify(editingWine[key] ?? (key === 'imageUrl' ? '' : undefined))) {
          (changes as Record<string, unknown>)[key] = value;
        }
      }
    } else if (mode === 'wishlist') {
      changes = { ...fields, tasted: false, wishlist: true };
    } else {
      changes = { ...fields, tasted: true, wishlist: false };
    }

    if (editingWine && !editing) {
      // Logging a tasting of a wishlist pick moves it into the journal.
      changes.tasted = true;
      changes.wishlist = false;
    }

    if (mode === 'tasted') {
      if (pickedVerdict) changes.coupleVerdict = pickedVerdict;
      if (unpinVerdict && !pickedVerdict) changes.verdictPinned = false;
    }

    let reviewChanged = false;
    let myReview: { liked?: boolean; rating: number; notes: string } | null | undefined = undefined;
    if (mode === 'tasted') {
      myReview = myTasted ? { liked: myLiked, rating: myRating, notes: myNotes.trim() } : null;
      // Nothing filled in ("Skip, rate later") isn't a rating: it stays on your
      // to-rate list instead.
      const emptyReview = myReview !== null && myReview.liked === undefined && !myReview.rating && !myReview.notes;
      if (emptyReview) {
        reviewChanged = false;
      } else if (!editingWine || !editing) {
        reviewChanged = true;
      } else if (myReview === null) {
        reviewChanged = reviewStatus(editingWine, me.slot) !== 'not-tasted';
      } else {
        const original = reviewFor(editingWine, me.slot);
        reviewChanged =
          !original ||
          original.liked !== myReview.liked ||
          original.rating !== myReview.rating ||
          original.notes !== myReview.notes;
      }
    }

    setSaving(true);
    setSaveError(null);
    try {
      await onSubmit({ changes, myReview: reviewChanged ? myReview : undefined }, editingWine?.id);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed. Try again.');
      setSaving(false);
    }
  };

  const toggleAroma = (tag: string) => {
    setSelectedAromas((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const partnerLine = () => {
    if (!partner) return null;
    if (partnerStatus === 'not-tasted') return `${partner.name} didn't taste this one.`;
    if (partnerStatus === 'rated') {
      const liked =
        partnerReview?.liked === true ? 'would buy again' : partnerReview?.liked === false ? 'passed' : 'rated it';
      const stars = partnerReview?.rating ? ` (${partnerReview.rating}★)` : '';
      return `${partner.name} ${liked}${stars}.`;
    }
    return `${partner.name} can add their verdict from their own phone.`;
  };

  const totalSteps = mode === 'wishlist' ? 2 : 3;
  const currentStepNum =
    step === 'photo' ? 1 : step === 'verdict' ? 2 : mode === 'wishlist' ? 2 : 3;

  const scannedSummary = [producer, vintage, grape, region, country, abv].filter(Boolean).join(' · ');
  const canToggleMode = !editing && !loggingWishlistPick && !draft;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[94dvh] bg-cellar-900 border border-white/10 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Clean Step Bars */}
        <div className="p-4 border-b border-white/[0.08] bg-cellar-900/95 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-serif font-semibold text-xl text-champagne-50 tracking-wide">
                {editing
                  ? 'Edit bottle'
                  : mode === 'wishlist'
                    ? 'Save bottle to try'
                    : 'Log a tasting'}
              </h2>
              {!editing && (
                <p className="text-xs text-stone-400 font-sans">
                  {step === 'photo'
                    ? 'Photo & label scan'
                    : step === 'verdict'
                      ? 'Your verdict'
                      : mode === 'wishlist'
                        ? 'Bottle details'
                        : 'Confirm & save'}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 rounded-full bg-cellar-800 hover:bg-cellar-700 text-stone-300 hover:text-white flex items-center justify-center border border-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!editing && (
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {Array.from({ length: totalSteps }).map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    idx + 1 <= currentStepNum ? 'bg-champagne-gold' : 'bg-cellar-800'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans">
          {/* STEP 1: PHOTO */}
          {step === 'photo' && (
            <div className="space-y-4">
              {/* Mode Switcher: Tasted vs Wishlist */}
              {canToggleMode && (
                <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-cellar-950 border border-white/[0.08]" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'tasted'}
                    onClick={() => setMode('tasted')}
                    className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      mode === 'tasted'
                        ? 'bg-wine-800 text-champagne-50 border border-champagne-400/35'
                        : 'text-stone-400 hover:text-stone-200 border border-transparent'
                    }`}
                  >
                    <WineIcon className="w-3.5 h-3.5" />
                    <span>We tasted it</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'wishlist'}
                    onClick={() => setMode('wishlist')}
                    className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      mode === 'wishlist'
                        ? 'bg-wine-800 text-champagne-50 border border-champagne-400/35'
                        : 'text-stone-400 hover:text-stone-200 border border-transparent'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Save to try</span>
                  </button>
                </div>
              )}

              <div className="text-center py-1 space-y-1">
                <h3 className="font-serif text-2xl text-champagne-50 font-semibold">Snap the bottle label</h3>
                <p className="text-xs text-stone-400 max-w-xs mx-auto leading-relaxed">
                  {settings.hasGeminiKey
                    ? 'Gemini reads the bottle name, producer, grape, region & vintage automatically.'
                    : 'Add a Gemini key in Settings to read bottle labels automatically.'}
                </p>
              </div>

              {scanMessage && !isScanning && !imageUrl.startsWith('data:') && (
                <div className="p-3 rounded-2xl bg-cellar-850 border border-white/10 text-xs text-stone-200">
                  {scanMessage}
                </div>
              )}

              {isScanning ? (
                <div className="space-y-3">
                  <div className="relative h-60 rounded-2xl bg-cellar-950 border border-champagne-400/50 overflow-hidden flex flex-col items-center justify-center p-6 text-center">
                    {imageUrl && (
                      <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
                    )}
                    <RefreshCw className="w-8 h-8 text-champagne-gold animate-spin mb-3 z-10" />
                    <span className="font-serif text-lg font-semibold text-champagne-50 z-10">Reading the label…</span>
                  </div>
                  <StillTrying
                    label="Reading the label"
                    attempt={scanAttempt}
                    onCancel={() => scanAbort.current?.abort()}
                  />
                </div>
              ) : scanMessage && imageUrl.startsWith('data:') ? (
                <div className="space-y-3">
                  <div className="relative h-40 rounded-2xl bg-cellar-950 border border-white/10 overflow-hidden">
                    <img src={imageUrl} alt="Your photo" className="absolute inset-0 w-full h-full object-cover opacity-65" />
                  </div>
                  <p className="p-3 rounded-2xl bg-cellar-850 border border-white/10 text-xs text-stone-200" role="alert">
                    {scanMessage}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => scanLabel(imageUrl)}
                      className="py-3 rounded-xl btn-primary text-sm font-semibold flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Try again
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="py-3 rounded-xl btn-secondary text-sm font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Camera className="w-4 h-4" />
                      New photo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-5 rounded-2xl surface-highlight hover:border-champagne-400/50 flex flex-col items-center justify-center gap-2.5 text-center transition-all active:scale-[0.98]"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-wine-800/80 border border-champagne-400/35 flex items-center justify-center text-champagne-gold">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-sm text-champagne-50 font-semibold">Take photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-5 rounded-2xl surface-card hover:border-white/20 flex flex-col items-center justify-center gap-2.5 text-center transition-all active:scale-[0.98]"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-cellar-850 border border-white/10 flex items-center justify-center text-champagne-200">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-sm text-stone-100 font-semibold">Choose photo</span>
                  </button>
                </div>
              )}

              {[cameraInputRef, fileInputRef].map((ref, i) => (
                <input
                  key={i}
                  ref={ref}
                  type="file"
                  accept="image/*"
                  capture={i === 0 ? 'environment' : undefined}
                  className="hidden"
                  onChange={(e) => {
                    const picked = e.target.files?.[0];
                    // Reset so choosing the same photo again still fires onChange.
                    e.target.value = '';
                    if (picked) handleImageFile(picked);
                  }}
                />
              ))}

              <button
                type="button"
                onClick={() => setStep(mode === 'wishlist' ? 'details' : 'verdict')}
                className="w-full py-2 text-center text-xs text-stone-400 hover:text-champagne-200 flex items-center justify-center gap-1 font-medium"
              >
                <span>Skip photo &amp; enter details manually</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* STEP 2: YOUR SWIPE */}
          {step === 'verdict' && (
            <SwipeVerdict
              taster={me.name}
              imageUrl={imageUrl}
              name={name}
              producer={producer}
              vintage={vintage}
              wineType={type}
              grape={grape}
              region={region}
              onChoose={(choice: SwipeChoice) => handleSwipe(choice === 'liked')}
              onNotTasted={() => handleSwipe(null)}
            />
          )}

          {/* STEP 3: DETAILS */}
          {step === 'details' && (
            <div className="space-y-4 animate-fadeIn">
              {scanMessage && (
                <div className="p-3 rounded-2xl bg-cellar-850 border border-white/10 flex items-start justify-between gap-3 text-xs text-stone-200">
                  <span>{scanMessage}</span>
                  <button
                    type="button"
                    onClick={() => setStep('photo')}
                    className="underline text-champagne-gold font-semibold flex-shrink-0"
                  >
                    Retake
                  </button>
                </div>
              )}
              {scanned && (
                <div className="p-3 rounded-2xl bg-champagne-950/70 border border-champagne-400/30 flex items-center justify-between gap-2 text-xs text-champagne-100">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-champagne-gold flex-shrink-0" />
                    <span>Label scanned — review essentials below.</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep('photo')}
                    className="underline text-champagne-gold font-semibold flex-shrink-0"
                  >
                    Rescan
                  </button>
                </div>
              )}

              {/* BOTTLE ESSENTIALS */}
              <div className="p-4 rounded-2xl surface-card space-y-3.5">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('photo')}
                    aria-label={imageUrl ? 'Change bottle photo' : 'Add bottle photo'}
                    className="w-14 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-cellar-950 border border-white/10 hover:border-champagne-400/40 flex flex-col items-center justify-center text-stone-400 transition-colors relative group"
                  >
                    {imageUrl ? (
                      <>
                        <img src={imageUrl} alt={name || 'Bottle'} className="w-full h-full object-cover" />
                        <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Camera className="w-4 h-4 text-white" />
                        </span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 text-champagne-400/70" />
                        <span className="text-[10px] mt-1">Photo</span>
                      </>
                    )}
                  </button>

                  <label className="flex-1 min-w-0">
                    <span className={labelClass}>Wine name *</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Reserva Malbec"
                      className={inputClass}
                    />
                  </label>
                </div>

                {/* Tactile Wine Style Pills */}
                <div className="space-y-1.5">
                  <span className={labelClass}>Style</span>
                  <div className="flex flex-wrap gap-1.5">
                    {WINE_TYPES_LIST.map((t) => {
                      const meta = WINE_TYPE_META[t];
                      const active = type === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setType(t)}
                          aria-pressed={active}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                            active
                              ? 'bg-wine-800/90 text-champagne-50 border-champagne-400/45 font-semibold'
                              : 'bg-cellar-950/70 text-stone-300 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${meta.dotClass}`} />
                          <span>{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* YOUR RATING (only in tasted mode) */}
              {mode === 'tasted' && (
                <div className="p-4 rounded-2xl surface-highlight space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-champagne-200">
                    Your verdict
                  </h3>
                  {myTasted ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setMyLiked(myLiked === false ? undefined : false)}
                          aria-pressed={myLiked === false}
                          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                            myLiked === false
                              ? 'bg-rose-500/20 border-rose-400/50 text-rose-200'
                              : 'bg-cellar-950/70 border-white/10 text-stone-300 hover:border-white/20'
                          }`}
                        >
                          <X className="w-4 h-4" /> Pass
                        </button>
                        <button
                          type="button"
                          onClick={() => setMyLiked(myLiked === true ? undefined : true)}
                          aria-pressed={myLiked === true}
                          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                            myLiked === true
                              ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                              : 'bg-cellar-950/70 border-white/10 text-stone-300 hover:border-white/20'
                          }`}
                        >
                          <Heart className="w-4 h-4" /> Buy again
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-stone-400 mr-1.5">Stars (optional)</span>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setMyRating((r) => (r === star ? 0 : star))}
                            aria-label={`${star} star${star > 1 ? 's' : ''}`}
                            className="p-0.5"
                          >
                            <Star
                              className={`w-6 h-6 ${
                                myRating >= star ? 'fill-champagne-gold text-champagne-gold' : 'text-stone-700'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={myNotes}
                        onChange={(e) => setMyNotes(e.target.value)}
                        rows={2}
                        placeholder="Your tasting notes (only you can edit these)"
                        className="w-full px-3 py-2 text-sm field-input resize-none"
                      />
                      <button
                        type="button"
                        onClick={() => setMyTasted(false)}
                        className="text-xs text-stone-400 hover:text-stone-200"
                      >
                        I didn&apos;t taste this one
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center justify-between gap-2 text-xs text-stone-300">
                      <span>You didn&apos;t taste this one.</span>
                      <button
                        type="button"
                        onClick={() => setMyTasted(true)}
                        className="underline text-champagne-gold font-semibold"
                      >
                        Add your rating
                      </button>
                    </div>
                  )}
                  {partnerLine() && (
                    <p className="text-xs text-stone-400 border-t border-white/10 pt-2">{partnerLine()}</p>
                  )}
                </div>
              )}

              {/* WHERE BOUGHT & PRICE */}
              <div className="p-4 rounded-2xl surface-card space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-champagne-200 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-champagne-gold" />
                  <span>Where {mode === 'wishlist' ? 'spotted' : 'you bought it'}</span>
                </h3>

                {/* Quick-tap Popular Shop Chips */}
                {popularShops.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {popularShops.map((shop) => {
                      const active = canonicalShop(store) === shop;
                      return (
                        <button
                          key={shop}
                          type="button"
                          onClick={() => setStore(active ? '' : shop)}
                          className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                            active
                              ? 'bg-wine-800/90 text-champagne-50 border-champagne-400/45 font-semibold'
                              : 'bg-cellar-950/70 text-stone-300 border-white/10 hover:border-white/20'
                          }`}
                        >
                          {shop}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div>
                  <span className={labelClass}>Shop</span>
                  <ShopPicker
                    value={store}
                    onChange={setStore}
                    customShops={customShops}
                    selectClass={inputClass}
                    inputClass={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <label>
                    <span className={labelClass}>Price</span>
                    <div className="flex">
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        aria-label="Currency"
                        className="mt-1 px-2.5 py-2.5 rounded-l-xl bg-cellar-850 border border-r-0 border-white/10 text-sm text-champagne-200 font-semibold"
                      >
                        {['£', '$', '€', 'A$'].map((c) => (
                          <option key={c} value={c} className="bg-cellar-900">
                            {c}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="12.00"
                        className={`${inputClass} rounded-l-none min-w-0`}
                      />
                    </div>
                  </label>
                  <label>
                    <span className={labelClass}>{mode === 'wishlist' ? 'Date' : 'Bought on'}</span>
                    <input
                      type="date"
                      value={boughtOn}
                      onChange={(e) => setBoughtOn(e.target.value)}
                      className={inputClass}
                    />
                  </label>
                </div>
              </div>

              {/* COLLAPSIBLE MORE DETAILS, NOTES & VERDICT OVERRIDE */}
              <div className="surface-card rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowMoreDetails((s) => !s)}
                  aria-expanded={showMoreDetails}
                  className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-champagne-200">
                      Bottle details, notes &amp; verdict
                    </span>
                    {!showMoreDetails && (
                      <span className="block text-xs text-stone-400 truncate mt-0.5">
                        {scannedSummary || 'Producer, grape, region, shared notes, aromas'}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-champagne-400 flex-shrink-0 transition-transform ${
                      showMoreDetails ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showMoreDetails && (
                  <div className="px-4 pb-4 pt-2 border-t border-white/[0.07] space-y-4">
                    {/* Bottle metadata */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <label className="col-span-2">
                        <span className={labelClass}>Producer / Winery</span>
                        <input
                          type="text"
                          value={producer}
                          onChange={(e) => setProducer(e.target.value)}
                          placeholder="e.g. Catena Zapata"
                          className={inputClass}
                        />
                      </label>
                      <label>
                        <span className={labelClass}>Vintage</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={vintage}
                          onChange={(e) => setVintage(e.target.value)}
                          placeholder="2022 or NV"
                          className={inputClass}
                        />
                      </label>
                      <label>
                        <span className={labelClass}>ABV</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={abv}
                          onChange={(e) => setAbv(e.target.value)}
                          placeholder="e.g. 13.5%"
                          className={inputClass}
                        />
                      </label>
                      <label className="col-span-2">
                        <span className={labelClass}>Grape varietal</span>
                        <input
                          type="text"
                          value={grape}
                          onChange={(e) => setGrape(e.target.value)}
                          placeholder="e.g. Malbec"
                          className={inputClass}
                        />
                      </label>
                      <label>
                        <span className={labelClass}>Region</span>
                        <input
                          type="text"
                          value={region}
                          onChange={(e) => setRegion(e.target.value)}
                          placeholder="e.g. Mendoza"
                          className={inputClass}
                        />
                      </label>
                      <label>
                        <span className={labelClass}>Country</span>
                        <input
                          type="text"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          placeholder="e.g. Argentina"
                          className={inputClass}
                        />
                      </label>
                    </div>

                    {/* Shared Notes */}
                    <label className="block">
                      <span className={labelClass}>Shared notes</span>
                      <textarea
                        value={jointNotes}
                        onChange={(e) => setJointNotes(e.target.value)}
                        rows={2}
                        placeholder="e.g. Perfect with Sunday roast; buy 3 next time"
                        className={`${inputClass} resize-none`}
                      />
                    </label>

                    {/* Couple Verdict Override (tasted mode only) */}
                    {mode === 'tasted' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className={labelClass}>Couple verdict</span>
                          {pickedVerdict || pinned ? (
                            <button
                              type="button"
                              onClick={() => {
                                setPickedVerdict(null);
                                setUnpinVerdict(true);
                              }}
                              className="text-xs underline text-champagne-gold"
                            >
                              Auto from swipes
                            </button>
                          ) : (
                            <span className="text-[11px] text-stone-400">Follows your swipes</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {VERDICT_ORDER.map((vKey, i, all) => {
                            const cfg = VERDICTS[vKey];
                            const isSelected = shownVerdict === vKey;
                            const lastAlone = i === all.length - 1 && all.length % 2 === 1;
                            return (
                              <button
                                key={vKey}
                                type="button"
                                onClick={() => setPickedVerdict(vKey)}
                                aria-pressed={isSelected}
                                className={`p-2.5 rounded-xl text-xs flex items-center justify-center border transition-all ${
                                  lastAlone ? 'col-span-2' : ''
                                } ${
                                  isSelected
                                    ? `${cfg.bgClass} ${cfg.colorClass} ${cfg.borderClass} ring-1 ring-champagne-gold/50 font-semibold`
                                    : 'bg-cellar-950/70 border-white/10 text-stone-300 hover:border-white/20 font-medium'
                                }`}
                              >
                                {cfg.shortLabel}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Aromas */}
                    <div className="space-y-1.5">
                      <span className={labelClass}>Aromas &amp; flavours</span>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-cellar-950/70 rounded-xl border border-white/[0.08]">
                        {POPULAR_AROMAS.map((aroma) => {
                          const isSelected = selectedAromas.includes(aroma);
                          return (
                            <button
                              key={aroma}
                              type="button"
                              onClick={() => toggleAroma(aroma)}
                              aria-pressed={isSelected}
                              className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                                isSelected
                                  ? 'bg-wine-800/90 text-champagne-50 border border-champagne-400/45 font-semibold'
                                  : 'bg-cellar-900 text-stone-300 border border-white/[0.08] font-medium'
                              }`}
                            >
                              {isSelected ? '✓ ' : '+ '}
                              {aroma}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 modal-footer-safe border-t border-white/[0.08] bg-cellar-900 space-y-2">
          {saveError && (
            <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-400/25 rounded-xl p-2.5" role="alert">
              {saveError}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            {step === 'details' ? (
              <>
                <button
                  type="button"
                  onClick={
                    editing
                      ? onClose
                      : () => setStep(mode === 'wishlist' ? 'photo' : 'verdict')
                  }
                  className="px-4 py-3 rounded-xl btn-secondary text-sm font-semibold"
                >
                  {editing ? 'Cancel' : 'Back'}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 px-4 rounded-xl btn-primary text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Check className="w-4 h-4 text-champagne-gold" />
                  <span>
                    {saving
                      ? 'Saving…'
                      : editing
                        ? 'Save changes'
                        : mode === 'wishlist'
                          ? 'Save to wishlist'
                          : 'Save to cellar'}
                  </span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setStep(
                    step === 'photo'
                      ? mode === 'wishlist'
                        ? 'details'
                        : 'verdict'
                      : 'details'
                  )
                }
                className="w-full py-3 px-4 rounded-xl btn-secondary text-sm font-semibold flex items-center justify-center gap-2"
              >
                <span>{step === 'photo' ? 'Skip photo' : 'Skip, rate later'}</span>
                <ChevronRight className="w-4 h-4 text-champagne-gold" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
