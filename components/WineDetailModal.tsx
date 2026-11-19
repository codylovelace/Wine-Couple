'use client';

import React, { useEffect, useState } from 'react';
import {
  Wine,
  VERDICTS,
  PublicUser,
  PartnerReview,
  PurchaseEntry,
  isTasted,
  partnersDisagree,
} from '@/lib/types';
import { reviewFor, reviewStatus } from '@/lib/wine-logic';
import { formatDate, timeAgo, wineTitle } from '@/lib/format';
import { canonicalShop } from '@/lib/shops';
import { WINE_TYPE_META } from '@/lib/wine-meta';
import { WineRecommendation } from '@/lib/recommendations';
import { MoreLikeThis } from '@/components/MoreLikeThis';
import { ShopPicker } from '@/components/ShopPicker';
import {
  X,
  Star,
  MapPin,
  ExternalLink,
  Bookmark,
  Trash2,
  Edit3,
  Share2,
  ShoppingBag as StoreIcon,
  Wine as WineIcon,
  Send,
  MessageCircle,
  Heart,
  Maximize2,
  Minus,
  Plus,
  Tag,
  ChevronDown,
  Check,
} from 'lucide-react';

interface WineDetailModalProps {
  wine: Wine | null;
  me: PublicUser;
  partner: PublicUser | null;
  onClose: () => void;
  onEdit: (wine: Wine) => void;
  onDelete: (wine: Wine) => Promise<void>;
  onToggleWishlist: (wine: Wine) => void;
  onRate: (wine: Wine) => void;
  onAddComment: (wine: Wine, text: string) => Promise<void>;
  onDeleteComment: (wine: Wine, commentId: string) => Promise<void>;
  onUpdateStock: (wine: Wine, nextStock: number) => Promise<void>;
  onAddPurchase: (wine: Wine, entry: PurchaseEntry, addStock: number) => Promise<void>;
  customShops: string[];
  popularShops?: string[];
  // Lower-cased names already on the wishlist, for the "More like this" buttons.
  wishlistNames: string[];
  onAddToWishlist: (rec: WineRecommendation) => void;
  // Lists every wine bought at this shop.
  onShopClick: (shop: string) => void;
  onToast?: (message: string, tone?: 'success' | 'error' | 'info') => void;
}

const sectionTitle = 'text-[11px] font-semibold tracking-wider text-wine-700 uppercase';
const today = () => new Date().toISOString().split('T')[0];

function formatReviewBadge(r: PartnerReview): string {
  const parts = [
    r.liked === true ? 'Buy Again' : r.liked === false ? 'Pass' : '',
    r.rating > 0 ? `${r.rating}★` : '',
  ].filter(Boolean);
  return parts.join(' · ') || 'Rated';
}

export function WineDetailModal({
  wine,
  me,
  partner,
  onClose,
  onEdit,
  onDelete,
  onToggleWishlist,
  onRate,
  onAddComment,
  onDeleteComment,
  onUpdateStock,
  onAddPurchase,
  customShops,
  popularShops = [],
  wishlistNames,
  onAddToWishlist,
  onShopClick,
  onToast,
}: WineDetailModalProps) {
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const [photoSide, setPhotoSide] = useState<'front' | 'back'>('front');
  const [updatingStock, setUpdatingStock] = useState(false);

  // Repeat purchase mini-form + history drawer
  const [showBoughtForm, setShowBoughtForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [buyShop, setBuyShop] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [buyCurrency, setBuyCurrency] = useState('£');
  const [buyDate, setBuyDate] = useState(today());
  const [buyOffer, setBuyOffer] = useState(false);
  const [buyAddRack, setBuyAddRack] = useState(true);
  const [savingBuy, setSavingBuy] = useState(false);

  useEffect(() => {
    setShowFullPhoto(false);
    setPhotoSide('front');
    setShowBoughtForm(false);
    setShowHistory(false);
    if (wine) {
      setBuyShop(canonicalShop(wine.purchase?.store));
      setBuyPrice(wine.purchase?.price ? String(wine.purchase.price) : '');
      setBuyCurrency(wine.purchase?.currency || '£');
      setBuyDate(today());
      setBuyOffer(false);
      setBuyAddRack(true);
    }
  }, [wine?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!showFullPhoto) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowFullPhoto(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showFullPhoto]);

  if (!wine) return null;

  const verdictConfig = VERDICTS[wine.coupleVerdict] || VERDICTS['okay'];
  const typeMeta = WINE_TYPE_META[wine.type] || WINE_TYPE_META.red;
  const tasted = isTasted(wine);
  const activePhoto = photoSide === 'back' && wine.backImageUrl ? wine.backImageUrl : wine.imageUrl;
  const hasPhoto = Boolean(activePhoto);
  const hasBothPhotos = Boolean(wine.imageUrl && wine.backImageUrl);
  const nameOf = (userId?: string) =>
    userId === me.id ? 'You' : userId && userId === partner?.id ? partner.name : 'Someone';
  const hasProfile = [wine.body, wine.sweetness, wine.tannin, wine.acidity].some((v) => typeof v === 'number');
  const hasPurchase = Boolean(wine.purchase?.store || wine.purchase?.price);
  const history = wine.purchaseHistory ?? [];
  const stockCount = wine.stock ?? 0;
  const comments = wine.comments ?? [];
  const { title: heading, subtitle } = wineTitle(wine);
  const shop = canonicalShop(wine.purchase?.store);

  // Lowest price recorded across current purchase + history
  const allPrices = [
    ...(wine.purchase?.price > 0 ? [wine.purchase.price] : []),
    ...history.filter((h) => h.price > 0).map((h) => h.price),
  ];
  const lowestPrice = allPrices.length > 1 ? Math.min(...allPrices) : null;

  const handleShare = () => {
    const bought = shop
      ? ` Bought at ${shop}${wine.purchase.price ? ` for ${wine.purchase.currency}${wine.purchase.price}` : ''}.`
      : '';
    const score = wine.averageRating > 0 ? `, ${wine.averageRating}★` : '';
    const title = [wine.producer, wine.name].filter(Boolean).join(' ');
    const text = tasted
      ? `We tasted ${title} (${wine.vintage}): ${verdictConfig.label}${score}.${bought}`
      : `On our wine wishlist: ${title} (${wine.vintage}).`;
    if (navigator.share) {
      navigator.share({ title, text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => onToast?.('Copied wine details to clipboard.', 'success'),
        () => window.prompt('Copy the wine details:', text)
      );
    } else {
      window.prompt('Copy the wine details:', text);
    }
  };

  const sendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSending(true);
    setError(null);
    try {
      await onAddComment(wine, comment.trim());
      setComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comment not sent.');
    } finally {
      setSending(false);
    }
  };

  const adjustStock = async (delta: number) => {
    const next = Math.max(0, Math.min(99, stockCount + delta));
    if (next === stockCount) return;
    setUpdatingStock(true);
    try {
      await onUpdateStock(wine, next);
    } finally {
      setUpdatingStock(false);
    }
  };

  const submitRepeatPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBuy(true);
    setError(null);
    try {
      const entry: PurchaseEntry = {
        id: `p-${Date.now()}`,
        store: canonicalShop(buyShop),
        price: parseFloat(buyPrice) || 0,
        currency: buyCurrency,
        date: buyDate || today(),
        isSpecialOffer: buyOffer,
      };
      await onAddPurchase(wine, entry, buyAddRack ? 1 : 0);
      setShowBoughtForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save purchase.');
    } finally {
      setSavingBuy(false);
    }
  };

  const people = [me, partner].filter((p): p is PublicUser => Boolean(p));

  const heroControlBtn = hasPhoto
    ? 'bg-ink-900/65 hover:bg-ink-900/85 text-white border-white/20'
    : 'bg-white hover:bg-linen-100 text-ink-900 border-linen-200 shadow-sm';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink-900/45 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[93dvh] sm:max-h-[89dvh] bg-linen-50 border border-linen-200 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Full-bleed Editorial Hero */}
        <div
          className={`relative h-64 w-full flex-shrink-0 flex items-center justify-center ${
            hasPhoto ? 'bg-ink-900' : 'bg-linen-100 border-b border-linen-200'
          }`}
        >
          {activePhoto ? (
            <>
              <img src={activePhoto} alt={heading} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setShowFullPhoto(true)}
                aria-label="View full bottle photo"
                className="absolute inset-0 z-[5] cursor-zoom-in focus:outline-none"
              />
            </>
          ) : (
            <WineIcon className="w-16 h-16 text-wine-300" />
          )}

          {hasPhoto && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/55 pointer-events-none" />
          )}

          {/* Top Floating Controls */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <button
              type="button"
              onClick={onClose}
              className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center border transition-colors ${heroControlBtn}`}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              {hasPhoto && (
                <button
                  type="button"
                  onClick={() => setShowFullPhoto(true)}
                  aria-label="Expand full bottle photo"
                  className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center border transition-colors ${heroControlBtn}`}
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onToggleWishlist(wine)}
                aria-pressed={Boolean(wine.wishlist)}
                aria-label={wine.wishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center border transition-colors ${
                  wine.wishlist ? 'bg-wine-700 text-white border-wine-600' : heroControlBtn
                }`}
              >
                <Bookmark className={`w-4 h-4 ${wine.wishlist ? 'fill-white text-white' : ''}`} />
              </button>
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share"
                className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center border transition-colors ${heroControlBtn}`}
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Front / Back Label Toggle */}
          {hasBothPhotos && (
            <div className="absolute top-16 right-4 z-10 flex items-center rounded-full bg-ink-900/75 backdrop-blur-md border border-white/20 p-0.5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setPhotoSide('front')}
                className={`px-2.5 py-1 rounded-full transition-colors ${
                  photoSide === 'front' ? 'bg-white text-ink-900' : 'text-white/85 hover:text-white'
                }`}
              >
                Front
              </button>
              <button
                type="button"
                onClick={() => setPhotoSide('back')}
                className={`px-2.5 py-1 rounded-full transition-colors ${
                  photoSide === 'back' ? 'bg-white text-ink-900' : 'text-white/85 hover:text-white'
                }`}
              >
                Back
              </button>
            </div>
          )}

          {/* Hero Bottom Title & Metadata */}
          <div className="absolute bottom-3.5 left-4 right-4 z-10 space-y-1 pointer-events-none">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border ${
                  tasted
                    ? `${verdictConfig.bgClass} ${verdictConfig.colorClass} ${verdictConfig.borderClass}`
                    : 'bg-champagne-100 text-champagne-700 border-champagne-300'
                }`}
              >
                {tasted ? verdictConfig.label : 'To Try'}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                  hasPhoto
                    ? 'bg-ink-900/75 text-white border-white/15'
                    : 'bg-white text-ink-900 border-linen-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${typeMeta.dotClass}`} />
                {typeMeta.label}
              </span>
              {wine.vintage && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border tabular-nums ${
                    hasPhoto
                      ? 'bg-ink-900/75 text-white border-white/15'
                      : 'bg-white text-ink-900 border-linen-200'
                  }`}
                >
                  {wine.vintage}
                </span>
              )}
              {wine.averageRating > 0 && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border tabular-nums ${
                    hasPhoto
                      ? 'bg-ink-900/75 text-champagne-200 border-white/15'
                      : 'bg-white text-ink-900 border-linen-200'
                  }`}
                >
                  <Star className="w-3 h-3 fill-champagne-gold text-champagne-gold" />
                  {wine.averageRating.toFixed(1)}
                </span>
              )}
            </div>
            <h2
              className={`font-serif font-semibold text-3xl leading-tight ${
                hasPhoto ? 'text-white' : 'text-ink-900'
              }`}
            >
              {heading}
            </h2>
            {subtitle && (
              <p className={`text-sm font-medium ${hasPhoto ? 'text-champagne-200' : 'text-wine-700'}`}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 font-sans">
          {/* Purchase, Price History & In-the-Rack Stock Card */}
          <section className="surface-card rounded-2xl overflow-hidden">
            {hasPurchase && (
              <div className="p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  {shop ? (
                    <button
                      type="button"
                      onClick={() => onShopClick(shop)}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-wine-700 hover:text-wine-900 underline decoration-wine-300 underline-offset-4 max-w-full"
                    >
                      <StoreIcon className="w-4 h-4 text-wine-700 flex-shrink-0" />
                      <span className="truncate">{shop}</span>
                    </button>
                  ) : (
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                      <StoreIcon className="w-4 h-4 text-wine-700 flex-shrink-0" />
                      <span className="truncate">Shop not recorded</span>
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5 pl-5 flex-wrap">
                    {wine.purchase.date && (
                      <span className="text-xs text-ink-500">
                        {tasted ? 'Bought' : 'Saved'} {formatDate(wine.purchase.date)}
                      </span>
                    )}
                    {wine.purchase.isSpecialOffer && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold">
                        <Tag className="w-2.5 h-2.5" /> Offer
                      </span>
                    )}
                  </div>
                </div>
                {wine.purchase.price > 0 && (
                  <div className="text-right flex-shrink-0">
                    <span className="block text-lg font-semibold text-ink-900 tabular-nums">
                      {wine.purchase.currency}
                      {Number(wine.purchase.price).toFixed(2)}
                    </span>
                    {lowestPrice !== null && (
                      <span className="block text-[10px] text-emerald-700 font-semibold tabular-nums">
                        Low {wine.purchase.currency}
                        {lowestPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* In the rack stepper + Bought again action */}
            <div
              className={`px-3.5 py-2.5 flex items-center justify-between gap-2 bg-linen-50/70 ${
                hasPurchase ? 'border-t border-linen-100' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-ink-700">In the rack</span>
                <div className="inline-flex items-center rounded-xl bg-white border border-linen-200">
                  <button
                    type="button"
                    disabled={updatingStock || stockCount <= 0}
                    onClick={() => adjustStock(-1)}
                    aria-label="Decrease rack count"
                    className="p-1.5 text-ink-700 hover:text-wine-700 disabled:opacity-35"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-xs font-semibold text-ink-900 tabular-nums min-w-[24px] text-center">
                    {stockCount}
                  </span>
                  <button
                    type="button"
                    disabled={updatingStock}
                    onClick={() => adjustStock(1)}
                    aria-label="Increase rack count"
                    className="p-1.5 text-ink-700 hover:text-wine-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowBoughtForm((s) => !s)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-linen-100 border border-linen-200 text-xs font-semibold text-wine-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Bought again</span>
              </button>
            </div>

            {/* Inline Bought Again Form */}
            {showBoughtForm && (
              <form
                onSubmit={submitRepeatPurchase}
                className="p-3.5 border-t border-linen-200 bg-white space-y-2.5 animate-fadeIn"
              >
                {popularShops.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {popularShops.slice(0, 4).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setBuyShop(s)}
                        className={`px-2 py-0.5 rounded-md text-[11px] border ${
                          canonicalShop(buyShop) === s
                            ? 'bg-wine-700 text-white border-wine-700 font-semibold'
                            : 'bg-linen-50 text-ink-700 border-linen-200'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                <ShopPicker
                  value={buyShop}
                  onChange={setBuyShop}
                  customShops={customShops}
                  selectClass="w-full px-3 py-2 text-xs field-input"
                  inputClass="w-full px-3 py-2 text-xs field-input"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex">
                    <select
                      value={buyCurrency}
                      onChange={(e) => setBuyCurrency(e.target.value)}
                      className="px-2 py-2 rounded-l-xl bg-linen-100 border border-r-0 border-linen-200 text-xs text-ink-900 font-semibold"
                    >
                      {['£', '$', '€', 'A$'].map((c) => (
                        <option key={c} value={c} className="bg-white text-ink-900">
                          {c}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={buyPrice}
                      onChange={(e) => setBuyPrice(e.target.value)}
                      placeholder="12.00"
                      className="w-full px-2.5 py-2 text-xs field-input rounded-l-none min-w-0"
                    />
                  </div>
                  <input
                    type="date"
                    value={buyDate}
                    onChange={(e) => setBuyDate(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs field-input"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setBuyOffer((o) => !o)}
                    aria-pressed={buyOffer}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium ${
                      buyOffer
                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                        : 'bg-linen-50 border-linen-200 text-ink-700'
                    }`}
                  >
                    <Tag className="w-3 h-3" /> Offer
                  </button>
                  <label className="inline-flex items-center gap-1.5 text-ink-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={buyAddRack}
                      onChange={(e) => setBuyAddRack(e.target.checked)}
                      className="rounded border-linen-300 text-wine-700"
                    />
                    <span>+1 to rack</span>
                  </label>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowBoughtForm(false)}
                    className="px-3 py-2 rounded-xl btn-secondary text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingBuy}
                    className="flex-1 py-2 rounded-xl btn-primary text-xs font-semibold flex items-center justify-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{savingBuy ? 'Saving…' : 'Save purchase'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Collapsible Price History */}
            {history.length > 0 && (
              <div className="border-t border-linen-100">
                <button
                  type="button"
                  onClick={() => setShowHistory((s) => !s)}
                  aria-expanded={showHistory}
                  className="w-full px-3.5 py-2 flex items-center justify-between text-xs font-medium text-ink-500 hover:text-ink-900"
                >
                  <span>Price history ({history.length})</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                </button>
                {showHistory && (
                  <ul className="px-3.5 pb-2.5 space-y-1.5 text-xs border-t border-linen-100 pt-2">
                    {history.map((h) => (
                      <li key={h.id} className="flex items-center justify-between gap-2 text-ink-700">
                        <span className="truncate">
                          {h.store || 'Shop not recorded'}
                          {h.date ? ` · ${formatDate(h.date)}` : ''}
                          {h.isSpecialOffer ? ' · Offer' : ''}
                        </span>
                        {h.price > 0 && (
                          <span className="font-semibold text-ink-900 tabular-nums flex-shrink-0">
                            {h.currency}
                            {Number(h.price).toFixed(2)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* Untasted Wishlist Banner */}
          {!tasted && (
            <section className="p-4 rounded-2xl surface-highlight flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-wine-700 block">
                  Saved to try later
                </span>
                <p className="text-xs text-ink-700 mt-0.5">
                  Tried this bottle? Log your tasting &amp; verdict.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEdit(wine)}
                className="px-3.5 py-2 rounded-xl btn-primary text-xs font-semibold flex-shrink-0"
              >
                Log a Tasting
              </button>
            </section>
          )}

          {/* Couple Verdicts Side-by-Side */}
          {tasted && (
            <section className="space-y-2.5">
              <h3 className={sectionTitle}>Couple Verdicts</h3>
              <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2.5">
                {people.map((person) => {
                  const status = reviewStatus(wine, person.slot);
                  const review = reviewFor(wine, person.slot);
                  const isMe = person.id === me.id;
                  return (
                    <div
                      key={person.id}
                      className="p-3.5 rounded-2xl surface-card flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="w-7 h-7 flex-shrink-0 rounded-full bg-wine-700 text-xs font-bold text-white flex items-center justify-center">
                            {person.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="text-sm font-semibold text-ink-900 truncate">
                            {isMe ? 'You' : person.name}
                          </span>
                        </span>

                        {isMe && status === 'rated' && (
                          <button
                            type="button"
                            onClick={() => onRate(wine)}
                            className="text-[11px] font-semibold text-wine-700 hover:text-wine-900 underline underline-offset-2"
                          >
                            Edit
                          </button>
                        )}
                      </div>

                      {status === 'rated' && review ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                review.liked === true
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : review.liked === false
                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                    : 'bg-champagne-100 text-champagne-700 border-champagne-300'
                              }`}
                            >
                              {review.liked === true && <Heart className="w-3 h-3 fill-emerald-500/30" />}
                              {review.liked === false && <X className="w-3 h-3" />}
                              <span>{formatReviewBadge(review)}</span>
                            </span>
                          </div>
                          {review.notes && (
                            <p className="text-xs text-ink-700 leading-relaxed">{review.notes}</p>
                          )}
                        </div>
                      ) : status === 'not-tasted' ? (
                        <p className="text-xs text-ink-500">Didn&apos;t taste it</p>
                      ) : isMe ? (
                        <button
                          type="button"
                          onClick={() => onRate(wine)}
                          className="w-full py-2 rounded-xl btn-primary text-xs font-semibold"
                        >
                          Rate it
                        </button>
                      ) : (
                        <p className="text-xs text-amber-800 font-medium">Hasn&apos;t rated yet</p>
                      )}
                    </div>
                  );
                })}
              </div>
              {partnersDisagree(wine) && wine.coupleVerdict !== 'split' && (
                <p className="text-xs text-violet-800 font-medium">
                  You and {partner?.name ?? 'your partner'} disagreed on this one.
                </p>
              )}
            </section>
          )}

          {/* Wine Identity */}
          <section className="p-3.5 rounded-2xl surface-card space-y-2 text-sm text-ink-900">
            <h3 className={sectionTitle}>Bottle Details</h3>
            <p className="flex items-start gap-2 text-xs text-ink-900">
              <MapPin className="w-4 h-4 text-wine-700 flex-shrink-0 mt-0.5" />
              <span>{[wine.region, wine.country].filter(Boolean).join(', ') || 'Origin not recorded'}</span>
            </p>
            <p className="pl-6 text-xs text-ink-500">
              {[typeMeta.label, wine.grape, wine.abv].filter(Boolean).join(' · ')}
            </p>
          </section>

          {wine.jointNotes && (
            <section className="p-3.5 rounded-2xl surface-highlight space-y-1">
              <h3 className={sectionTitle}>Shared Notes</h3>
              <p className="text-sm text-ink-900 leading-relaxed whitespace-pre-wrap">{wine.jointNotes}</p>
            </section>
          )}

          {hasProfile && (
            <section className="p-4 rounded-2xl surface-card space-y-3">
              <h3 className={sectionTitle}>Taste profile (from the label)</h3>
              {(
                [
                  ['Body', 'Light → Full', wine.body],
                  ['Sweetness', 'Dry → Sweet', wine.sweetness],
                  ['Tannin', 'Soft → Grippy', wine.tannin],
                  ['Acidity', 'Soft → Crisp', wine.acidity],
                ] as const
              )
                .filter(([, , v]) => typeof v === 'number')
                .map(([label, range, v]) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs text-ink-700 mb-1">
                      <span>
                        {label} <span className="text-ink-400">({range})</span>
                      </span>
                      <span className="text-ink-900 font-semibold tabular-nums">{v} / 5</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-linen-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-wine-700 to-champagne-500 rounded-full"
                        style={{ width: `${((v as number) / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </section>
          )}

          {wine.aromaTags && wine.aromaTags.length > 0 && (
            <section className="space-y-2">
              <h3 className={sectionTitle}>Aromas &amp; flavours</h3>
              <div className="flex flex-wrap gap-1.5">
                {wine.aromaTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-lg bg-linen-100 border border-linen-200 text-xs text-ink-900 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          {wine.foodPairings && wine.foodPairings.length > 0 && (
            <section className="space-y-2">
              <h3 className={sectionTitle}>Goes with</h3>
              <div className="flex flex-wrap gap-1.5">
                {wine.foodPairings.map((food) => (
                  <span
                    key={food}
                    className="px-2.5 py-1 rounded-lg bg-linen-100 border border-linen-200 text-xs text-ink-900 font-medium"
                  >
                    {food}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Find it online */}
          <section className="space-y-2">
            <h3 className={sectionTitle}>Find it online</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Wine-Searcher', wine.onlineLinks?.wineSearcher],
                ['Vivino', wine.onlineLinks?.vivino],
                ['Google Shopping', wine.onlineLinks?.googleShopping],
                ['Supermarkets', wine.onlineLinks?.supermarketSearch],
              ]
                .filter((link): link is [string, string] => Boolean(link[1]))
                .map(([label, href]) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl surface-card hover:border-wine-300 text-xs text-ink-900 font-medium transition-colors"
                  >
                    <span>{label}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-ink-400" />
                  </a>
                ))}
            </div>
          </section>

          {/* Comments */}
          <section className="space-y-2.5">
            <h3 className={`${sectionTitle} flex items-center gap-1.5`}>
              <MessageCircle className="w-3.5 h-3.5 text-wine-700" />
              <span>Conversation</span>
            </h3>
            {comments.length === 0 && (
              <p className="text-xs text-ink-500">No comments yet. Start the conversation.</p>
            )}
            <ul className="space-y-2">
              {comments.map((c) => {
                const mine = c.authorId === me.id;
                return (
                  <li
                    key={c.id}
                    className={`p-3 rounded-2xl border text-sm ${
                      mine
                        ? 'bg-wine-50 border-wine-200 ml-6'
                        : 'bg-white border-linen-200 mr-6 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] text-ink-500 mb-0.5">
                      <span>
                        <strong className="text-ink-900">{nameOf(c.authorId)}</strong> · {timeAgo(c.createdAt)}
                      </span>
                      {mine && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Delete this comment?')) {
                              onDeleteComment(wine, c.id).catch((err) => setError(err.message));
                            }
                          }}
                          aria-label="Delete comment"
                          className="text-ink-400 hover:text-rose-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-ink-900 whitespace-pre-wrap break-words text-xs leading-relaxed">{c.text}</p>
                  </li>
                );
              })}
            </ul>
            <form onSubmit={sendComment} className="flex items-end gap-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={1}
                maxLength={2000}
                placeholder={partner ? `Say something to ${partner.name}…` : 'Add a comment…'}
                className="flex-1 px-3 py-2.5 text-sm field-input resize-none"
              />
              <button
                type="submit"
                disabled={sending || !comment.trim()}
                aria-label="Send comment"
                className="w-10 h-10 flex-shrink-0 rounded-xl btn-primary flex items-center justify-center disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            {error && (
              <p className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-2" role="alert">
                {error}
              </p>
            )}
          </section>

          <MoreLikeThis
            key={wine.id}
            wineId={wine.id}
            wishlistNames={wishlistNames}
            onAddToWishlist={onAddToWishlist}
          />

          <p className="text-[11px] text-ink-400 text-center pb-1">
            {wine.createdBy ? `Added by ${nameOf(wine.createdBy)}` : 'Added'} {timeAgo(wine.createdAt)}
            {wine.updatedBy && wine.updatedAt !== wine.createdAt
              ? ` · updated by ${nameOf(wine.updatedBy)} ${timeAgo(wine.updatedAt)}`
              : ''}
          </p>
        </div>

        <div className="p-3.5 modal-footer-safe border-t border-linen-200 bg-white flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete ${heading} for both of you? This can't be undone.`)) {
                onDelete(wine).catch((err) => setError(err.message));
              }
            }}
            className="p-3 rounded-xl btn-secondary hover:!bg-rose-50 hover:!border-rose-300 hover:!text-rose-700"
            aria-label="Delete wine"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(wine)}
            className="flex-1 py-3 px-4 rounded-xl btn-primary text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            <span>{tasted ? 'Edit Details' : 'Log Tasting'}</span>
          </button>
        </div>
      </div>

      {/* Full Bottle Photo Lightbox */}
      {showFullPhoto && activePhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Full photo of ${heading}`}
          onClick={(e) => {
            e.stopPropagation();
            setShowFullPhoto(false);
          }}
          className="fixed inset-0 z-[60] bg-ink-900/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fadeIn cursor-zoom-out"
        >
          <div className="w-full max-w-2xl flex items-center justify-between pt-safe mb-3">
            {hasBothPhotos ? (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center rounded-full bg-white/15 border border-white/20 p-0.5 text-xs font-semibold"
              >
                <button
                  type="button"
                  onClick={() => setPhotoSide('front')}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    photoSide === 'front' ? 'bg-white text-ink-900' : 'text-white/85 hover:text-white'
                  }`}
                >
                  Front
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoSide('back')}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    photoSide === 'back' ? 'bg-white text-ink-900' : 'text-white/85 hover:text-white'
                  }`}
                >
                  Back
                </button>
              </div>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowFullPhoto(false);
              }}
              aria-label="Close full photo"
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center border border-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <img
            src={activePhoto}
            alt={heading}
            className="max-w-full max-h-[80dvh] w-auto h-auto object-contain rounded-2xl shadow-2xl border border-white/15"
          />
          <div className="mt-4 text-center space-y-0.5 max-w-md px-2">
            <p className="font-serif text-xl font-semibold text-white leading-tight">{heading}</p>
            {(subtitle || wine.vintage) && (
              <p className="text-xs text-champagne-200">
                {[subtitle, wine.vintage].filter(Boolean).join(' · ')}
              </p>
            )}
            <p className="text-[11px] text-stone-300 pt-1">Tap anywhere to close</p>
          </div>
        </div>
      )}
    </div>
  );
}
