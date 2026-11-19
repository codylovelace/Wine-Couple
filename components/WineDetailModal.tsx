'use client';

import React, { useState } from 'react';
import { Wine, VERDICTS, PublicUser, PartnerReview, isTasted, partnersDisagree } from '@/lib/types';
import { reviewFor, reviewStatus } from '@/lib/wine-logic';
import { formatDate, timeAgo, wineTitle } from '@/lib/format';
import { canonicalShop } from '@/lib/shops';
import { WINE_TYPE_META } from '@/lib/wine-meta';
import { WineRecommendation } from '@/lib/recommendations';
import { MoreLikeThis } from '@/components/MoreLikeThis';
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
  // Lower-cased names already on the wishlist, for the "More like this" buttons.
  wishlistNames: string[];
  onAddToWishlist: (rec: WineRecommendation) => void;
  // Lists every wine bought at this shop.
  onShopClick: (shop: string) => void;
  onToast?: (message: string, tone?: 'success' | 'error' | 'info') => void;
}

const sectionTitle = 'text-[11px] font-semibold tracking-wider text-champagne-300 uppercase';

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
  wishlistNames,
  onAddToWishlist,
  onShopClick,
  onToast,
}: WineDetailModalProps) {
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!wine) return null;

  const verdictConfig = VERDICTS[wine.coupleVerdict] || VERDICTS['okay'];
  const typeMeta = WINE_TYPE_META[wine.type] || WINE_TYPE_META.red;
  const tasted = isTasted(wine);
  const nameOf = (userId?: string) =>
    userId === me.id ? 'You' : userId && userId === partner?.id ? partner.name : 'Someone';
  const hasProfile = [wine.body, wine.sweetness, wine.tannin, wine.acidity].some((v) => typeof v === 'number');
  const hasPurchase = Boolean(wine.purchase?.store || wine.purchase?.price);
  const comments = wine.comments ?? [];
  const { title: heading, subtitle } = wineTitle(wine);
  const shop = canonicalShop(wine.purchase?.store);

  const handleShare = () => {
    const bought = shop
      ? ` Bought at ${shop}${wine.purchase.price ? ` for ${wine.purchase.currency}${wine.purchase.price}` : ''}.`
      : '';
    const score = wine.averageRating > 0 ? `, ${wine.averageRating}★` : '';
    const title = [wine.producer, wine.name].filter(Boolean).join(' ');
    const text = tasted
      ? `We tasted ${title} (${wine.vintage}): ${verdictConfig.label}${score}.${bought}`
      : `On our wine wishlist: ${title} (${wine.vintage}).`;
    // navigator.share and navigator.clipboard only exist on HTTPS (or localhost),
    // so on a plain-HTTP LAN address fall back to a prompt the user can copy from.
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

  const people = [me, partner].filter((p): p is PublicUser => Boolean(p));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[93dvh] sm:max-h-[89dvh] bg-cellar-900 border border-white/10 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Full-bleed Editorial Hero */}
        <div className="relative h-64 w-full bg-cellar-950 flex-shrink-0 flex items-center justify-center">
          {wine.imageUrl ? (
            <img src={wine.imageUrl} alt={heading} className="w-full h-full object-cover" />
          ) : (
            <WineIcon className="w-16 h-16 text-champagne-400/25" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-cellar-900 via-cellar-900/50 to-black/70" />

          {/* Top Floating Controls */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-black/65 hover:bg-black/85 backdrop-blur-md text-stone-100 flex items-center justify-center border border-white/15 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleWishlist(wine)}
                aria-pressed={Boolean(wine.wishlist)}
                aria-label={wine.wishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center border transition-colors ${
                  wine.wishlist
                    ? 'bg-wine-800/90 text-champagne-100 border-champagne-400/50'
                    : 'bg-black/65 hover:bg-black/85 text-stone-200 border-white/15'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${wine.wishlist ? 'fill-champagne-gold text-champagne-gold' : ''}`} />
              </button>
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share"
                className="w-10 h-10 rounded-full bg-black/65 hover:bg-black/85 backdrop-blur-md text-stone-200 flex items-center justify-center border border-white/15 transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Hero Bottom Title & Metadata */}
          <div className="absolute bottom-3.5 left-4 right-4 z-10 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border ${
                  tasted
                    ? `${verdictConfig.bgClass} ${verdictConfig.colorClass} ${verdictConfig.borderClass}`
                    : 'bg-champagne-950/80 text-champagne-200 border-champagne-400/30'
                }`}
              >
                {tasted ? verdictConfig.label : 'To Try'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/75 text-stone-200 text-[11px] font-medium border border-white/10">
                <span className={`w-2 h-2 rounded-full ${typeMeta.dotClass}`} />
                {typeMeta.label}
              </span>
              {wine.vintage && (
                <span className="px-2.5 py-0.5 rounded-full bg-black/75 text-champagne-100 text-[11px] font-semibold border border-white/10 tabular-nums">
                  {wine.vintage}
                </span>
              )}
              {wine.averageRating > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/75 text-champagne-200 text-[11px] font-semibold border border-champagne-400/25 tabular-nums">
                  <Star className="w-3 h-3 fill-champagne-gold text-champagne-gold" />
                  {wine.averageRating.toFixed(1)}
                </span>
              )}
            </div>
            <h2 className="font-serif font-semibold text-3xl text-champagne-50 leading-tight">{heading}</h2>
            {subtitle && <p className="text-sm text-champagne-200/90 font-medium">{subtitle}</p>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 font-sans">
          {/* Purchase Strip */}
          {hasPurchase && (
            <section className="p-3.5 rounded-2xl surface-card flex items-center justify-between gap-3">
              <div className="min-w-0">
                {shop ? (
                  <button
                    type="button"
                    onClick={() => onShopClick(shop)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-champagne-100 hover:text-champagne-gold underline decoration-champagne-400/40 underline-offset-4 max-w-full"
                  >
                    <StoreIcon className="w-4 h-4 text-champagne-gold flex-shrink-0" />
                    <span className="truncate">{shop}</span>
                  </button>
                ) : (
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-200">
                    <StoreIcon className="w-4 h-4 text-champagne-gold flex-shrink-0" />
                    <span className="truncate">Shop not recorded</span>
                  </p>
                )}
                {wine.purchase.date && (
                  <p className="text-xs text-stone-400 mt-0.5 pl-5">
                    {tasted ? 'Bought' : 'Saved'} {formatDate(wine.purchase.date)}
                  </p>
                )}
              </div>
              {wine.purchase.price > 0 && (
                <span className="text-lg font-semibold text-champagne-200 flex-shrink-0 tabular-nums">
                  {wine.purchase.currency}
                  {Number(wine.purchase.price).toFixed(2)}
                </span>
              )}
            </section>
          )}

          {/* Untasted Wishlist Banner */}
          {!tasted && (
            <section className="p-4 rounded-2xl surface-highlight flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-champagne-200 block">
                  Saved to try later
                </span>
                <p className="text-xs text-stone-300 mt-0.5">
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
                          <span className="w-7 h-7 flex-shrink-0 rounded-full bg-wine-900 border border-champagne-400/35 text-xs font-bold text-champagne-100 flex items-center justify-center">
                            {person.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="text-sm font-semibold text-stone-100 truncate">
                            {isMe ? 'You' : person.name}
                          </span>
                        </span>

                        {isMe && status === 'rated' && (
                          <button
                            type="button"
                            onClick={() => onRate(wine)}
                            className="text-[11px] font-medium text-champagne-300 hover:text-champagne-100 underline underline-offset-2"
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
                                  ? 'bg-emerald-500/12 text-emerald-300 border-emerald-400/25'
                                  : review.liked === false
                                    ? 'bg-rose-500/12 text-rose-300 border-rose-400/25'
                                    : 'bg-champagne-500/12 text-champagne-200 border-champagne-400/25'
                              }`}
                            >
                              {review.liked === true && <Heart className="w-3 h-3 fill-emerald-400/40" />}
                              {review.liked === false && <X className="w-3 h-3" />}
                              <span>{formatReviewBadge(review)}</span>
                            </span>
                          </div>
                          {review.notes && (
                            <p className="text-xs text-stone-300 leading-relaxed">{review.notes}</p>
                          )}
                        </div>
                      ) : status === 'not-tasted' ? (
                        <p className="text-xs text-stone-400">Didn&apos;t taste it</p>
                      ) : isMe ? (
                        <button
                          type="button"
                          onClick={() => onRate(wine)}
                          className="w-full py-2 rounded-xl btn-primary text-xs font-semibold"
                        >
                          Rate it
                        </button>
                      ) : (
                        <p className="text-xs text-amber-200/90">Hasn&apos;t rated yet</p>
                      )}
                    </div>
                  );
                })}
              </div>
              {partnersDisagree(wine) && wine.coupleVerdict !== 'split' && (
                <p className="text-xs text-violet-200">You and {partner?.name ?? 'your partner'} disagreed on this one.</p>
              )}
            </section>
          )}

          {/* Wine Identity */}
          <section className="p-3.5 rounded-2xl surface-card space-y-2 text-sm text-stone-200">
            <h3 className={sectionTitle}>Bottle Details</h3>
            <p className="flex items-start gap-2 text-xs text-stone-200">
              <MapPin className="w-4 h-4 text-champagne-400 flex-shrink-0 mt-0.5" />
              <span>{[wine.region, wine.country].filter(Boolean).join(', ') || 'Origin not recorded'}</span>
            </p>
            <p className="pl-6 text-xs text-stone-300">
              {[typeMeta.label, wine.grape, wine.abv].filter(Boolean).join(' · ')}
            </p>
          </section>

          {wine.jointNotes && (
            <section className="p-3.5 rounded-2xl surface-highlight space-y-1">
              <h3 className={sectionTitle}>Shared Notes</h3>
              <p className="text-sm text-stone-100 leading-relaxed whitespace-pre-wrap">{wine.jointNotes}</p>
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
                    <div className="flex justify-between text-xs text-stone-300 mb-1">
                      <span>
                        {label} <span className="text-stone-500">({range})</span>
                      </span>
                      <span className="text-champagne-200 font-semibold tabular-nums">{v} / 5</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-cellar-950 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-wine-600 to-champagne-gold rounded-full"
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
                    className="px-2.5 py-1 rounded-lg bg-cellar-850 border border-white/[0.08] text-xs text-stone-200 font-medium"
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
                    className="px-2.5 py-1 rounded-lg bg-cellar-850 border border-white/[0.08] text-xs text-stone-200 font-medium"
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
                    className="flex items-center justify-between p-3 rounded-xl surface-card hover:border-champagne-400/30 text-xs text-stone-100 font-medium transition-colors"
                  >
                    <span>{label}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
                  </a>
                ))}
            </div>
          </section>

          {/* Comments */}
          <section className="space-y-2.5">
            <h3 className={`${sectionTitle} flex items-center gap-1.5`}>
              <MessageCircle className="w-3.5 h-3.5 text-champagne-gold" />
              <span>Conversation</span>
            </h3>
            {comments.length === 0 && (
              <p className="text-xs text-stone-400">No comments yet. Start the conversation.</p>
            )}
            <ul className="space-y-2">
              {comments.map((c) => {
                const mine = c.authorId === me.id;
                return (
                  <li
                    key={c.id}
                    className={`p-3 rounded-2xl border text-sm ${
                      mine
                        ? 'bg-wine-950/60 border-champagne-400/20 ml-6'
                        : 'bg-cellar-850 border-white/[0.08] mr-6'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] text-stone-400 mb-0.5">
                      <span>
                        <strong className="text-stone-200">{nameOf(c.authorId)}</strong> · {timeAgo(c.createdAt)}
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
                          className="text-stone-500 hover:text-rose-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-stone-100 whitespace-pre-wrap break-words text-xs leading-relaxed">{c.text}</p>
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
              <p className="text-xs text-rose-300" role="alert">
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

          <p className="text-[11px] text-stone-500 text-center pb-1">
            {wine.createdBy ? `Added by ${nameOf(wine.createdBy)}` : 'Added'} {timeAgo(wine.createdAt)}
            {wine.updatedBy && wine.updatedAt !== wine.createdAt
              ? ` · updated by ${nameOf(wine.updatedBy)} ${timeAgo(wine.updatedAt)}`
              : ''}
          </p>
        </div>

        <div className="p-3.5 modal-footer-safe border-t border-white/[0.08] bg-cellar-900 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete ${heading} for both of you? This can't be undone.`)) {
                onDelete(wine).catch((err) => setError(err.message));
              }
            }}
            className="p-3 rounded-xl btn-secondary hover:!bg-rose-950/60 hover:!border-rose-400/35 hover:!text-rose-200"
            aria-label="Delete wine"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(wine)}
            className="flex-1 py-3 px-4 rounded-xl btn-primary text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Edit3 className="w-4 h-4 text-champagne-200" />
            <span>{tasted ? 'Edit Details' : 'Log Tasting'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
