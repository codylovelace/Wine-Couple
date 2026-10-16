export type WineType = 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'orange';

// Three verdicts follow the swipes (both right, split, both left); Great
// Value is picked by hand.
export type Verdict = 'loved-it' | 'good-value' | 'okay' | 'bad';

export interface VerdictConfig {
  id: Verdict;
  label: string;
  shortLabel: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  description: string;
}

export const VERDICTS: Record<Verdict, VerdictConfig> = {
  'loved-it': {
    id: 'loved-it',
    label: 'Must Buy Again',
    shortLabel: 'Loved It',
    colorClass: 'text-amber-200',
    bgClass: 'bg-amber-950/40',
    borderClass: 'border-amber-500/30',
    description: 'An absolute favorite, definitely repurchasing',
  },
  'good-value': {
    id: 'good-value',
    label: 'Great Value',
    shortLabel: 'Great Value',
    colorClass: 'text-emerald-300',
    bgClass: 'bg-emerald-950/40',
    borderClass: 'border-emerald-500/30',
    description: 'Punches well above its price point',
  },
  'okay': {
    id: 'okay',
    label: 'Table Wine',
    shortLabel: 'Table Wine',
    colorClass: 'text-stone-400',
    bgClass: 'bg-stone-900/40',
    borderClass: 'border-stone-800',
    description: 'Average, nothing memorable',
  },
  'bad': {
    id: 'bad',
    label: 'Avoid',
    shortLabel: 'Avoid',
    colorClass: 'text-rose-300',
    bgClass: 'bg-rose-950/40',
    borderClass: 'border-rose-500/30',
    description: 'Not to our taste, would not purchase again',
  },
};

export type PartnerSlot = 1 | 2;

// What the browser knows about an account (never the password hash).
export interface PublicUser {
  id: string;
  name: string;
  // 1 or 2: which of the wine's partner reviews belongs to this person.
  slot: PartnerSlot;
}

export interface WineComment {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface PartnerReview {
  tasterName: string;
  // This partner's swipe: right = liked it / would buy again, left = didn't.
  // Undefined on reviews saved before swiping existed.
  liked?: boolean;
  rating: number; // 1 to 5, or 0 when not rated (stars are optional)
  verdict?: Verdict;
  notes: string;
  aromas?: string[];
  date: string;
}

export interface PurchaseDetails {
  store: string; // e.g. "Waitrose", "Total Wine", "Trader Joe's", "Holiday in Tuscany"
  price: number;
  currency: string; // "£", "$", "€"
  date?: string;
  isSpecialOffer?: boolean;
  notes?: string;
}

export interface OnlineBuyLinks {
  wineSearcher?: string;
  vivino?: string;
  googleShopping?: string;
  supermarketSearch?: string;
  customUrl?: string;
  customStoreName?: string;
}

export interface Wine {
  id: string;
  name: string;
  producer: string; // Winery / Brand
  vintage: string; // e.g. "2021", "NV"
  type: WineType;
  grape: string; // e.g. "Cabernet Sauvignon", "Sauvignon Blanc", "Rioja Blend"
  region: string; // e.g. "Bordeaux", "Napa Valley", "Mendoza", "Marlborough"
  country: string; // e.g. "France", "USA", "Argentina", "New Zealand", "Italy", "Spain"
  abv?: string; // e.g. "13.5%"
  imageUrl?: string;
  
  // Overall Couple Status
  coupleVerdict: Verdict;
  averageRating: number;
  
  // Individual Partner Insights
  tastedTogether: boolean;
  partner1Review?: PartnerReview;
  partner2Review?: PartnerReview;
  jointNotes?: string;
  
  // Flavor Profile Ratings (1-5)
  body?: number;
  sweetness?: number;
  tannin?: number;
  acidity?: number;
  aromaTags?: string[];
  foodPairings?: string[];

  // Purchase & Where to buy
  purchase: PurchaseDetails;
  onlineLinks: OnlineBuyLinks;
  
  // false for a wishlist pick you haven't tried yet; it has no verdict or
  // rating and is kept out of the journal, stats and recommendations.
  // Missing means tasted (every wine saved before this field existed).
  tasted?: boolean;

  // A partner who said they didn't taste this one. Without it, a missing
  // review means that partner hasn't rated it yet.
  partner1NotTasted?: boolean;
  partner2NotTasted?: boolean;
  // true once someone picks the couple verdict by hand; until then it
  // follows the two swipes as they come in.
  verdictPinned?: boolean;

  comments?: WineComment[];

  // Organization
  wishlist?: boolean;
  createdBy?: string; // user id
  updatedBy?: string; // user id
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  partner1Name: string;
  partner2Name: string;
  partner1Avatar: string;
  partner2Avatar: string;
  defaultCurrency: string;
  // Only ever present server-side; the API strips it before responding.
  geminiApiKey?: string;
  // Set by the API for the browser instead of the key itself.
  hasGeminiKey?: boolean;
  geminiKeyFromEnv?: boolean;
}

export interface WineScanResult {
  name: string;
  producer: string;
  vintage: string;
  type: WineType;
  grape: string;
  region: string;
  country: string;
  abv: string;
  suggestedVerdict?: Verdict;
  suggestedAromas?: string[];
  tastingNotesSummary?: string;
  confidenceScore?: number;
  body?: number;
  sweetness?: number;
  tannin?: number;
  acidity?: number;
  foodPairings?: string[];
}

export function isTasted(wine: Pick<Wine, 'tasted'>): boolean {
  return wine.tasted !== false;
}

// Mean of the partner ratings actually given (1-5); 0 means nobody rated it.
export function averageOfRatings(...ratings: (number | undefined)[]): number {
  const given = ratings.filter((r): r is number => typeof r === 'number' && r > 0);
  if (given.length === 0) return 0;
  return Number((given.reduce((a, b) => a + b, 0) / given.length).toFixed(1));
}

// Couple verdict implied by the two swipes. A split lands on Table Wine
// ("average") rather than picking a side; it can be changed on the details
// screen. Undefined when nobody swiped.
export function verdictFromSwipes(p1?: boolean, p2?: boolean): Verdict | undefined {
  const swipes = [p1, p2].filter((v): v is boolean => typeof v === 'boolean');
  if (swipes.length === 0) return undefined;
  if (swipes.every(Boolean)) return 'loved-it';
  if (swipes.every((v) => !v)) return 'bad';
  return 'okay';
}

// True when both partners swiped and disagreed.
export function partnersDisagree(wine: Pick<Wine, 'partner1Review' | 'partner2Review'>): boolean {
  const a = wine.partner1Review?.liked;
  const b = wine.partner2Review?.liked;
  return typeof a === 'boolean' && typeof b === 'boolean' && a !== b;
}
