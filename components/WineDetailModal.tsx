'use client';

import React, { useState } from 'react';
import { Wine, VERDICTS, PublicUser, PartnerReview, isTasted, partnersDisagree } from '@/lib/types';
import { reviewFor, reviewStatus } from '@/lib/wine-logic';
import { formatDate, timeAgo, wineTitle } from '@/lib/format';
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
}

const sectionTitle = 'text-xs font-semibold tracking-wider text-champagne-300 uppercase';

function describeReview(r: PartnerReview): string {
  const parts = [
    r.liked === true ? 'Would buy again' : r.liked === false ? 'Wouldn’t buy again' : '',
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
}: WineDetailModalProps) {
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!wine) return null;

  const verdictConfig = VERDICTS[wine.coupleVerdict] || VERDICTS['okay'];
  const tasted = isTasted(wine);
  const nameOf = (userId?: string) =>
    userId === me.id ? 'You' : userId && userId === partner?.id ? partner.name : 'Someone';
  const hasProfile = [wine.body, wine.sweetness, wine.tannin, wine.acidity].some((v) => typeof v === 'number');
  const hasPurchase = Boolean(wine.purchase?.store || wine.purchase?.price);
  const comments = wine.comments ?? [];
  const { title: heading, subtitle } = wineTitle(wine);

  const handleShare = () => {
    const bought = wine.purchase?.store
      ? ` Bought at ${wine.purchase.store}${wine.purchase.price ? ` for ${wine.purchase.currency}${wine.purchase.price}` : ''}.`
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
        () => alert('Copied to the clipboard.'),
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-md max-h-[92dvh] sm:max-h-[88dvh] bg-[#0f0a0d] border border-champagne-500/25 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photo and actions */}
        <div className="relative h-56 w-full bg-black flex-shrink-0 flex items-center justify-center">
          {wine.imageUrl ? (
            <img src={wine.imageUrl} alt={heading} className="w-full h-full object-cover" />
          ) : (
            <WineIcon className="w-16 h-16 text-champagne-500/30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0a0d] via-[#0f0a0d]/45 to-black/75" />

          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-black/70 backdrop-blur-md text-stone-100 flex items-center justify-center border border-white/15"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleWishlist(wine)}
                aria-pressed={Boolean(wine.wishlist)}
                aria-label={wine.wishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center border ${
                  wine.wishlist ? 'bg-champagne-950 text-champagne-accent border-champagne-500/50' : 'bg-black/70 text-stone-200 border-white/15'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${wine.wishlist ? 'fill-champagne-gold text-champagne-gold' : ''}`} />
              </button>
              <button
                onClick={handleShare}
                aria-label="Share"
                className="w-10 h-10 rounded-full bg-black/70 backdrop-blur-md text-stone-200 flex items-center justify-center border border-white/15"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="absolute bottom-3 left-4 right-4 z-10">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase border ${
                  tasted ? `${verdictConfig.bgClass} ${verdictConfig.colorClass} ${verdictConfig.borderClass}` : 'bg-stone-900/80 text-stone-200 border-white/20'
                }`}
              >
                {tasted ? verdictConfig.label : 'Not tasted yet'}
              </span>
              {wine.vintage && (
                <span className="px-2.5 py-0.5 rounded-full bg-black/80 text-champagne-100 text-xs font-bold border border-champagne-500/30">
                  {wine.vintage}
                </span>
              )}
              {wine.averageRating > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/80 text-champagne-accent text-xs font-bold border border-champagne-500/30">
                  <Star className="w-3 h-3 fill-champagne-gold text-champagne-gold" />
                  {wine.averageRating.toFixed(1)}
                </span>
              )}
            </div>
            <h2 className="font-serif font-semibold text-2xl text-white leading-tight">{heading}</h2>
            {subtitle && <p className="text-sm text-champagne-200 font-medium mt-0.5">{subtitle}</p>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 font-sans">
          {/* Ratings */}
          {tasted && (
            <section className="space-y-2">
              <h3 className={sectionTitle}>Ratings</h3>
              {people.map((person) => {
                const status = reviewStatus(wine, person.slot);
                const review = reviewFor(wine, person.slot);
                const isMe = person.id === me.id;
                return (
                  <div key={person.id} className="p-3.5 rounded-2xl bg-stone-900/70 border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 flex-shrink-0 rounded-full bg-champagne-950 border border-champagne-500/35 text-xs font-bold text-champagne-accent flex items-center justify-center">
                          {person.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="text-sm font-bold text-stone-100 truncate">{isMe ? 'You' : person.name}</span>
                      </span>
                      {status === 'rated' && review ? (
                        <span
                          className={`text-xs font-semibold ${
                            review.liked === true ? 'text-emerald-300' : review.liked === false ? 'text-rose-300' : 'text-champagne-accent'
                          }`}
                        >
                          {describeReview(review)}
                        </span>
                      ) : status === 'not-tasted' ? (
                        <span className="text-xs text-stone-400">Didn&apos;t taste it</span>
                      ) : isMe ? (
                        <button
                          onClick={() => onRate(wine)}
                          className="px-3 py-1.5 rounded-lg bg-wine-900 border border-champagne-500/45 text-xs font-bold text-champagne-100"
                        >
                          Rate it
                        </button>
                      ) : (
                        <span className="text-xs text-amber-200">Hasn&apos;t rated yet</span>
                      )}
                    </div>
                    {review?.notes && <p className="text-sm text-stone-200 leading-relaxed">{review.notes}</p>}
                  </div>
                );
              })}
              {partnersDisagree(wine) && (
                <p className="text-xs text-amber-200">You disagree on this one, so it&apos;s marked as a split.</p>
              )}
            </section>
          )}

          {/* Comments */}
          <section className="space-y-2">
            <h3 className={`${sectionTitle} flex items-center gap-1.5`}>
              <MessageCircle className="w-3.5 h-3.5 text-champagne-gold" />
              <span>Comments</span>
            </h3>
            {comments.length === 0 && <p className="text-xs text-stone-400">No comments yet. Start the conversation.</p>}
            <ul className="space-y-2">
              {comments.map((c) => {
                const mine = c.authorId === me.id;
                return (
                  <li
                    key={c.id}
                    className={`p-3 rounded-2xl border text-sm ${
                      mine ? 'bg-wine-950/50 border-champagne-500/20 ml-6' : 'bg-stone-900/70 border-white/10 mr-6'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] text-stone-400 mb-0.5">
                      <span>
                        <strong className="text-stone-200">{nameOf(c.authorId)}</strong> · {timeAgo(c.createdAt)}
                      </span>
                      {mine && (
                        <button
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
                    <p className="text-stone-100 whitespace-pre-wrap break-words">{c.text}</p>
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
                className="flex-1 px-3 py-2.5 rounded-xl bg-black/70 border border-white/15 text-sm text-white focus:outline-none focus:border-champagne-gold resize-none"
              />
              <button
                type="submit"
                disabled={sending || !comment.trim()}
                aria-label="Send comment"
                className="w-11 h-11 flex-shrink-0 rounded-xl bg-wine-900 border border-champagne-500/40 text-champagne-100 flex items-center justify-center disabled:opacity-40"
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

          {wine.jointNotes && (
            <section className="p-3.5 rounded-2xl bg-[#1a0c13] border border-champagne-500/25">
              <h3 className={`${sectionTitle} mb-1`}>Notes</h3>
              <p className="text-sm text-stone-100 leading-relaxed whitespace-pre-wrap">{wine.jointNotes}</p>
            </section>
          )}

          {/* About the wine */}
          <section className="p-3.5 rounded-2xl bg-stone-900/50 border border-white/10 space-y-1.5 text-sm text-stone-200">
            <p className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-champagne-400 flex-shrink-0 mt-0.5" />
              <span>{[wine.region, wine.country].filter(Boolean).join(', ') || 'Origin not recorded'}</span>
            </p>
            <p className="pl-6 text-stone-300">
              {[wine.type === 'rose' ? 'Rosé' : wine.type.charAt(0).toUpperCase() + wine.type.slice(1), wine.grape, wine.abv]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </section>

          {hasPurchase && (
            <section className="p-3.5 rounded-2xl bg-stone-900/50 border border-white/10 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-bold text-stone-100">
                  <StoreIcon className="w-4 h-4 text-champagne-gold flex-shrink-0" />
                  <span className="truncate">{wine.purchase.store || 'Shop not recorded'}</span>
                </p>
                {wine.purchase.date && <p className="text-xs text-stone-300 mt-0.5 pl-5">Bought {formatDate(wine.purchase.date)}</p>}
              </div>
              {wine.purchase.price > 0 && (
                <span className="text-lg font-bold text-champagne-accent flex-shrink-0">
                  {wine.purchase.currency}
                  {Number(wine.purchase.price).toFixed(2)}
                </span>
              )}
            </section>
          )}

          {/* Buy online */}
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
                    className="flex items-center justify-between p-3 rounded-xl bg-stone-900/90 border border-white/10 text-sm text-stone-100 font-medium"
                  >
                    <span>{label}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
                  </a>
                ))}
            </div>
          </section>

          {hasProfile && (
            <section className="p-4 rounded-2xl bg-stone-900/60 border border-white/10 space-y-3">
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
                      <span className="text-champagne-accent font-semibold">{v} / 5</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-black/70 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-wine-700 to-champagne-gold rounded-full" style={{ width: `${((v as number) / 5) * 100}%` }} />
                    </div>
                  </div>
                ))}
            </section>
          )}

          {wine.aromaTags && wine.aromaTags.length > 0 && (
            <section>
              <h3 className={`${sectionTitle} mb-2`}>Aromas &amp; flavours</h3>
              <div className="flex flex-wrap gap-1.5">
                {wine.aromaTags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-lg bg-stone-900/90 border border-white/15 text-xs text-stone-100 font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          {wine.foodPairings && wine.foodPairings.length > 0 && (
            <section>
              <h3 className={`${sectionTitle} mb-2`}>Goes with</h3>
              <div className="flex flex-wrap gap-1.5">
                {wine.foodPairings.map((food) => (
                  <span key={food} className="px-2.5 py-1 rounded-lg bg-stone-900/90 border border-white/15 text-xs text-stone-100 font-medium">
                    {food}
                  </span>
                ))}
              </div>
            </section>
          )}

          <MoreLikeThis key={wine.id} wineId={wine.id} wishlistNames={wishlistNames} onAddToWishlist={onAddToWishlist} />

          <p className="text-[11px] text-stone-500 text-center">
            {wine.createdBy ? `Added by ${nameOf(wine.createdBy)}` : 'Added'} {timeAgo(wine.createdAt)}
            {wine.updatedBy && wine.updatedAt !== wine.createdAt ? ` · last changed by ${nameOf(wine.updatedBy)} ${timeAgo(wine.updatedAt)}` : ''}
          </p>
        </div>

        <div className="p-3.5 modal-footer-safe border-t border-champagne-500/15 bg-[#0f0a0d] flex items-center justify-between gap-2.5">
          <button
            onClick={() => {
              if (confirm(`Delete ${heading} for both of you? This can't be undone.`)) {
                onDelete(wine).catch((err) => setError(err.message));
              }
            }}
            className="p-3 rounded-xl bg-stone-900 hover:bg-rose-950 text-stone-300 hover:text-rose-200 border border-white/10"
            aria-label="Delete wine"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(wine)}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-wine-900 via-wine-800 to-black text-champagne-100 border border-champagne-500/35 text-sm font-bold flex items-center justify-center gap-2"
          >
            <Edit3 className="w-4 h-4 text-champagne-300" />
            <span>{tasted ? 'Edit' : 'Log a tasting'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
