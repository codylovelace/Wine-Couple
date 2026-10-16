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
import { otherSlot, reviewFor, reviewStatus, SharedWineFields } from '@/lib/wine-logic';
import { WineSubmission, api, isAbort, retryWhileBusy } from '@/lib/api-client';
import { StillTrying } from '@/components/StillTrying';
import { SwipeVerdict, SwipeChoice } from '@/components/SwipeVerdict';
import { X, Camera, Upload, Sparkles, Star, Store, Check, RefreshCw, ChevronRight, Heart } from 'lucide-react';
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
  // Resolves when saved; throws with a message to show if it wasn't.
  onSubmit: (submission: WineSubmission, existingId?: string) => Promise<void>;
  // Shops you've used before that aren't in the dropdown's main list.
  customShops: string[];
}

const today = () => new Date().toISOString().split('T')[0];

const inputClass =
  'w-full mt-1 px-3 py-2.5 rounded-xl bg-black/70 border border-white/15 text-sm text-white focus:outline-none focus:border-champagne-gold font-sans';
const labelClass = 'text-[11px] text-stone-300 uppercase font-sans font-medium tracking-wider';

export function AddWineModal({ isOpen, onClose, me, partner, settings, editingWine, draft, onSubmit, customShops }: AddWineModalProps) {
  // photo -> your swipe -> details
  const [step, setStep] = useState<'photo' | 'verdict' | 'details'>('photo');
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
    // Editing goes straight to the form; a wishlist pick or recommendation
    // already has its details, so it starts at the swipe.
    setStep(editing ? 'details' : editingWine || draft ? 'verdict' : 'photo');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingWine, draft, isOpen]);

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
      setStep('verdict');
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
  // to the swipe once the label is read; on a real failure or Cancel it stays
  // on the photo, so you can try again, take another or type the details.
  const scanLabel = async (dataUrl: string, ctrl = startScan()) => {
    try {
      const { scanResult } = await retryWhileBusy(
        (signal) => api<{ scanResult: WineScanResult }>('/api/scan-wine', { method: 'POST', body: { imageBase64: dataUrl }, signal }),
        { signal: ctrl.signal, onRetry: (attempt) => scanAbort.current === ctrl && setScanAttempt(attempt) }
      );
      if (scanAbort.current !== ctrl) return;
      applyScanResult(scanResult);
      setScanned(true);
      finishScan(ctrl, null);
      setStep('verdict');
    } catch (err) {
      finishScan(
        ctrl,
        isAbort(err) || ctrl.signal.aborted ? 'Scan cancelled.' : err instanceof Error ? err.message : 'Label scan failed.'
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
    } else {
      changes = { ...fields, tasted: true, wishlist: false };
    }
    if (editingWine && !editing) {
      // Logging a tasting of a wishlist pick moves it into the journal.
      changes.tasted = true;
      changes.wishlist = false;
    }
    if (pickedVerdict) changes.coupleVerdict = pickedVerdict;
    if (unpinVerdict && !pickedVerdict) changes.verdictPinned = false;

    const myReview = myTasted ? { liked: myLiked, rating: myRating, notes: myNotes.trim() } : null;
    // Nothing filled in ("Skip, rate later") isn't a rating: it stays on your
    // to-rate list instead.
    const emptyReview = myReview !== null && myReview.liked === undefined && !myReview.rating && !myReview.notes;
    const original = editingWine ? reviewFor(editingWine, me.slot) : undefined;
    let reviewChanged: boolean;
    if (emptyReview) reviewChanged = false;
    else if (!editingWine || !editing) reviewChanged = true;
    else if (myReview === null) reviewChanged = reviewStatus(editingWine, me.slot) !== 'not-tasted';
    else
      reviewChanged =
        !original ||
        original.liked !== myReview.liked ||
        original.rating !== myReview.rating ||
        original.notes !== myReview.notes;

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
      const liked = partnerReview?.liked === true ? 'liked it' : partnerReview?.liked === false ? "didn't like it" : 'rated it';
      const stars = partnerReview?.rating ? ` (${partnerReview.rating}★)` : '';
      return `${partner.name} ${liked}${stars}.`;
    }
    return `${partner.name} can add their rating from their own phone.`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-md max-h-[94dvh] bg-[#0f0a0d] border border-champagne-500/25 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-champagne-500/15 flex items-center justify-between bg-[#0f0a0d]/95 backdrop-blur-md">
          <div>
            <h2 className="font-serif font-semibold text-lg text-stone-100 tracking-wide">
              {editing ? 'Edit wine' : 'Log a tasting'}
            </h2>
            {!editing && (
              <p className="text-xs text-stone-300 font-sans">
                {step === 'photo' ? 'Step 1 of 3: Photo' : step === 'verdict' ? 'Step 2 of 3: Your verdict' : 'Step 3 of 3: Details'}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-stone-900 text-stone-300 hover:text-white flex items-center justify-center border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans">
          {/* STEP 1: PHOTO */}
          {step === 'photo' && (
            <div className="space-y-4">
              <div className="text-center py-2 space-y-1.5">
                <h3 className="font-serif text-xl text-white font-semibold">Snap the label</h3>
                <p className="text-xs text-stone-300 max-w-xs mx-auto leading-relaxed">
                  {settings.hasGeminiKey
                    ? 'The name, producer, grape and region are read from the label for you.'
                    : 'Add a Gemini key in Settings and the details will be read from the label for you.'}
                </p>
              </div>

              {scanMessage && !isScanning && !imageUrl.startsWith('data:') && (
                <div className="p-3 rounded-2xl bg-stone-900/90 border border-white/15 text-xs text-stone-200">{scanMessage}</div>
              )}

              {isScanning ? (
                <div className="space-y-3">
                  <div className="relative h-64 rounded-3xl bg-black border-2 border-champagne-gold/60 overflow-hidden flex flex-col items-center justify-center p-6 text-center">
                    {imageUrl && <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />}
                    <RefreshCw className="w-8 h-8 text-champagne-gold animate-spin mb-3 z-10" />
                    <span className="font-serif text-base font-semibold text-white z-10">Reading the label…</span>
                  </div>
                  <StillTrying label="Reading the label" attempt={scanAttempt} onCancel={() => scanAbort.current?.abort()} />
                </div>
              ) : scanMessage && imageUrl.startsWith('data:') ? (
                // The scan didn't work: keep the photo and offer the ways on.
                <div className="space-y-3">
                  <div className="relative h-40 rounded-3xl bg-black border border-white/15 overflow-hidden">
                    <img src={imageUrl} alt="Your photo" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                  </div>
                  <p className="p-3 rounded-2xl bg-stone-900/90 border border-white/15 text-xs text-stone-200" role="alert">
                    {scanMessage}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => scanLabel(imageUrl)}
                      className="py-3 rounded-xl bg-gradient-to-r from-wine-900 via-wine-800 to-black text-champagne-100 border border-champagne-500/35 text-sm font-bold flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Try again
                    </button>
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="py-3 rounded-xl bg-stone-900 border border-white/15 text-sm font-semibold text-stone-100 flex items-center justify-center gap-1.5"
                    >
                      <Camera className="w-4 h-4" />
                      New photo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-5 rounded-3xl luxury-card hover:border-champagne-500/45 flex flex-col items-center justify-center gap-2 text-center"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-wine-900 to-black border border-champagne-500/35 flex items-center justify-center text-champagne-gold">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-sm text-stone-100 font-semibold">Take photo</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-5 rounded-3xl luxury-card hover:border-champagne-500/45 flex flex-col items-center justify-center gap-2 text-center"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-stone-900 border border-white/15 flex items-center justify-center text-champagne-accent">
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
                onClick={() => setStep('verdict')}
                className="w-full py-2 text-center text-xs text-stone-300 hover:text-champagne-200 flex items-center justify-center gap-1 font-medium"
              >
                <span>No photo, I&apos;ll type the details</span>
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
              onChoose={(choice: SwipeChoice) => handleSwipe(choice === 'liked')}
              onNotTasted={() => handleSwipe(null)}
            />
          )}

          {/* STEP 3: DETAILS */}
          {step === 'details' && (
            <div className="space-y-4 animate-fadeIn">
              {scanMessage && (
                <div className="p-3 rounded-2xl bg-stone-900/90 border border-white/15 flex items-start justify-between gap-3 text-xs text-stone-200">
                  <span>{scanMessage}</span>
                  <button onClick={() => setStep('photo')} className="underline text-champagne-gold font-semibold flex-shrink-0">
                    Retake
                  </button>
                </div>
              )}
              {scanned && (
                <div className="p-3 rounded-2xl bg-champagne-950/90 border border-champagne-500/35 flex items-center justify-between text-xs text-champagne-100">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-champagne-gold" /> Details read from the label. Check them below.
                  </span>
                  <button onClick={() => setStep('photo')} className="underline text-champagne-gold font-semibold">
                    Rescan
                  </button>
                </div>
              )}

              {/* YOUR RATING */}
              <div className="p-4 rounded-3xl luxury-card-gold space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-champagne-300">Your rating</h3>
                {myTasted ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMyLiked(myLiked === false ? undefined : false)}
                        aria-pressed={myLiked === false}
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-sm font-semibold ${
                          myLiked === false ? 'bg-rose-950/70 border-rose-500/60 text-rose-200' : 'bg-stone-900 border-white/10 text-stone-300'
                        }`}
                      >
                        <X className="w-4 h-4" /> Wouldn&apos;t buy again
                      </button>
                      <button
                        type="button"
                        onClick={() => setMyLiked(myLiked === true ? undefined : true)}
                        aria-pressed={myLiked === true}
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-sm font-semibold ${
                          myLiked === true ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200' : 'bg-stone-900 border-white/10 text-stone-300'
                        }`}
                      >
                        <Heart className="w-4 h-4" /> Would buy again
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-stone-400 mr-1">Stars (optional)</span>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          // Tapping the current star again clears the rating.
                          onClick={() => setMyRating((r) => (r === star ? 0 : star))}
                          aria-label={`${star} star${star > 1 ? 's' : ''}`}
                          className="p-0.5"
                        >
                          <Star className={`w-6 h-6 ${myRating >= star ? 'fill-champagne-gold text-champagne-gold' : 'text-stone-700'}`} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={myNotes}
                      onChange={(e) => setMyNotes(e.target.value)}
                      rows={2}
                      placeholder="Your tasting notes (only you can edit these)"
                      className="w-full px-3 py-2 rounded-xl bg-stone-900/90 border border-white/10 text-sm text-stone-100 focus:outline-none focus:border-champagne-gold resize-none"
                    />
                    <button type="button" onClick={() => setMyTasted(false)} className="text-xs text-stone-400 hover:text-stone-200">
                      I didn&apos;t taste this one
                    </button>
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-2 text-xs text-stone-300">
                    <span>You didn&apos;t taste this one.</span>
                    <button type="button" onClick={() => setMyTasted(true)} className="underline text-champagne-gold font-semibold">
                      Add your rating
                    </button>
                  </div>
                )}
                {partnerLine() && <p className="text-xs text-stone-400 border-t border-white/10 pt-2">{partnerLine()}</p>}
              </div>

              {/* COUPLE VERDICT */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold tracking-wider uppercase text-champagne-300">Couple verdict</span>
                  {pickedVerdict || pinned ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPickedVerdict(null);
                        setUnpinVerdict(true);
                      }}
                      className="text-xs underline text-champagne-gold"
                    >
                      Set from swipes
                    </button>
                  ) : (
                    <span className="text-[11px] text-stone-400">Set from your swipes</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(VERDICTS) as Verdict[]).map((vKey) => {
                    const cfg = VERDICTS[vKey];
                    const isSelected = shownVerdict === vKey;
                    return (
                      <button
                        key={vKey}
                        type="button"
                        onClick={() => setPickedVerdict(vKey)}
                        aria-pressed={isSelected}
                        className={`p-2.5 rounded-2xl text-xs flex flex-col items-center gap-1 border transition-all ${
                          isSelected
                            ? `${cfg.bgClass} ${cfg.colorClass} ${cfg.borderClass} ring-1 ring-champagne-gold/60 font-semibold`
                            : 'bg-stone-900/70 border-white/10 text-stone-300 font-medium'
                        }`}
                      >
                        {cfg.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* THE WINE */}
              <div className="p-4 rounded-3xl luxury-card space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-champagne-300">The wine</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="col-span-2">
                    <span className={labelClass}>Name *</span>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Reserva Malbec" className={inputClass} />
                  </label>
                  <label className="col-span-2">
                    <span className={labelClass}>Producer</span>
                    <input type="text" value={producer} onChange={(e) => setProducer(e.target.value)} placeholder="e.g. Catena Zapata" className={inputClass} />
                  </label>
                  <label>
                    <span className={labelClass}>Vintage</span>
                    <input type="text" inputMode="numeric" value={vintage} onChange={(e) => setVintage(e.target.value)} placeholder="2022 or NV" className={inputClass} />
                  </label>
                  <label>
                    <span className={labelClass}>Style</span>
                    <select value={type} onChange={(e) => setType(e.target.value as WineType)} className={inputClass}>
                      <option value="red">Red</option>
                      <option value="white">White</option>
                      <option value="rose">Rosé</option>
                      <option value="sparkling">Sparkling</option>
                      <option value="dessert">Dessert</option>
                      <option value="orange">Orange</option>
                    </select>
                  </label>
                  <label>
                    <span className={labelClass}>Grape</span>
                    <input type="text" value={grape} onChange={(e) => setGrape(e.target.value)} placeholder="e.g. Malbec" className={inputClass} />
                  </label>
                  <label>
                    <span className={labelClass}>ABV</span>
                    <input type="text" inputMode="decimal" value={abv} onChange={(e) => setAbv(e.target.value)} placeholder="e.g. 13.5%" className={inputClass} />
                  </label>
                  <label>
                    <span className={labelClass}>Region</span>
                    <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Mendoza" className={inputClass} />
                  </label>
                  <label>
                    <span className={labelClass}>Country</span>
                    <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Argentina" className={inputClass} />
                  </label>
                </div>
              </div>

              {/* WHERE YOU BOUGHT IT */}
              <div className="p-4 rounded-3xl luxury-card space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-champagne-300 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-champagne-gold" />
                  <span>Where you bought it</span>
                </h3>
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
                        className="mt-1 px-2 py-2.5 rounded-l-xl bg-stone-900 border border-r-0 border-white/15 text-sm text-champagne-accent font-bold"
                      >
                        {['£', '$', '€', 'A$'].map((c) => (
                          <option key={c} value={c}>
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
                        placeholder="14.99"
                        className={`${inputClass} rounded-l-none min-w-0`}
                      />
                    </div>
                  </label>
                  <label>
                    <span className={labelClass}>Bought on</span>
                    <input type="date" value={boughtOn} onChange={(e) => setBoughtOn(e.target.value)} className={inputClass} />
                  </label>
                </div>
              </div>

              {/* SHARED NOTES */}
              <label className="block">
                <span className={labelClass}>Shared notes</span>
                <textarea
                  value={jointNotes}
                  onChange={(e) => setJointNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Buy 3 more next time; perfect with Sunday roast"
                  className={`${inputClass} resize-none`}
                />
              </label>

              {/* AROMAS */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold tracking-wider uppercase text-champagne-300">Aromas &amp; flavours</span>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-black/50 rounded-2xl border border-white/10">
                  {POPULAR_AROMAS.map((aroma) => {
                    const isSelected = selectedAromas.includes(aroma);
                    return (
                      <button
                        key={aroma}
                        type="button"
                        onClick={() => toggleAroma(aroma)}
                        aria-pressed={isSelected}
                        className={`px-2.5 py-1 rounded-lg text-xs ${
                          isSelected
                            ? 'bg-gradient-to-r from-wine-900 to-wine-950 text-champagne-100 border border-champagne-500/45 font-semibold'
                            : 'bg-stone-900/70 text-stone-300 border border-white/10 font-medium'
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

        {/* Footer */}
        <div className="p-4 modal-footer-safe border-t border-champagne-500/15 bg-[#0f0a0d] space-y-2">
          {saveError && (
            <p className="text-xs text-rose-300" role="alert">
              {saveError}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            {step === 'details' ? (
              <>
                <button
                  type="button"
                  onClick={editing ? onClose : () => setStep('verdict')}
                  className="px-4 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-sm font-semibold text-stone-200 border border-white/15"
                >
                  {editing ? 'Cancel' : 'Back'}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-wine-900 via-wine-800 to-black text-champagne-100 border border-champagne-500/35 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Check className="w-4 h-4 text-champagne-gold" />
                  <span>{saving ? 'Saving…' : editing ? 'Save changes' : 'Save to cellar'}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setStep(step === 'photo' ? 'verdict' : 'details')}
                className="w-full py-3 px-4 rounded-xl bg-stone-900 text-stone-200 border border-white/15 text-sm font-semibold flex items-center justify-center gap-2"
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
