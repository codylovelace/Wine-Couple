export type WineType = 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'orange';

export type Verdict = 
  | 'good-value' 
  | 'loved-it' 
  | 'good' 
  | 'okay' 
  | 'bad' 
  | 'special-occasion';

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
  'good': {
    id: 'good',
    label: 'Enjoyable',
    shortLabel: 'Enjoyable',
    colorClass: 'text-stone-200',
    bgClass: 'bg-stone-900/60',
    borderClass: 'border-stone-700/40',
    description: 'Very pleasant bottle, would drink again',
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
  'special-occasion': {
    id: 'special-occasion',
    label: 'Special Occasion',
    shortLabel: 'Special Occasion',
    colorClass: 'text-champagne-accent',
    bgClass: 'bg-champagne-950/50',
    borderClass: 'border-champagne-500/40',
    description: 'Celebratory or premium bottle',
  },
};

export interface PartnerReview {
  tasterName: string;
  rating: number; // 1 to 5
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
  
  // Organization
  wishlist?: boolean;
  favorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  partner1Name: string;
  partner2Name: string;
  partner1Avatar: string;
  partner2Avatar: string;
  defaultCurrency: string;
  geminiApiKey?: string;
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
