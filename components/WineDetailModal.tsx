'use client';

import React from 'react';
import { Wine, VERDICTS, UserSettings } from '@/lib/types';
import { 
  X, Star, MapPin, ExternalLink, Bookmark, Heart, 
  Trash2, Edit3, Share2, Sparkles, Calendar,
  ShoppingBag as StoreIcon, Globe, Wine as WineIcon
} from 'lucide-react';

interface WineDetailModalProps {
  wine: Wine | null;
  settings: UserSettings;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (wine: Wine) => void;
  onDelete: (id: string) => void;
  onToggleWishlist: (wine: Wine) => void;
  onToggleFavorite: (wine: Wine) => void;
}

export function WineDetailModal({
  wine,
  settings,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onToggleWishlist,
  onToggleFavorite,
}: WineDetailModalProps) {
  if (!isOpen || !wine) return null;

  const verdictConfig = VERDICTS[wine.coupleVerdict] || VERDICTS['good'];

  const handleShare = () => {
    const bought = wine.purchase?.store
      ? ` Bought at ${wine.purchase.store}${wine.purchase.price ? ` for ${wine.purchase.currency}${wine.purchase.price}` : ''}.`
      : '';
    const text = `We tasted ${wine.producer} ${wine.name} (${wine.vintage}): ${verdictConfig.label}, ${wine.averageRating}★.${bought}`;
    // navigator.share and navigator.clipboard only exist on HTTPS (or localhost),
    // so on a plain-HTTP LAN address fall back to a prompt the user can copy from.
    if (navigator.share) {
      navigator.share({ title: `${wine.producer} - ${wine.name} (${wine.vintage})`, text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => alert('Wine details copied to clipboard.'),
        () => window.prompt('Copy the wine details:', text)
      );
    } else {
      window.prompt('Copy the wine details:', text);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-md max-h-[92dvh] sm:max-h-[88dvh] bg-[#0f0a0d] border border-champagne-500/25 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Image & Controls */}
        <div className="relative h-64 w-full bg-black flex-shrink-0 flex items-center justify-center">
          {wine.imageUrl ? (
            <img
              src={wine.imageUrl}
              alt={wine.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <WineIcon className="w-16 h-16 text-champagne-500/30" />
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0a0d] via-[#0f0a0d]/45 to-black/75" />

          {/* Top Bar Buttons */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-black/70 backdrop-blur-md text-stone-100 flex items-center justify-center hover:bg-black border border-white/15"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleFavorite(wine)}
                className={`w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center border transition-all ${
                  wine.favorite
                    ? 'bg-rose-900/90 text-white border-champagne-500/40'
                    : 'bg-black/70 text-stone-200 hover:text-white border-white/15'
                }`}
                title="Favorite"
              >
                <Heart className={`w-4 h-4 ${wine.favorite ? 'fill-rose-400 text-rose-400' : ''}`} />
              </button>

              <button
                onClick={() => onToggleWishlist(wine)}
                className={`w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center border transition-all ${
                  wine.wishlist
                    ? 'bg-champagne-950 text-champagne-accent border-champagne-500/50'
                    : 'bg-black/70 text-stone-200 hover:text-white border-white/15'
                }`}
                title="Add to Wishlist"
              >
                <Bookmark className={`w-4 h-4 ${wine.wishlist ? 'fill-champagne-gold text-champagne-gold' : ''}`} />
              </button>

              <button
                onClick={handleShare}
                className="w-9 h-9 rounded-full bg-black/70 backdrop-blur-md text-stone-200 hover:text-white flex items-center justify-center border border-white/15"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottom Title on Image */}
          <div className="absolute bottom-3 left-4 right-4 z-10">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-sans font-semibold tracking-wide uppercase border ${verdictConfig.bgClass} ${verdictConfig.colorClass} ${verdictConfig.borderClass}`}
              >
                <span>{verdictConfig.label}</span>
              </span>

              {wine.vintage && (
                <span className="px-2.5 py-0.5 rounded-full bg-black/80 text-champagne-100 text-xs font-sans font-bold border border-champagne-500/30">
                  {wine.vintage}
                </span>
              )}
            </div>

            <h2 className="font-serif font-semibold text-2xl text-white leading-tight">
              {wine.name}
            </h2>
            <p className="text-xs text-champagne-200 font-sans font-medium tracking-wide mt-0.5">{wine.producer}</p>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 font-sans">
          {/* Quick Details Chips */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-2xl bg-stone-900/70 border border-white/10 text-center">
              <span className="text-[11px] uppercase font-sans font-semibold tracking-wider text-champagne-300 block mb-0.5">
                Style
              </span>
              <span className="text-xs font-sans font-bold text-stone-100 capitalize">
                {wine.type} Wine
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-stone-900/70 border border-white/10 text-center">
              <span className="text-[11px] uppercase font-sans font-semibold tracking-wider text-champagne-300 block mb-0.5">
                Couple Score
              </span>
              <div className="flex items-center justify-center gap-1 text-xs font-sans font-bold text-champagne-accent">
                <Star className="w-3.5 h-3.5 fill-champagne-gold text-champagne-gold" />
                <span>{wine.averageRating.toFixed(1)} / 5.0</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-stone-900/70 border border-white/10 text-center">
              <span className="text-[11px] uppercase font-sans font-semibold tracking-wider text-champagne-300 block mb-0.5">
                Alcohol (ABV)
              </span>
              <span className="text-xs font-sans font-bold text-stone-100">
                {wine.abv || '13.5%'}
              </span>
            </div>
          </div>

          {/* Region & Grape */}
          <div className="p-3.5 rounded-2xl bg-stone-900/50 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-xs text-stone-200">
              <MapPin className="w-4 h-4 text-champagne-400 flex-shrink-0" />
              <span className="font-semibold text-champagne-300">Origin:</span>
              <span>{[wine.region, wine.country].filter(Boolean).join(', ') || 'Unknown'}</span>
            </div>
            {wine.grape && (
              <div className="flex items-center gap-2 text-xs text-stone-200 pl-6">
                <span className="font-semibold text-champagne-300">Grape Varietal:</span>
                <span>{wine.grape}</span>
              </div>
            )}
          </div>

          {/* Section: Where We Bought It */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-stone-900/90 to-black border border-white/15 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-sans font-semibold tracking-wider text-champagne-300 uppercase">
                <StoreIcon className="w-4 h-4 text-champagne-gold" />
                <span>Where We Bought It</span>
              </div>
              {wine.purchase?.isSpecialOffer && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-200 border border-emerald-700 font-semibold font-sans">
                  Special Promotion
                </span>
              )}
            </div>

            <div className="flex items-center justify-between bg-black/70 p-3 rounded-xl border border-white/10">
              <div>
                <p className="text-sm font-sans font-bold text-stone-100">{wine.purchase?.store || 'Not recorded'}</p>
                {wine.purchase?.date && (
                  <p className="text-xs text-stone-300 flex items-center gap-1 mt-0.5 font-sans">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    <span>Tasted on: {wine.purchase.date}</span>
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="font-sans text-lg font-bold text-champagne-accent">
                  {wine.purchase?.currency || '£'}{Number(wine.purchase?.price || 0).toFixed(2)}
                </span>
                <span className="block text-[11px] text-stone-300 font-sans">per bottle</span>
              </div>
            </div>

            {wine.purchase?.notes && (
              <p className="text-xs text-stone-200 pl-1 font-sans">
                {wine.purchase.notes}
              </p>
            )}
          </div>

          {/* Section: Where to Buy Online */}
          <div className="p-4 rounded-2xl luxury-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-sans font-semibold tracking-wider text-champagne-300 uppercase">
                <Globe className="w-4 h-4 text-champagne-gold" />
                <span>Where To Purchase Online</span>
              </div>
              <span className="text-[11px] text-stone-300 font-sans">Direct merchant search</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={wine.onlineLinks?.wineSearcher || `https://www.wine-searcher.com/find/${encodeURIComponent(wine.producer + ' ' + wine.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-white/10 hover:border-champagne-500/35 text-xs text-stone-100 font-medium transition-all group font-sans"
              >
                <span>Wine-Searcher</span>
                <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-champagne-accent" />
              </a>

              <a
                href={wine.onlineLinks?.vivino || `https://www.vivino.com/search/wines?q=${encodeURIComponent(wine.producer + ' ' + wine.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-white/10 hover:border-champagne-500/35 text-xs text-stone-100 font-medium transition-all group font-sans"
              >
                <span>Vivino</span>
                <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-champagne-accent" />
              </a>

              <a
                href={wine.onlineLinks?.googleShopping || `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(wine.producer + ' ' + wine.name + ' wine')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-white/10 hover:border-champagne-500/35 text-xs text-stone-100 font-medium transition-all group font-sans"
              >
                <span>Google Buy</span>
                <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-champagne-accent" />
              </a>

              <a
                href={wine.onlineLinks?.supermarketSearch || `https://www.google.com/search?q=${encodeURIComponent(wine.producer + ' ' + wine.name + ' wine buy UK price')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-white/10 hover:border-champagne-500/35 text-xs text-stone-100 font-medium transition-all group font-sans"
              >
                <span>Supermarket Deals</span>
                <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-champagne-accent" />
              </a>
            </div>
          </div>

          {/* Section: Couple Reviews & Notes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-sans font-semibold tracking-wider text-champagne-300 uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-champagne-gold" />
                <span>Couple Tasting Impressions</span>
              </h4>
            </div>

            {/* Partner 1 Review */}
            <div className="p-3.5 rounded-2xl bg-stone-900/70 border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-champagne-950 border border-champagne-500/35 text-xs font-sans font-bold text-champagne-accent flex items-center justify-center">
                    {settings.partner1Name.charAt(0)}
                  </span>
                  <span className="text-xs font-sans font-bold text-stone-100">{settings.partner1Name}</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-sans font-bold text-champagne-accent">
                  <Star className="w-3.5 h-3.5 fill-champagne-gold text-champagne-gold" />
                  <span>{wine.partner1Review?.rating?.toFixed(1) || wine.averageRating.toFixed(1)} ★</span>
                </div>
              </div>
              <p className="text-xs text-stone-200 font-sans leading-relaxed">
                {wine.partner1Review?.notes || 'No individual notes recorded.'}
              </p>
            </div>

            {/* Partner 2 Review */}
            <div className="p-3.5 rounded-2xl bg-stone-900/70 border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-champagne-950 border border-champagne-500/35 text-xs font-sans font-bold text-champagne-accent flex items-center justify-center">
                    {settings.partner2Name.charAt(0)}
                  </span>
                  <span className="text-xs font-sans font-bold text-stone-100">{settings.partner2Name}</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-sans font-bold text-champagne-accent">
                  <Star className="w-3.5 h-3.5 fill-champagne-gold text-champagne-gold" />
                  <span>{wine.partner2Review?.rating?.toFixed(1) || wine.averageRating.toFixed(1)} ★</span>
                </div>
              </div>
              <p className="text-xs text-stone-200 font-sans leading-relaxed">
                {wine.partner2Review?.notes || 'No individual notes recorded.'}
              </p>
            </div>

            {/* Joint Conclusion */}
            {wine.jointNotes && (
              <div className="p-3.5 rounded-2xl bg-[#1a0c13] border border-champagne-500/25">
                <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-champagne-accent block mb-1">
                  Joint Cellar Verdict
                </span>
                <p className="text-xs text-stone-100 font-sans leading-relaxed">
                  {wine.jointNotes}
                </p>
              </div>
            )}
          </div>

          {/* Section: Taste Profile Sliders */}
          <div className="p-4 rounded-2xl bg-stone-900/60 border border-white/10 space-y-3">
            <h4 className="text-xs font-sans font-semibold tracking-wider uppercase text-champagne-300">
              Taste Profile Harmony
            </h4>
            
            {/* Body */}
            <div>
              <div className="flex justify-between text-xs text-stone-300 mb-1 font-sans">
                <span>Body (Light → Bold)</span>
                <span className="text-champagne-accent font-semibold">{wine.body || 3} / 5</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-black/70 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-wine-700 to-wine-500 rounded-full"
                  style={{ width: `${((wine.body || 3) / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Dryness */}
            <div>
              <div className="flex justify-between text-xs text-stone-300 mb-1 font-sans">
                <span>Dryness (Bone Dry → Sweet)</span>
                <span className="text-champagne-accent font-semibold">{wine.sweetness || 1} / 5</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-black/70 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-champagne-700 to-champagne-gold rounded-full"
                  style={{ width: `${((wine.sweetness || 1) / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Tannin */}
            <div>
              <div className="flex justify-between text-xs text-stone-300 mb-1 font-sans">
                <span>Tannins (Smooth → Grippy)</span>
                <span className="text-champagne-accent font-semibold">{wine.tannin || 3} / 5</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-black/70 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-stone-600 to-stone-400 rounded-full"
                  style={{ width: `${((wine.tannin || 3) / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Acidity */}
            <div>
              <div className="flex justify-between text-xs text-stone-300 mb-1 font-sans">
                <span>Acidity (Soft → Crisp)</span>
                <span className="text-champagne-accent font-semibold">{wine.acidity || 3} / 5</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-black/70 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-700 to-cyan-400 rounded-full"
                  style={{ width: `${((wine.acidity || 3) / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Aroma Tags */}
          {wine.aromaTags && wine.aromaTags.length > 0 && (
            <div>
              <span className="text-xs font-sans font-semibold uppercase tracking-wider text-champagne-300 block mb-2">
                Aromas & Flavor Bouquet
              </span>
              <div className="flex flex-wrap gap-1.5">
                {wine.aromaTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-lg bg-stone-900/90 border border-white/15 text-xs text-stone-100 font-sans font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Food Pairings */}
          {wine.foodPairings && wine.foodPairings.length > 0 && (
            <div>
              <span className="text-xs font-sans font-semibold uppercase tracking-wider text-champagne-300 block mb-2">
                Recommended Food Pairings
              </span>
              <div className="flex flex-wrap gap-1.5">
                {wine.foodPairings.map((food) => (
                  <span
                    key={food}
                    className="px-2.5 py-1 rounded-lg bg-stone-900/90 border border-white/15 text-xs text-stone-100 font-sans font-medium"
                  >
                    {food}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-3.5 modal-footer-safe border-t border-champagne-500/15 bg-[#0f0a0d] flex items-center justify-between gap-2.5">
          <button
            onClick={() => {
              if (confirm(`Are you sure you want to delete ${wine.name}?`)) {
                onDelete(wine.id);
                onClose();
              }
            }}
            className="p-2.5 rounded-xl bg-stone-900 hover:bg-rose-950 text-stone-300 hover:text-rose-200 border border-white/10 hover:border-rose-800 transition-colors"
            title="Delete Wine"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              onEdit(wine);
              onClose();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-wine-900 via-wine-800 to-black hover:from-wine-800 hover:to-wine-900 text-champagne-100 border border-champagne-500/35 text-xs font-sans font-bold tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-wine-950 transition-all"
          >
            <Edit3 className="w-4 h-4 text-champagne-300" />
            <span>Edit Wine & Reviews</span>
          </button>
        </div>
      </div>
    </div>
  );
}
