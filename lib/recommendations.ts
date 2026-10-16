import { OnlineBuyLinks, PartnerReview, Wine, WineType, isTasted } from './types';

// A wine Gemini suggests from the ones you both liked. Shared by the API and
// the For You page; generation lives in recommendations-server.ts.
export interface WineRecommendation {
  id: string;
  name: string;
  producer: string;
  type: WineType;
  grape: string;
  region: string;
  country: string;
  // Rough retail price; 0 when Gemini gave none.
  estimatedPrice: number;
  currency: string;
  reason: string;
  // Names of your wines it's based on.
  basedOn: string[];
  onlineLinks: OnlineBuyLinks;
}

export interface RecommendationSet {
  // Changes whenever the set of wines it was based on changes.
  fingerprint: string;
  generatedAt: string;
  model: string;
  recommendations: WineRecommendation[];
}

// Whether this person liked a wine: their swipe, or for ratings from before
// swiping existed, their stars (4-5 liked, 1-2 didn't, 3 or none: unknown).
export function reviewLiked(review?: PartnerReview): boolean | undefined {
  if (!review) return undefined;
  if (typeof review.liked === 'boolean') return review.liked;
  if (review.rating >= 4) return true;
  if (review.rating > 0 && review.rating <= 2) return false;
  return undefined;
}

// Tasted wines you both liked.
export function bothLiked(wines: Wine[]): Wine[] {
  return wines.filter(
    (w) => isTasted(w) && reviewLiked(w.partner1Review) === true && reviewLiked(w.partner2Review) === true
  );
}

// Tasted wines you both disliked: something to steer away from.
export function bothDisliked(wines: Wine[]): Wine[] {
  return wines.filter(
    (w) => isTasted(w) && reviewLiked(w.partner1Review) === false && reviewLiked(w.partner2Review) === false
  );
}
