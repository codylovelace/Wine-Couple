import { Wine, WineType, OnlineBuyLinks } from './types';
import { generateWineBuyLinks } from './wine-search-links';

export interface WineRecommendation {
  id: string;
  name: string;
  producer: string;
  vintage: string;
  type: WineType;
  grape: string;
  region: string;
  country: string;
  estimatedPrice: number;
  currency: string;
  imageUrl: string;
  matchScore: number; // e.g. 96 (%)
  matchedReason: string;
  basedOnWineName?: string;
  flavorNotes: string[];
  foodPairings: string[];
  onlineLinks: OnlineBuyLinks;
}

// Catalog of sommelier curated recommendations
const WINE_CATALOG: Omit<WineRecommendation, 'matchScore' | 'matchedReason' | 'basedOnWineName' | 'onlineLinks'>[] = [
  {
    id: 'rec-1',
    name: 'Finca Bella Vista Malbec',
    producer: 'Achaval-Ferrer',
    vintage: '2020',
    type: 'red',
    grape: 'Malbec',
    region: 'Mendoza',
    country: 'Argentina',
    estimatedPrice: 22.00,
    currency: '£',
    imageUrl: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&auto=format&fit=crop&q=80',
    flavorNotes: ['Dark Cherry', 'Blackberry', 'Vanilla', 'Oak', 'Violet'],
    foodPairings: ['Ribeye Steak', 'Roast Lamb', 'Charcuterie & Cheese'],
  },
  {
    id: 'rec-2',
    name: 'Section 94 Sauvignon Blanc',
    producer: 'Dog Point Vineyard',
    vintage: '2021',
    type: 'white',
    grape: 'Sauvignon Blanc',
    region: 'Marlborough',
    country: 'New Zealand',
    estimatedPrice: 26.50,
    currency: '£',
    imageUrl: 'https://images.unsplash.com/photo-1568213816046-0ee1c42bd559?w=800&auto=format&fit=crop&q=80',
    flavorNotes: ['Grapefruit', 'Peach', 'Mineral / Flint', 'Toasty', 'Citrus'],
    foodPairings: ['Seafood / Oysters', 'Grilled Salmon', 'Goat Cheese Salad'],
  },
  {
    id: 'rec-3',
    name: 'Muga Reserva',
    producer: 'Bodegas Muga',
    vintage: '2019',
    type: 'red',
    grape: 'Tempranillo, Garnacha',
    region: 'Rioja Alta',
    country: 'Spain',
    estimatedPrice: 19.99,
    currency: '£',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&auto=format&fit=crop&q=80',
    flavorNotes: ['Vanilla', 'Oak', 'Dark Cherry', 'Leather', 'Clove'],
    foodPairings: ['Roast Lamb', 'Tapas', 'Charcuterie & Cheese'],
  },
  {
    id: 'rec-4',
    name: 'Rock Angel Rosé',
    producer: 'Château d\'Esclans',
    vintage: '2022',
    type: 'rose',
    grape: 'Grenache, Rolle',
    region: 'Côtes de Provence',
    country: 'France',
    estimatedPrice: 28.00,
    currency: '£',
    imageUrl: 'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=800&auto=format&fit=crop&q=80',
    flavorNotes: ['Strawberry', 'Peach', 'Mineral / Flint', 'Creamy'],
    foodPairings: ['Grilled Salmon', 'Tapas', 'Seafood / Oysters'],
  },
  {
    id: 'rec-5',
    name: 'Valdobbiadene Prosecco Superiore Brut',
    producer: 'Nino Franco Rustico',
    vintage: 'NV',
    type: 'sparkling',
    grape: 'Glera',
    region: 'Veneto',
    country: 'Italy',
    estimatedPrice: 16.50,
    currency: '£',
    imageUrl: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=800&auto=format&fit=crop&q=80',
    flavorNotes: ['Green Apple', 'Pear', 'Floral', 'Crisp Apple'],
    foodPairings: ['Charcuterie & Cheese', 'Tapas', 'Seafood / Oysters'],
  },
  {
    id: 'rec-6',
    name: 'Gigondas Cuvée Tradition',
    producer: 'Domaine du Gour de Chaulé',
    vintage: '2020',
    type: 'red',
    grape: 'Grenache, Syrah, Mourvèdre',
    region: 'Southern Rhône',
    country: 'France',
    estimatedPrice: 24.00,
    currency: '£',
    imageUrl: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=800&auto=format&fit=crop&q=80',
    flavorNotes: ['Blackberry', 'Pepper', 'Leather', 'Dark Cherry', 'Herbal'],
    foodPairings: ['Roast Lamb', 'Duck Breast', 'Wood-fired Pizza'],
  },
  {
    id: 'rec-7',
    name: 'Sancerre Blanc',
    producer: 'Henri Bourgeois Les Baronnes',
    vintage: '2022',
    type: 'white',
    grape: 'Sauvignon Blanc',
    region: 'Loire Valley',
    country: 'France',
    estimatedPrice: 23.50,
    currency: '£',
    imageUrl: 'https://images.unsplash.com/photo-1568213816046-0ee1c42bd559?w=800&auto=format&fit=crop&q=80',
    flavorNotes: ['Citrus', 'Mineral / Flint', 'Green Apple', 'Herbal'],
    foodPairings: ['Seafood / Oysters', 'Goat Cheese', 'Grilled Salmon'],
  },
  {
    id: 'rec-8',
    name: 'Felino Malbec',
    producer: 'Viña Cobos (Paul Hobbs)',
    vintage: '2021',
    type: 'red',
    grape: 'Malbec',
    region: 'Mendoza',
    country: 'Argentina',
    estimatedPrice: 17.50,
    currency: '£',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&auto=format&fit=crop&q=80',
    flavorNotes: ['Blackberry', 'Plum', 'Vanilla', 'Chocolate', 'Oak'],
    foodPairings: ['Ribeye Steak', 'Charcuterie & Cheese'],
  }
];

export function getRecommendationsForCouple(userWines: Wine[]): WineRecommendation[] {
  // 1. Identify liked wines (rated >= 4.0 or verdict is good-value / loved-it / good)
  const likedWines = userWines.filter(
    (w) => w.averageRating >= 3.8 || w.coupleVerdict === 'loved-it' || w.coupleVerdict === 'good-value' || w.favorite
  );

  // If user hasn't logged many wines yet, return top diverse sommelier value picks
  if (likedWines.length === 0) {
    return WINE_CATALOG.slice(0, 4).map((item) => ({
      ...item,
      matchScore: 90,
      matchedReason: 'Top rated crowd favorite to kick off your couple cellar',
      onlineLinks: generateWineBuyLinks({
        name: item.name,
        producer: item.producer,
        vintage: item.vintage,
        country: item.country,
      }),
    }));
  }

  // Extract loved grapes, regions, and aroma tags
  const lovedGrapes = new Set(likedWines.map((w) => w.grape.toLowerCase()));
  const lovedRegions = new Set(likedWines.map((w) => w.region.toLowerCase()));
  const lovedTypes = new Set(likedWines.map((w) => w.type));
  const lovedAromas = new Set(likedWines.flatMap((w) => w.aromaTags || []));

  // Compute recommendations with score
  const scoredRecommendations = WINE_CATALOG.map((rec) => {
    let score = 70;
    let reasonParts: string[] = [];
    let basedOn: string | undefined = undefined;

    // Check matching wine
    for (const liked of likedWines) {
      if (
        liked.grape.toLowerCase().includes(rec.grape.toLowerCase()) ||
        rec.grape.toLowerCase().includes(liked.grape.toLowerCase())
      ) {
        score += 15;
        basedOn = `${liked.producer} ${liked.name}`;
        reasonParts.push(`shares the same delicious ${rec.grape} profile as your ${liked.name}`);
        break;
      }
      if (liked.region.toLowerCase().includes(rec.region.toLowerCase()) || rec.region.toLowerCase().includes(liked.region.toLowerCase())) {
        score += 10;
        if (!basedOn) basedOn = `${liked.producer} ${liked.name}`;
        reasonParts.push(`from your favorite ${rec.region} region`);
        break;
      }
    }

    if (lovedTypes.has(rec.type)) {
      score += 5;
    }

    // Shared aromas
    const commonAromas = rec.flavorNotes.filter((aroma) => lovedAromas.has(aroma));
    if (commonAromas.length > 0) {
      score += Math.min(10, commonAromas.length * 3);
      reasonParts.push(`features your favorite notes of ${commonAromas.slice(0, 2).join(' & ')}`);
    }

    // Normalized match score capped at 98%
    const finalScore = Math.min(98, Math.max(75, score));
    const finalReason = reasonParts.length > 0
      ? `Because you liked ${basedOn || 'similar wines'}: ${reasonParts.join(', ')}.`
      : `High-value match for your preferred ${rec.type} wine tasting profile.`;

    return {
      ...rec,
      matchScore: finalScore,
      matchedReason: finalReason,
      basedOnWineName: basedOn,
      onlineLinks: generateWineBuyLinks({
        name: rec.name,
        producer: rec.producer,
        vintage: rec.vintage,
        country: rec.country,
      }),
    };
  });

  // Sort by highest match score and return top recommendations
  return scoredRecommendations.sort((a, b) => b.matchScore - a.matchScore);
}
