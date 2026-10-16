'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Wine, WineType, Verdict, VERDICTS, UserSettings, WineScanResult } from '@/lib/types';
import { 
  X, Camera, Upload, Sparkles, Star, Store,
  Check, RefreshCw, ChevronRight
} from 'lucide-react';
import { POPULAR_AROMAS, COMMON_STORES, generateWineBuyLinks } from '@/lib/wine-search-links';
import { prepareBottlePhoto } from '@/lib/client-image';

interface AddWineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (wine: Wine) => void;
  settings: UserSettings;
  editingWine?: Wine | null;
}

export function AddWineModal({
  isOpen,
  onClose,
  onSave,
  settings,
  editingWine,
}: AddWineModalProps) {
  const [step, setStep] = useState<'photo' | 'details'>('photo');
  const [isScanning, setIsScanning] = useState(false);
  const [scanSource, setScanSource] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [producer, setProducer] = useState('');
  const [vintage, setVintage] = useState('');
  const [type, setType] = useState<WineType>('red');
  const [grape, setGrape] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [abv, setAbv] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [coupleVerdict, setCoupleVerdict] = useState<Verdict>('good-value');

  // Purchase details
  const [store, setStore] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState(settings.defaultCurrency || '£');
  const [isSpecialOffer, setIsSpecialOffer] = useState(false);
  const [purchaseNotes, setPurchaseNotes] = useState('');

  // Couple Reviews
  const [tastedTogether, setTastedTogether] = useState(true);
  const [partner1Rating, setPartner1Rating] = useState(4.5);
  const [partner1Notes, setPartner1Notes] = useState('');
  const [partner2Rating, setPartner2Rating] = useState(4.5);
  const [partner2Notes, setPartner2Notes] = useState('');
  const [jointNotes, setJointNotes] = useState('');

  // Taste Profile (1-5)
  const [body, setBody] = useState(4);
  const [sweetness, setSweetness] = useState(1);
  const [tannin, setTannin] = useState(3);
  const [acidity, setAcidity] = useState(3);

  // Aroma & Food tags
  const [selectedAromas, setSelectedAromas] = useState<string[]>([]);
  const [selectedPairings, setSelectedPairings] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingWine) {
      setName(editingWine.name);
      setProducer(editingWine.producer);
      setVintage(editingWine.vintage);
      setType(editingWine.type);
      setGrape(editingWine.grape);
      setRegion(editingWine.region);
      setCountry(editingWine.country);
      setAbv(editingWine.abv || '');
      setImageUrl(editingWine.imageUrl || '');
      setCoupleVerdict(editingWine.coupleVerdict);
      setStore(editingWine.purchase?.store || '');
      setPrice(editingWine.purchase?.price ? String(editingWine.purchase.price) : '');
      setCurrency(editingWine.purchase?.currency || '£');
      setIsSpecialOffer(editingWine.purchase?.isSpecialOffer || false);
      setPurchaseNotes(editingWine.purchase?.notes || '');
      setTastedTogether(editingWine.tastedTogether ?? true);
      setPartner1Rating(editingWine.partner1Review?.rating ?? editingWine.averageRating);
      setPartner1Notes(editingWine.partner1Review?.notes || '');
      setPartner2Rating(editingWine.partner2Review?.rating ?? editingWine.averageRating);
      setPartner2Notes(editingWine.partner2Review?.notes || '');
      setJointNotes(editingWine.jointNotes || '');
      setBody(editingWine.body || 3);
      setSweetness(editingWine.sweetness || 1);
      setTannin(editingWine.tannin || 3);
      setAcidity(editingWine.acidity || 3);
      setSelectedAromas(editingWine.aromaTags || []);
      setSelectedPairings(editingWine.foodPairings || []);
      setStep('details');
    } else {
      resetForm();
      setStep('photo');
    }
  }, [editingWine, isOpen]);

  const resetForm = () => {
    setName('');
    setProducer('');
    setVintage('');
    setType('red');
    setGrape('');
    setRegion('');
    setCountry('');
    setAbv('');
    setImageUrl('');
    setCoupleVerdict('good-value');
    setStore('');
    setPrice('');
    setCurrency(settings.defaultCurrency || '£');
    setIsSpecialOffer(false);
    setPurchaseNotes('');
    setTastedTogether(true);
    setPartner1Rating(4.5);
    setPartner1Notes('');
    setPartner2Rating(4.5);
    setPartner2Notes('');
    setJointNotes('');
    setBody(4);
    setSweetness(1);
    setTannin(3);
    setAcidity(3);
    setSelectedAromas([]);
    setSelectedPairings([]);
    setScanSource(null);
    setScanMessage(null);
  };

  if (!isOpen) return null;

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
    if (r.foodPairings?.length) setSelectedPairings(r.foodPairings);
    if (r.body) setBody(r.body);
    if (r.sweetness) setSweetness(r.sweetness);
    if (r.tannin) setTannin(r.tannin);
    if (r.acidity) setAcidity(r.acidity);
    if (r.tastingNotesSummary) setJointNotes((prev) => prev || `Label: ${r.tastingNotesSummary}`);
  };

  const handleImageFile = async (file: File) => {
    setIsScanning(true);
    setScanSource(null);
    setScanMessage(null);

    let dataUrl: string;
    try {
      // The resized JPEG data URL is used for the preview and the scan, and is
      // sent with the wine on save; the server writes it to the photos volume.
      dataUrl = (await prepareBottlePhoto(file)).dataUrl;
    } catch (err) {
      console.error('Could not read photo:', err);
      setScanMessage("Couldn't read that photo. Try another one, or enter the details by hand.");
      setIsScanning(false);
      setStep('details');
      return;
    }
    setImageUrl(dataUrl);

    try {
      const res = await fetch('/api/scan-wine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl }),
      });
      const data = await res.json();
      if (data.success && data.scanResult) {
        applyScanResult(data.scanResult);
        setScanSource('Gemini AI');
      } else {
        setScanMessage(data.error || 'Label scan was not available. Enter the details by hand.');
      }
    } catch (err) {
      console.error('Scan error:', err);
      setScanMessage('Label scan failed. Enter the details by hand.');
    } finally {
      setIsScanning(false);
      setStep('details');
    }
  };

  const handleSave = () => {
    if (!name.trim() || !producer.trim()) {
      alert('Please provide at least a Wine Name and Producer.');
      return;
    }

    const avgRating = Number(((partner1Rating + partner2Rating) / 2).toFixed(1));

    const onlineLinks = generateWineBuyLinks({
      name,
      producer,
      vintage,
      country,
    });

    const newWine: Wine = {
      id: editingWine?.id || `wine-${Date.now()}`,
      name: name.trim(),
      producer: producer.trim(),
      vintage: vintage.trim() || 'NV',
      type,
      grape: grape.trim(),
      region: region.trim(),
      country: country.trim(),
      abv: abv.trim(),
      imageUrl: imageUrl || undefined,
      coupleVerdict,
      averageRating: avgRating,
      tastedTogether,
      partner1Review: {
        tasterName: settings.partner1Name,
        rating: partner1Rating,
        verdict: coupleVerdict,
        notes: partner1Notes.trim(),
        aromas: selectedAromas,
        date: new Date().toISOString().split('T')[0],
      },
      partner2Review: {
        tasterName: settings.partner2Name,
        rating: partner2Rating,
        verdict: coupleVerdict,
        notes: partner2Notes.trim(),
        aromas: selectedAromas,
        date: new Date().toISOString().split('T')[0],
      },
      jointNotes: jointNotes.trim(),
      body,
      sweetness,
      tannin,
      acidity,
      aromaTags: selectedAromas,
      foodPairings: selectedPairings,
      purchase: {
        store: store.trim(),
        price: parseFloat(price) || 0,
        currency,
        date: new Date().toISOString().split('T')[0],
        isSpecialOffer,
        notes: purchaseNotes.trim(),
      },
      onlineLinks,
      wishlist: editingWine?.wishlist || false,
      favorite: editingWine?.favorite || false,
      createdAt: editingWine?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(newWine);
    onClose();
  };

  const toggleAroma = (tag: string) => {
    setSelectedAromas((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-md max-h-[94dvh] bg-[#0f0a0d] border border-champagne-500/25 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-champagne-500/15 flex items-center justify-between bg-[#0f0a0d]/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-wine-900/70 border border-champagne-500/35 flex items-center justify-center text-champagne-gold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif font-semibold text-lg text-stone-100 tracking-wide">
                {editingWine ? 'Edit Wine Details' : 'Log New Tasting'}
              </h2>
              <p className="text-xs text-stone-300 font-sans">
                {step === 'photo' ? 'Step 1: Capture or Scan Bottle' : 'Step 2: Couple Reviews & Cellar Info'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-900 text-stone-300 hover:text-white flex items-center justify-center border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans">
          {/* STEP 1: PHOTO CAPTURE & AI SCAN */}
          {step === 'photo' && (
            <div className="space-y-4">
              <div className="text-center py-2 space-y-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-champagne-950 text-champagne-200 border border-champagne-500/30 text-xs font-sans font-semibold tracking-wider uppercase mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-champagne-gold" /> AI Sommelier Scanner
                </span>
                <h3 className="font-serif text-xl text-white font-semibold">
                  Capture the Wine Bottle Label
                </h3>
                <p className="text-xs text-stone-300 max-w-xs mx-auto leading-relaxed font-sans">
                  {settings.hasGeminiKey
                    ? 'Gemini will read the label and fill in the producer, grape, region and vintage for you.'
                    : 'Add a Gemini API key in Settings to fill in the details from the label automatically.'}
                </p>
              </div>

              {/* Scanning Overlay State */}
              {isScanning ? (
                <div className="relative h-64 rounded-3xl bg-black border-2 border-champagne-gold/60 overflow-hidden flex flex-col items-center justify-center p-6 text-center shadow-gold-glow">
                  {imageUrl && (
                    <img src={imageUrl} alt="Scanning" className="absolute inset-0 w-full h-full object-cover opacity-25" />
                  )}
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-champagne-gold to-transparent shadow-[0_0_15px_#d4af37] animate-bounce top-1/3" />
                  <RefreshCw className="w-8 h-8 text-champagne-gold animate-spin mb-3 z-10" />
                  <span className="font-serif text-base font-semibold text-white z-10 tracking-wide">
                    Reading the label...
                  </span>
                  <span className="text-xs text-champagne-200 mt-1 z-10 font-sans">
                    Extracting producer, varietal, vintage, and flavor bouquet...
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {/* Camera Button */}
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-5 rounded-3xl luxury-card hover:border-champagne-500/45 flex flex-col items-center justify-center gap-2 text-center group transition-all"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-wine-900 to-black border border-champagne-500/35 flex items-center justify-center text-champagne-gold shadow-lg group-hover:scale-105 transition-transform">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="font-sans text-sm text-stone-100 tracking-wide font-semibold">Take Photo</span>
                    <span className="text-xs text-stone-300 font-sans">Camera capture</span>
                  </button>

                  {/* Upload from Gallery Button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-5 rounded-3xl luxury-card hover:border-champagne-500/45 flex flex-col items-center justify-center gap-2 text-center group transition-all"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-stone-900 border border-white/15 flex items-center justify-center text-champagne-accent shadow-lg group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="font-sans text-sm text-stone-100 tracking-wide font-semibold">Upload Photo</span>
                    <span className="text-xs text-stone-300 font-sans">Photo roll</span>
                  </button>
                </div>
              )}

              {/* Hidden Inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const picked = e.target.files?.[0];
                  // Reset so choosing the same photo again still fires onChange.
                  e.target.value = '';
                  if (picked) handleImageFile(picked);
                }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const picked = e.target.files?.[0];
                  // Reset so choosing the same photo again still fires onChange.
                  e.target.value = '';
                  if (picked) handleImageFile(picked);
                }}
              />

              {/* Skip to manual entry */}
              <button
                onClick={() => setStep('details')}
                className="w-full py-2 text-center text-xs text-stone-300 hover:text-champagne-200 transition-colors flex items-center justify-center gap-1 font-sans font-medium"
              >
                <span>Enter details manually without photo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* STEP 2: REVIEW DETAILS & COUPLE TASTING */}
          {step === 'details' && (
            <div className="space-y-4 animate-fadeIn">
              {scanMessage && (
                <div className="p-3 rounded-2xl bg-stone-900/90 border border-white/15 flex items-start justify-between gap-3 text-xs text-stone-200 font-sans">
                  <span>{scanMessage}</span>
                  <button
                    onClick={() => setStep('photo')}
                    className="text-xs underline text-champagne-gold font-semibold flex-shrink-0"
                  >
                    Retake
                  </button>
                </div>
              )}

              {/* Scan Banner notification */}
              {scanSource && (
                <div className="p-3 rounded-2xl bg-champagne-950/90 border border-champagne-500/35 flex items-center justify-between text-xs text-champagne-100 font-sans">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-champagne-gold" />
                    <span>Label extracted via <strong>{scanSource}</strong></span>
                  </div>
                  <button
                    onClick={() => setStep('photo')}
                    className="text-xs underline text-champagne-gold font-semibold"
                  >
                    Rescan
                  </button>
                </div>
              )}

              {/* 1. CATEGORISATION / VERDICT PILLS */}
              <div className="space-y-1.5">
                <label className="text-xs font-sans font-semibold tracking-wider uppercase text-champagne-300 flex items-center justify-between">
                  <span>Couple Verdict *</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.keys(VERDICTS) as Verdict[]).map((vKey) => {
                    const cfg = VERDICTS[vKey];
                    const isSelected = coupleVerdict === vKey;
                    return (
                      <button
                        key={vKey}
                        type="button"
                        onClick={() => setCoupleVerdict(vKey)}
                        className={`p-2.5 rounded-2xl text-xs font-sans flex flex-col items-center gap-1 border transition-all ${
                          isSelected
                            ? `${cfg.bgClass} ${cfg.colorClass} ${cfg.borderClass} ring-1 ring-champagne-gold/60 scale-[1.02] shadow-sm font-semibold`
                            : 'bg-stone-900/70 border-white/10 text-stone-300 hover:border-champagne-500/25 font-medium'
                        }`}
                      >
                        <span className="text-xs">{cfg.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. CORE WINE IDENTIFICATION */}
              <div className="p-4 rounded-3xl luxury-card space-y-3">
                <h3 className="text-xs font-sans font-semibold uppercase tracking-wider text-champagne-300">
                  Wine Attributes
                </h3>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="col-span-2">
                    <label className="text-[11px] text-stone-300 uppercase font-sans font-medium tracking-wider">Wine Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. High Mountain Vines, Reserva"
                      className="w-full mt-1 px-3 py-2.5 rounded-xl bg-black/70 border border-white/15 text-xs text-white focus:outline-none focus:border-champagne-gold font-sans"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-300 uppercase font-sans font-medium tracking-wider">Producer / Winery *</label>
                    <input
                      type="text"
                      value={producer}
                      onChange={(e) => setProducer(e.target.value)}
                      placeholder="e.g. Catena Zapata"
                      className="w-full mt-1 px-3 py-2.5 rounded-xl bg-black/70 border border-white/15 text-xs text-white focus:outline-none focus:border-champagne-gold font-sans"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-300 uppercase font-sans font-medium tracking-wider">Vintage Year</label>
                    <input
                      type="text"
                      value={vintage}
                      onChange={(e) => setVintage(e.target.value)}
                      placeholder="2022 or NV"
                      className="w-full mt-1 px-3 py-2.5 rounded-xl bg-black/70 border border-white/15 text-xs text-white focus:outline-none focus:border-champagne-gold font-sans"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-300 uppercase font-sans font-medium tracking-wider">Style</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as WineType)}
                      className="w-full mt-1 px-3 py-2.5 rounded-xl bg-black/70 border border-white/15 text-xs text-white focus:outline-none focus:border-champagne-gold capitalize font-sans"
                    >
                      <option value="red">Red Wine</option>
                      <option value="white">White Wine</option>
                      <option value="rose">Rosé Wine</option>
                      <option value="sparkling">Sparkling Wine</option>
                      <option value="dessert">Dessert Wine</option>
                      <option value="orange">Orange Wine</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-300 uppercase font-sans font-medium tracking-wider">Alcohol (ABV)</label>
                    <input
                      type="text"
                      value={abv}
                      onChange={(e) => setAbv(e.target.value)}
                      placeholder="e.g. 13.5%"
                      className="w-full mt-1 px-3 py-2.5 rounded-xl bg-black/70 border border-white/15 text-xs text-white focus:outline-none focus:border-champagne-gold font-sans"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-300 uppercase font-sans font-medium tracking-wider">Grape Varietal</label>
                    <input
                      type="text"
                      value={grape}
                      onChange={(e) => setGrape(e.target.value)}
                      placeholder="e.g. Malbec, Pinot Noir"
                      className="w-full mt-1 px-3 py-2.5 rounded-xl bg-black/70 border border-white/15 text-xs text-white focus:outline-none focus:border-champagne-gold font-sans"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-300 uppercase font-sans font-medium tracking-wider">Region & Country</label>
                    <input
                      type="text"
                      value={region ? `${region}, ${country}` : country}
                      onChange={(e) => {
                        const parts = e.target.value.split(',');
                        setRegion(parts[0]?.trim() || '');
                        setCountry(parts[1]?.trim() || '');
                      }}
                      placeholder="e.g. Mendoza, Argentina"
                      className="w-full mt-1 px-3 py-2.5 rounded-xl bg-black/70 border border-white/15 text-xs text-white focus:outline-none focus:border-champagne-gold font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* 3. WHERE BOUGHT & PRICE */}
              <div className="p-4 rounded-3xl luxury-card space-y-3">
                <h3 className="text-xs font-sans font-semibold uppercase tracking-wider text-champagne-300 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-champagne-gold" />
                  <span>Purchase Details</span>
                </h3>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-stone-300 uppercase font-sans font-medium tracking-wider">Store / Location</label>
                    <input
                      type="text"
                      value={store}
                      onChange={(e) => setStore(e.target.value)}
                      placeholder="e.g. Waitrose, Trader Joe's"
                      className="w-full mt-1 px-3 py-2.5 rounded-xl bg-black/70 border border-white/15 text-xs text-white focus:outline-none focus:border-champagne-gold font-sans"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-300 uppercase font-sans font-medium tracking-wider">Price Paid</label>
                    <div className="flex mt-1">
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="px-2.5 py-2.5 rounded-l-xl bg-stone-900 border border-r-0 border-white/15 text-xs text-champagne-accent font-sans font-bold"
                      >
                        <option value="£">£</option>
                        <option value="$">$</option>
                        <option value="€">€</option>
                        <option value="A$">A$</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="14.99"
                        className="w-full px-3 py-2.5 rounded-r-xl bg-black/70 border border-white/15 text-xs text-white focus:outline-none focus:border-champagne-gold font-sans"
                      />
                    </div>
                  </div>
                </div>

                {/* Common store pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {COMMON_STORES.slice(0, 6).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStore(st)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border whitespace-nowrap transition-colors font-sans ${
                        store === st
                          ? 'bg-champagne-950 text-champagne-accent border-champagne-500/50 font-bold'
                          : 'bg-black/70 text-stone-300 border-white/10 hover:text-white font-medium'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. COUPLE TASTING RATINGS */}
              <div className="p-4 rounded-3xl luxury-card-gold space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-sans font-semibold uppercase tracking-wider text-champagne-300">
                    Couple Impressions
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-champagne-accent font-sans font-bold">
                    <span>Couple Avg:</span>
                    <span>{(((partner1Rating + partner2Rating) / 2) || 4.5).toFixed(1)}★</span>
                  </div>
                </div>

                {/* Partner 1 Review */}
                <div className="p-3 rounded-2xl bg-black/70 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-sans font-semibold text-stone-100 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-champagne-950 border border-champagne-500/35 text-[11px] font-bold text-champagne-accent flex items-center justify-center">
                        {settings.partner1Name.charAt(0)}
                      </span>
                      <span>{settings.partner1Name}'s Score</span>
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setPartner1Rating(star)}
                          className="text-stone-700 hover:text-champagne-gold transition-colors"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              partner1Rating >= star
                                ? 'fill-champagne-gold text-champagne-gold'
                                : 'text-stone-800'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-sans font-bold text-champagne-accent ml-1">{partner1Rating}★</span>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={partner1Notes}
                    onChange={(e) => setPartner1Notes(e.target.value)}
                    placeholder={`${settings.partner1Name}'s tasting thoughts...`}
                    className="w-full px-3 py-2 rounded-xl bg-stone-900/90 border border-white/10 text-xs text-stone-100 font-sans focus:outline-none focus:border-champagne-gold"
                  />
                </div>

                {/* Partner 2 Review */}
                <div className="p-3 rounded-2xl bg-black/70 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-sans font-semibold text-stone-100 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-champagne-950 border border-champagne-500/35 text-[11px] font-bold text-champagne-accent flex items-center justify-center">
                        {settings.partner2Name.charAt(0)}
                      </span>
                      <span>{settings.partner2Name}'s Score</span>
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setPartner2Rating(star)}
                          className="text-stone-700 hover:text-champagne-gold transition-colors"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              partner2Rating >= star
                                ? 'fill-champagne-gold text-champagne-gold'
                                : 'text-stone-800'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-sans font-bold text-champagne-accent ml-1">{partner2Rating}★</span>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={partner2Notes}
                    onChange={(e) => setPartner2Notes(e.target.value)}
                    placeholder={`${settings.partner2Name}'s tasting thoughts...`}
                    className="w-full px-3 py-2 rounded-xl bg-stone-900/90 border border-white/10 text-xs text-stone-100 font-sans focus:outline-none focus:border-champagne-gold"
                  />
                </div>

                {/* Joint Notes */}
                <div>
                  <label className="text-[11px] text-stone-300 uppercase font-sans font-medium tracking-wider">Joint Cellar Verdict</label>
                  <input
                    type="text"
                    value={jointNotes}
                    onChange={(e) => setJointNotes(e.target.value)}
                    placeholder="e.g. Buy 3 more next time we shop; perfect with Sunday roast!"
                    className="w-full mt-1 px-3 py-2.5 rounded-xl bg-black/70 border border-white/10 text-xs text-stone-100 font-sans focus:outline-none focus:border-champagne-gold"
                  />
                </div>
              </div>

              {/* 5. AROMAS & FLAVORS TAGS */}
              <div className="space-y-1.5">
                <label className="text-xs font-sans font-semibold tracking-wider uppercase text-champagne-300">
                  Flavor & Aroma Bouquet
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-black/50 rounded-2xl border border-white/10">
                  {POPULAR_AROMAS.map((aroma) => {
                    const isSelected = selectedAromas.includes(aroma);
                    return (
                      <button
                        key={aroma}
                        type="button"
                        onClick={() => toggleAroma(aroma)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-sans transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-wine-900 to-wine-950 text-champagne-100 border border-champagne-500/45 font-semibold'
                            : 'bg-stone-900/70 text-stone-300 border border-white/10 hover:border-champagne-500/25 font-medium'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}{aroma}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 modal-footer-safe border-t border-champagne-500/15 bg-[#0f0a0d] flex items-center justify-between gap-3">
          {step === 'details' ? (
            <>
              <button
                type="button"
                onClick={() => setStep('photo')}
                className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-xs font-sans font-semibold text-stone-200 border border-white/15"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-wine-900 via-wine-800 to-black hover:from-wine-800 hover:to-wine-900 text-champagne-100 border border-champagne-500/35 text-xs font-sans font-bold tracking-wide shadow-lg shadow-wine-950 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4 text-champagne-gold" />
                <span>Save to Cellar</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setStep('details')}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-wine-900 via-wine-800 to-black hover:from-wine-800 hover:to-wine-900 text-champagne-100 border border-champagne-500/35 text-xs font-sans font-bold tracking-wide shadow-lg shadow-wine-950 flex items-center justify-center gap-2"
            >
              <span>Continue to Tasting Details</span>
              <ChevronRight className="w-4 h-4 text-champagne-gold" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
