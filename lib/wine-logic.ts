// Rules shared by the API and the browser for who-rated-what on a wine.
// No server-only imports here.
import {
  PartnerReview,
  PartnerSlot,
  PurchaseDetails,
  Verdict,
  VERDICTS,
  Wine,
  WineType,
  averageOfRatings,
  isTasted,
  verdictFromSwipes,
} from './types';

export function reviewKey(slot: PartnerSlot): 'partner1Review' | 'partner2Review' {
  return slot === 1 ? 'partner1Review' : 'partner2Review';
}

export function notTastedKey(slot: PartnerSlot): 'partner1NotTasted' | 'partner2NotTasted' {
  return slot === 1 ? 'partner1NotTasted' : 'partner2NotTasted';
}

export function otherSlot(slot: PartnerSlot): PartnerSlot {
  return slot === 1 ? 2 : 1;
}

export function reviewFor(wine: Wine, slot: PartnerSlot): PartnerReview | undefined {
  return wine[reviewKey(slot)];
}

export type ReviewStatus = 'rated' | 'not-tasted' | 'pending';

export function reviewStatus(wine: Wine, slot: PartnerSlot): ReviewStatus {
  if (wine[reviewKey(slot)]) return 'rated';
  if (wine[notTastedKey(slot)]) return 'not-tasted';
  return 'pending';
}

// A tasted wine this person hasn't rated or ruled out yet: shown in their
// "your turn" list.
export function awaitingRating(wine: Wine, slot: PartnerSlot): boolean {
  return isTasted(wine) && reviewStatus(wine, slot) === 'pending';
}

// What a person sends for their own review. null means "I didn't taste it".
export interface ReviewInput {
  liked?: boolean;
  rating?: number;
  notes?: string;
}

const MAX_NOTES = 2000;

export function cleanReviewInput(raw: unknown): ReviewInput | null | undefined {
  if (raw === null) return null;
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const rating = Number(r.rating);
  return {
    liked: typeof r.liked === 'boolean' ? r.liked : undefined,
    rating: Number.isInteger(rating) && rating >= 0 && rating <= 5 ? rating : 0,
    notes: typeof r.notes === 'string' ? r.notes.trim().slice(0, MAX_NOTES) : '',
  };
}

// Sets (or, with null, rules out) one partner's review, then refreshes the
// fields that depend on both reviews.
export function applyReview(
  wine: Wine,
  slot: PartnerSlot,
  tasterName: string,
  input: ReviewInput | null,
  today = new Date().toISOString().split('T')[0]
): void {
  const key = reviewKey(slot);
  if (input === null) {
    delete wine[key];
    wine[notTastedKey(slot)] = true;
  } else {
    const previous = wine[key];
    wine[key] = {
      tasterName,
      liked: input.liked,
      rating: input.rating ?? 0,
      notes: input.notes ?? '',
      // Keep the date of the first rating when it's only being edited.
      date: previous?.date || today,
    };
    delete wine[notTastedKey(slot)];
    // Rating a wishlist pick means it's been tasted: it moves to the journal.
    if (!isTasted(wine)) {
      wine.tasted = true;
      wine.wishlist = false;
    }
  }
  refreshDerived(wine);
}

export function refreshDerived(wine: Wine): void {
  const p1 = wine.partner1Review;
  const p2 = wine.partner2Review;
  wine.averageRating = averageOfRatings(p1?.rating, p2?.rating);
  wine.tastedTogether = Boolean(p1 && p2);
  if (!wine.verdictPinned) {
    const derived = verdictFromSwipes(p1?.liked, p2?.liked);
    if (derived) wine.coupleVerdict = derived;
  }
}

// ---------- shared (non-review) fields ----------

const WINE_TYPES: WineType[] = ['red', 'white', 'rose', 'sparkling', 'dessert', 'orange'];

export type SharedWineFields = Pick<
  Wine,
  | 'name'
  | 'producer'
  | 'vintage'
  | 'type'
  | 'grape'
  | 'region'
  | 'country'
  | 'abv'
  | 'imageUrl'
  | 'coupleVerdict'
  | 'jointNotes'
  | 'body'
  | 'sweetness'
  | 'tannin'
  | 'acidity'
  | 'aromaTags'
  | 'foodPairings'
  | 'purchase'
  | 'onlineLinks'
  | 'wishlist'
  | 'favorite'
  | 'tasted'
  | 'verdictPinned'
>;

function text(v: unknown, max = 200): string | undefined {
  return typeof v === 'string' ? v.trim().slice(0, max) : undefined;
}

function scale(v: unknown): number | undefined | null {
  if (v === null) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : undefined;
}

function tags(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v
    .filter((t): t is string => typeof t === 'string' && t.trim() !== '')
    .map((t) => t.trim().slice(0, 60))
    .slice(0, 40);
}

// Photos are either a fresh upload (data URL, written to the photos volume on
// save), one already on the volume, or a remote https image.
function image(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  if (v === '' || v.startsWith('data:image/') || v.startsWith('/uploads/') || v.startsWith('https://')) return v;
  return undefined;
}

function purchase(v: unknown): PurchaseDetails | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const p = v as Record<string, unknown>;
  const price = Number(p.price);
  return {
    store: text(p.store, 100) ?? '',
    price: Number.isFinite(price) && price >= 0 ? Math.round(price * 100) / 100 : 0,
    currency: text(p.currency, 4) || '£',
    date: text(p.date, 10) || undefined,
    isSpecialOffer: p.isSpecialOffer === true,
    notes: text(p.notes, 500) ?? '',
  };
}

// Keeps only known fields with the right shape. Fields that are absent stay
// as they are on the stored wine, so two people editing different things
// don't overwrite each other.
export function cleanSharedFields(raw: unknown): Partial<SharedWineFields> {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  const out: Partial<SharedWineFields> = {};

  const strings = ['name', 'producer', 'vintage', 'grape', 'region', 'country', 'abv'] as const;
  for (const key of strings) {
    const v = text(r[key]);
    if (v !== undefined) out[key] = v;
  }
  const joint = text(r.jointNotes, 2000);
  if (joint !== undefined) out.jointNotes = joint;

  if (typeof r.type === 'string' && WINE_TYPES.includes(r.type as WineType)) out.type = r.type as WineType;
  if (typeof r.coupleVerdict === 'string' && r.coupleVerdict in VERDICTS) out.coupleVerdict = r.coupleVerdict as Verdict;

  const img = image(r.imageUrl);
  if (img !== undefined) out.imageUrl = img;

  for (const key of ['body', 'sweetness', 'tannin', 'acidity'] as const) {
    const v = scale(r[key]);
    if (v !== undefined && v !== null) out[key] = v;
  }

  const aromas = tags(r.aromaTags);
  if (aromas) out.aromaTags = aromas;
  const pairings = tags(r.foodPairings);
  if (pairings) out.foodPairings = pairings;

  const p = purchase(r.purchase);
  if (p) out.purchase = p;

  if (r.onlineLinks && typeof r.onlineLinks === 'object') {
    const links: Record<string, string> = {};
    for (const [k, v] of Object.entries(r.onlineLinks as Record<string, unknown>)) {
      if (typeof v === 'string' && /^https:\/\//.test(v)) links[k] = v.slice(0, 500);
    }
    out.onlineLinks = links;
  }

  for (const key of ['wishlist', 'favorite', 'tasted', 'verdictPinned'] as const) {
    if (typeof r[key] === 'boolean') out[key] = r[key] as boolean;
  }
  return out;
}

// A verdict picked by hand sticks (verdictPinned) unless the same request
// asks for it to follow the swipes again (verdictPinned: false).
export function applySharedFields(wine: Wine, fields: Partial<SharedWineFields>): void {
  Object.assign(wine, fields);
  if (fields.coupleVerdict && fields.verdictPinned === undefined) wine.verdictPinned = true;
  refreshDerived(wine);
}
