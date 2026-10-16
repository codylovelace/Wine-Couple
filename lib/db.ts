import fs from 'fs';
import path from 'path';
import { Wine, UserSettings, Verdict, WineScanResult } from './types';
import { generateWineBuyLinks } from './wine-search-links';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const WINES_FILE = path.join(DATA_DIR, 'wines.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const DEFAULT_SETTINGS: UserSettings = {
  partner1Name: 'Cody',
  partner2Name: 'Jess',
  partner1Avatar: 'C',
  partner2Avatar: 'J',
  defaultCurrency: '£',
};

const SEED_WINES: Wine[] = [
  {
    id: 'wine-1',
    name: 'High Mountain Vines Malbec',
    producer: 'Catena Zapata',
    vintage: '2021',
    type: 'red',
    grape: 'Malbec',
    region: 'Mendoza',
    country: 'Argentina',
    abv: '13.5%',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&auto=format&fit=crop&q=80',
    coupleVerdict: 'good-value',
    averageRating: 4.5,
    tastedTogether: true,
    partner1Review: {
      tasterName: 'Cody',
      rating: 4.5,
      verdict: 'good-value',
      notes: 'Rich plum and dark chocolate notes. Velvety smooth finish for under fifteen pounds.',
      aromas: ['Dark Cherry', 'Vanilla', 'Chocolate', 'Oak'],
      date: '2026-08-10',
    },
    partner2Review: {
      tasterName: 'Jess',
      rating: 4.5,
      verdict: 'good-value',
      notes: 'Loved this with our steak dinner. Very smooth tannins, balanced finish.',
      aromas: ['Blackberry', 'Vanilla'],
      date: '2026-08-10',
    },
    jointNotes: 'An absolute staple. Buy 3 more bottles on our next store visit.',
    body: 4,
    sweetness: 1,
    tannin: 3,
    acidity: 2,
    aromaTags: ['Dark Cherry', 'Vanilla', 'Chocolate', 'Oak', 'Blackberry'],
    foodPairings: ['Ribeye Steak', 'Charcuterie & Cheese'],
    purchase: {
      store: 'Waitrose',
      price: 13.99,
      currency: '£',
      date: '2026-08-09',
      isSpecialOffer: true,
      notes: '25% off 6 bottles promotion',
    },
    onlineLinks: {
      wineSearcher: 'https://www.wine-searcher.com/find/catena+zapata+malbec+2021',
      vivino: 'https://www.vivino.com/search/wines?q=Catena+Zapata+Malbec+2021',
      googleShopping: 'https://www.google.com/search?tbm=shop&q=Catena+Zapata+Malbec+2021+buy+online',
      supermarketSearch: 'https://www.google.com/search?q=Catena+Zapata+Malbec+2021+supermarket+price',
    },
    favorite: true,
    wishlist: false,
    createdAt: '2026-08-10T19:30:00.000Z',
    updatedAt: '2026-08-10T19:30:00.000Z',
  },
  {
    id: 'wine-2',
    name: 'Sauvignon Blanc',
    producer: 'Cloudy Bay',
    vintage: '2023',
    type: 'white',
    grape: 'Sauvignon Blanc',
    region: 'Marlborough',
    country: 'New Zealand',
    abv: '13.0%',
    imageUrl: 'https://images.unsplash.com/photo-1568213816046-0ee1c42bd559?w=800&auto=format&fit=crop&q=80',
    coupleVerdict: 'loved-it',
    averageRating: 4.8,
    tastedTogether: true,
    partner1Review: {
      tasterName: 'Cody',
      rating: 5.0,
      verdict: 'loved-it',
      notes: 'Expressive tropical aromas. Passion fruit, lime zest and clean flinty minerality.',
      aromas: ['Grapefruit', 'Peach', 'Mineral / Flint', 'Tropical Fruit'],
      date: '2026-08-02',
    },
    partner2Review: {
      tasterName: 'Jess',
      rating: 4.5,
      verdict: 'loved-it',
      notes: 'Incredible aroma from the first pour. Crisp, refreshing terrace wine.',
      aromas: ['Citrus', 'Peach'],
      date: '2026-08-02',
    },
    jointNotes: 'Our go-to white wine for celebratory dinners.',
    body: 2,
    sweetness: 1,
    tannin: 1,
    acidity: 5,
    aromaTags: ['Grapefruit', 'Peach', 'Mineral / Flint', 'Tropical Fruit', 'Lemon / Citrus'],
    foodPairings: ['Seafood / Oysters', 'Grilled Salmon', 'Tapas'],
    purchase: {
      store: 'Majestic Wine',
      price: 24.50,
      currency: '£',
      date: '2026-08-01',
      notes: 'Anniversary celebration',
    },
    onlineLinks: {
      wineSearcher: 'https://www.wine-searcher.com/find/cloudy+bay+sauvignon+blanc+2023',
      vivino: 'https://www.vivino.com/search/wines?q=Cloudy+Bay+Sauvignon+Blanc+2023',
      googleShopping: 'https://www.google.com/search?tbm=shop&q=Cloudy+Bay+Sauvignon+Blanc+2023+buy+online',
      supermarketSearch: 'https://www.google.com/search?q=Cloudy+Bay+Sauvignon+Blanc+2023+supermarket+price',
    },
    favorite: true,
    wishlist: false,
    createdAt: '2026-08-02T18:00:00.000Z',
    updatedAt: '2026-08-02T18:00:00.000Z',
  },
  {
    id: 'wine-3',
    name: 'Côtes de Provence Rosé',
    producer: 'Whispering Angel (Château d\'Esclans)',
    vintage: '2023',
    type: 'rose',
    grape: 'Grenache, Cinsault, Vermentino',
    region: 'Provence',
    country: 'France',
    abv: '13.0%',
    imageUrl: 'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=800&auto=format&fit=crop&q=80',
    coupleVerdict: 'good',
    averageRating: 4.0,
    tastedTogether: true,
    partner1Review: {
      tasterName: 'Cody',
      rating: 3.5,
      verdict: 'good',
      notes: 'Pale, crisp and refreshing. Well balanced acidity.',
      aromas: ['Strawberry', 'Watermelon', 'Floral'],
      date: '2026-07-24',
    },
    partner2Review: {
      tasterName: 'Jess',
      rating: 4.5,
      verdict: 'loved-it',
      notes: 'Light and crisp red berry flavours. Ideal summer rosé.',
      aromas: ['Strawberry', 'Rose Petal'],
      date: '2026-07-24',
    },
    jointNotes: 'Great pairing for summer barbecues.',
    body: 2,
    sweetness: 1,
    tannin: 1,
    acidity: 4,
    aromaTags: ['Strawberry', 'Watermelon', 'Rose Petal', 'Crisp Apple'],
    foodPairings: ['Tapas', 'Charcuterie & Cheese', 'Grilled Salmon'],
    purchase: {
      store: 'Marks & Spencer',
      price: 19.00,
      currency: '£',
      date: '2026-07-24',
    },
    onlineLinks: {
      wineSearcher: 'https://www.wine-searcher.com/find/whispering+angel+rose+2023',
      vivino: 'https://www.vivino.com/search/wines?q=Whispering+Angel+Rose+2023',
      googleShopping: 'https://www.google.com/search?tbm=shop&q=Whispering+Angel+Rose+2023+buy+online',
      supermarketSearch: 'https://www.google.com/search?q=Whispering+Angel+Rose+2023+supermarket+price',
    },
    favorite: false,
    wishlist: false,
    createdAt: '2026-07-24T20:15:00.000Z',
    updatedAt: '2026-07-24T20:15:00.000Z',
  },
  {
    id: 'wine-4',
    name: 'Yellow Tail Shiraz',
    producer: 'Casella Family Brands',
    vintage: '2022',
    type: 'red',
    grape: 'Shiraz / Syrah',
    region: 'South Eastern Australia',
    country: 'Australia',
    abv: '13.5%',
    imageUrl: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&auto=format&fit=crop&q=80',
    coupleVerdict: 'bad',
    averageRating: 1.8,
    tastedTogether: true,
    partner1Review: {
      tasterName: 'Cody',
      rating: 2.0,
      verdict: 'bad',
      notes: 'Overly jammy flavour, lack of structure. Won\'t repurchase.',
      aromas: ['Plum'],
      date: '2026-07-15',
    },
    partner2Review: {
      tasterName: 'Jess',
      rating: 1.5,
      verdict: 'bad',
      notes: 'Too syrupy and unbalanced.',
      aromas: [],
      date: '2026-07-15',
    },
    jointNotes: 'Avoid. Remainder used for cooking broth.',
    body: 3,
    sweetness: 3,
    tannin: 2,
    acidity: 1,
    aromaTags: ['Plum'],
    foodPairings: [],
    purchase: {
      store: 'Corner Store',
      price: 6.50,
      currency: '£',
      date: '2026-07-15',
    },
    onlineLinks: {
      wineSearcher: 'https://www.wine-searcher.com/find/yellow+tail+shiraz+2022',
      vivino: 'https://www.vivino.com/search/wines?q=Yellow+Tail+Shiraz+2022',
      googleShopping: 'https://www.google.com/search?tbm=shop&q=Yellow+Tail+Shiraz+2022+buy+online',
      supermarketSearch: 'https://www.google.com/search?q=Yellow+Tail+Shiraz+2022+supermarket+price',
    },
    favorite: false,
    wishlist: false,
    createdAt: '2026-07-15T21:00:00.000Z',
    updatedAt: '2026-07-15T21:00:00.000Z',
  },
  {
    id: 'wine-5',
    name: 'Châteauneuf-du-Pape Rouge',
    producer: 'Château de Beaucastel',
    vintage: '2019',
    type: 'red',
    grape: 'Mourvèdre, Grenache, Syrah blend',
    region: 'Southern Rhône',
    country: 'France',
    abv: '14.5%',
    imageUrl: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=800&auto=format&fit=crop&q=80',
    coupleVerdict: 'special-occasion',
    averageRating: 5.0,
    tastedTogether: true,
    partner1Review: {
      tasterName: 'Cody',
      rating: 5.0,
      verdict: 'special-occasion',
      notes: 'Exceptional depth. Aromas of cedar, ripe dark berries, licorice and warm leather.',
      aromas: ['Dark Cherry', 'Leather', 'Oak', 'Cedar', 'Pepper', 'Blackberry'],
      date: '2026-06-20',
    },
    partner2Review: {
      tasterName: 'Jess',
      rating: 5.0,
      verdict: 'special-occasion',
      notes: 'Outstanding complexity and silky finish.',
      aromas: ['Dark Cherry', 'Chocolate', 'Floral'],
      date: '2026-06-20',
    },
    jointNotes: 'Splurge bottle for our anniversary dinner.',
    body: 5,
    sweetness: 1,
    tannin: 4,
    acidity: 3,
    aromaTags: ['Dark Cherry', 'Leather', 'Oak', 'Cedar', 'Pepper', 'Blackberry', 'Chocolate'],
    foodPairings: ['Roast Lamb', 'Duck Breast', 'Charcuterie & Cheese'],
    purchase: {
      store: 'Fine Wine Merchant',
      price: 78.00,
      currency: '£',
      date: '2026-06-19',
      notes: 'Special anniversary bottle',
    },
    onlineLinks: {
      wineSearcher: 'https://www.wine-searcher.com/find/beaucastel+chateauneuf+du+pape+2019',
      vivino: 'https://www.vivino.com/search/wines?q=Chateau+de+Beaucastel+Chateauneuf-du-Pape+2019',
      googleShopping: 'https://www.google.com/search?tbm=shop&q=Chateau+de+Beaucastel+Chateauneuf+du+Pape+2019+buy+online',
      supermarketSearch: 'https://www.google.com/search?q=Chateau+de+Beaucastel+Chateauneuf+du+Pape+2019+price',
    },
    favorite: true,
    wishlist: false,
    createdAt: '2026-06-20T22:00:00.000Z',
    updatedAt: '2026-06-20T22:00:00.000Z',
  }
];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export async function getWines(): Promise<Wine[]> {
  ensureDataDir();
  if (!fs.existsSync(WINES_FILE)) {
    await fs.promises.writeFile(WINES_FILE, JSON.stringify(SEED_WINES, null, 2), 'utf-8');
    return SEED_WINES;
  }
  try {
    const raw = await fs.promises.readFile(WINES_FILE, 'utf-8');
    const wines: Wine[] = JSON.parse(raw);
    return wines;
  } catch (err) {
    console.error('Error reading wines file:', err);
    return SEED_WINES;
  }
}

export async function getWineById(id: string): Promise<Wine | null> {
  const wines = await getWines();
  return wines.find((w) => w.id === id) || null;
}

export async function saveWine(wine: Wine): Promise<Wine> {
  const wines = await getWines();
  const existingIndex = wines.findIndex((w) => w.id === wine.id);
  
  if (!wine.onlineLinks?.wineSearcher) {
    wine.onlineLinks = {
      ...generateWineBuyLinks({
        name: wine.name,
        producer: wine.producer,
        vintage: wine.vintage,
        country: wine.country,
      }),
      ...wine.onlineLinks,
    };
  }

  if (existingIndex >= 0) {
    wines[existingIndex] = { ...wine, updatedAt: new Date().toISOString() };
  } else {
    wines.unshift({ ...wine, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }

  await fs.promises.writeFile(WINES_FILE, JSON.stringify(wines, null, 2), 'utf-8');
  return wine;
}

export async function replaceAllWines(wines: Wine[]): Promise<Wine[]> {
  ensureDataDir();
  await fs.promises.writeFile(WINES_FILE, JSON.stringify(wines, null, 2), 'utf-8');
  return wines;
}

export async function deleteWine(id: string): Promise<boolean> {
  const wines = await getWines();
  const filtered = wines.filter((w) => w.id !== id);
  if (filtered.length === wines.length) return false;
  await fs.promises.writeFile(WINES_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  return true;
}

export async function getSettings(): Promise<UserSettings> {
  ensureDataDir();
  if (!fs.existsSync(SETTINGS_FILE)) {
    await fs.promises.writeFile(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
    return DEFAULT_SETTINGS;
  }
  try {
    const raw = await fs.promises.readFile(SETTINGS_FILE, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    return DEFAULT_SETTINGS;
  }
}

export async function updateSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
  const current = await getSettings();
  const updated = { ...current, ...updates };
  ensureDataDir();
  await fs.promises.writeFile(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

export async function getStats() {
  const wines = await getWines();
  const settings = await getSettings();

  const totalBottles = wines.length;
  if (totalBottles === 0) {
    return {
      totalBottles: 0,
      avgRating: 0,
      goodValueCount: 0,
      lovedItCount: 0,
      totalSpend: 0,
      topGrape: 'None',
      topRegion: 'None',
      coupleAgreementScore: 100,
      bestValueWine: null,
      highestRatedWine: null,
      typeBreakdown: { red: 0, white: 0, rose: 0, sparkling: 0, dessert: 0, orange: 0 },
    };
  }

  let totalScore = 0;
  let totalSpend = 0;
  let goodValueCount = 0;
  let lovedItCount = 0;
  let agreementDiffSum = 0;
  let dualRatedCount = 0;

  const grapeCounts: Record<string, number> = {};
  const regionCounts: Record<string, number> = {};
  const typeBreakdown: Record<string, number> = { red: 0, white: 0, rose: 0, sparkling: 0, dessert: 0, orange: 0 };

  let highestRatedWine: Wine | null = null;
  let bestValueWine: Wine | null = null;

  for (const wine of wines) {
    totalScore += wine.averageRating || 0;
    if (wine.purchase?.price) {
      totalSpend += Number(wine.purchase.price);
    }
    if (wine.coupleVerdict === 'good-value') goodValueCount++;
    if (wine.coupleVerdict === 'loved-it') lovedItCount++;

    if (wine.type && typeBreakdown[wine.type] !== undefined) {
      typeBreakdown[wine.type]++;
    }

    if (wine.grape) {
      const g = wine.grape.split(',')[0].trim();
      grapeCounts[g] = (grapeCounts[g] || 0) + 1;
    }
    if (wine.region) {
      regionCounts[wine.region] = (regionCounts[wine.region] || 0) + 1;
    }

    if (wine.partner1Review?.rating && wine.partner2Review?.rating) {
      dualRatedCount++;
      agreementDiffSum += Math.abs(wine.partner1Review.rating - wine.partner2Review.rating);
    }

    if (!highestRatedWine || (wine.averageRating > highestRatedWine.averageRating)) {
      highestRatedWine = wine;
    }

    if (wine.coupleVerdict === 'good-value' || wine.averageRating >= 4.5) {
      if (!bestValueWine || (wine.purchase?.price && bestValueWine.purchase?.price && wine.purchase.price < bestValueWine.purchase.price)) {
        bestValueWine = wine;
      }
    }
  }

  const topGrape = Object.entries(grapeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Malbec';
  const topRegion = Object.entries(regionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Mendoza';

  const avgDiff = dualRatedCount > 0 ? agreementDiffSum / dualRatedCount : 0;
  const coupleAgreementScore = Math.max(60, Math.round(100 - avgDiff * 18));

  return {
    totalBottles,
    avgRating: Number((totalScore / totalBottles).toFixed(1)),
    goodValueCount,
    lovedItCount,
    totalSpend: Number(totalSpend.toFixed(2)),
    topGrape,
    topRegion,
    coupleAgreementScore,
    bestValueWine,
    highestRatedWine,
    typeBreakdown,
    settings,
  };
}
