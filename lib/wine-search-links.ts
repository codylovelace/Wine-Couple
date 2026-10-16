import { OnlineBuyLinks } from "./types";

/**
 * Builds direct online buy and search links for a wine
 */
export function generateWineBuyLinks(wine: {
  name: string;
  producer: string;
  vintage?: string;
  country?: string;
}): OnlineBuyLinks {
  const cleanName = `${wine.producer || ''} ${wine.name || ''} ${wine.vintage && wine.vintage !== 'NV' ? wine.vintage : ''}`.trim();
  const encodedQuery = encodeURIComponent(cleanName);

  return {
    wineSearcher: `https://www.wine-searcher.com/find/${encodeURIComponent(cleanName.replace(/\s+/g, '+'))}`,
    vivino: `https://www.vivino.com/search/wines?q=${encodedQuery}`,
    googleShopping: `https://www.google.com/search?tbm=shop&q=${encodedQuery}+wine+buy+online`,
    supermarketSearch: `https://www.google.com/search?q=${encodedQuery}+wine+supermarket+price`,
  };
}

export const POPULAR_AROMAS = [
  // Red wine aromas
  "Dark Cherry", "Blackberry", "Plum", "Raspberry", "Vanilla", "Oak", 
  "Tobacco", "Leather", "Chocolate", "Pepper", "Clove", "Earthy", "Cedar",
  // White wine aromas
  "Green Apple", "Lemon / Citrus", "Peach", "Pear", "Tropical Fruit", 
  "Grapefruit", "Butter / Brioche", "Mineral / Flint", "Honey", "Floral", "Herbal",
  // Rosé & Sparkling
  "Strawberry", "Watermelon", "Rose Petal", "Toasty", "Yeast / Brioche", "Crisp Apple"
];

export const POPULAR_PAIRINGS = [
  "Ribeye Steak", "Roast Lamb", "Creamy Pasta", "Tomato Pasta", 
  "Charcuterie & Cheese", "Grilled Salmon", "Seafood / Oysters", 
  "Duck Breast", "Wood-fired Pizza", "Tapas", "Dark Chocolate", "Spicy Asian Cuisine"
];

