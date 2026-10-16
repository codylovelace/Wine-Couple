import fs from 'fs';
import path from 'path';
import { Wine, UserSettings, isTasted } from './types';
import { generateWineBuyLinks } from './wine-search-links';
import { DATA_DIR } from './paths';
import { saveDataUrlImage, deleteUploadedImage } from './uploads';

const WINES_FILE = path.join(DATA_DIR, 'wines.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const DEFAULT_SETTINGS: UserSettings = {
  partner1Name: 'Cody',
  partner2Name: 'Jess',
  partner1Avatar: 'C',
  partner2Avatar: 'J',
  defaultCurrency: '£',
};

// All writes go through this queue so concurrent requests (e.g. both phones
// saving at once) can't interleave a read-modify-write and lose an update.
let writeQueue: Promise<unknown> = Promise.resolve();
function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.catch(() => undefined);
  return run;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Write to a temp file then rename, so a crash or full disk mid-write can
// never leave a truncated wines.json behind.
async function writeJsonAtomic(file: string, data: unknown) {
  ensureDataDir();
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.promises.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');
  await fs.promises.rename(tmp, file);
}

async function readWinesFile(): Promise<Wine[]> {
  ensureDataDir();
  if (!fs.existsSync(WINES_FILE)) {
    return [];
  }
  // Let parse errors propagate: returning [] here would make the next save
  // overwrite a damaged-but-recoverable file with an empty cellar.
  const raw = await fs.promises.readFile(WINES_FILE, 'utf-8');
  return JSON.parse(raw) as Wine[];
}

// One-off fixes for data saved by older versions. Returns true if anything changed.
async function migrateLegacyData(wines: Wine[]): Promise<boolean> {
  let changed = false;
  for (const wine of wines) {
    // Recommendations added to the wishlist used to be saved as tasted wines
    // with a made-up "Must Buy Again" 4.8. They have the wishlist- id prefix
    // and no partner reviews; mark them untasted and drop the invented score
    // and the "Online Selection" purchase (the price was only an estimate).
    if (
      wine.tasted === undefined &&
      wine.id.startsWith('wishlist-') &&
      !wine.partner1Review &&
      !wine.partner2Review
    ) {
      wine.tasted = false;
      wine.averageRating = 0;
      if (wine.purchase?.store === 'Online Selection') {
        wine.purchase = { ...wine.purchase, store: '', price: 0 };
      }
      changed = true;
    }
    // Older versions stored photos as base64 data URLs inside wines.json.
    // Move any of those out to the uploads volume and keep just the URL.
    if (wine.imageUrl?.startsWith('data:image/')) {
      try {
        wine.imageUrl = await saveDataUrlImage(wine.imageUrl);
        changed = true;
      } catch (err) {
        console.error(`Could not migrate inline photo for wine ${wine.id}:`, err);
      }
    }
  }
  return changed;
}

let migrationDone = false;

export async function getWines(): Promise<Wine[]> {
  if (!migrationDone) {
    await withWriteLock(async () => {
      if (migrationDone) return;
      const wines = await readWinesFile();
      if (await migrateLegacyData(wines)) {
        await writeJsonAtomic(WINES_FILE, wines);
      }
      migrationDone = true;
    });
  }
  return readWinesFile();
}

export async function getWineById(id: string): Promise<Wine | null> {
  const wines = await getWines();
  return wines.find((w) => w.id === id) || null;
}

export async function saveWine(wine: Wine): Promise<Wine> {
  if (wine.imageUrl?.startsWith('data:image/')) {
    wine.imageUrl = await saveDataUrlImage(wine.imageUrl);
  }

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

  const now = new Date().toISOString();
  let replacedImage: string | undefined;
  let saved: Wine;

  await withWriteLock(async () => {
    const wines = await readWinesFile();
    const existingIndex = wines.findIndex((w) => w.id === wine.id);
    if (existingIndex >= 0) {
      const previous = wines[existingIndex];
      if (previous.imageUrl && previous.imageUrl !== wine.imageUrl) {
        replacedImage = previous.imageUrl;
      }
      saved = { ...wine, createdAt: previous.createdAt || wine.createdAt || now, updatedAt: now };
      wines[existingIndex] = saved;
    } else {
      saved = { ...wine, createdAt: wine.createdAt || now, updatedAt: now };
      wines.unshift(saved);
    }
    await writeJsonAtomic(WINES_FILE, wines);
  });

  if (replacedImage) await deleteUploadedImage(replacedImage);
  return saved!;
}

export async function replaceAllWines(wines: Wine[]): Promise<Wine[]> {
  for (const wine of wines) {
    if (wine.imageUrl?.startsWith('data:image/')) {
      wine.imageUrl = await saveDataUrlImage(wine.imageUrl);
    }
  }
  await withWriteLock(() => writeJsonAtomic(WINES_FILE, wines));
  return wines;
}

export async function deleteWine(id: string): Promise<boolean> {
  let removed: Wine | undefined;
  await withWriteLock(async () => {
    const wines = await readWinesFile();
    removed = wines.find((w) => w.id === id);
    if (!removed) return;
    await writeJsonAtomic(WINES_FILE, wines.filter((w) => w.id !== id));
  });
  if (!removed) return false;
  if (removed.imageUrl) await deleteUploadedImage(removed.imageUrl);
  return true;
}

// Server-side only: includes the stored Gemini key. Never send this to the browser.
export async function getSettings(): Promise<UserSettings> {
  ensureDataDir();
  if (!fs.existsSync(SETTINGS_FILE)) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const raw = await fs.promises.readFile(SETTINGS_FILE, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Error reading settings file, using defaults:', err);
    return { ...DEFAULT_SETTINGS };
  }
}

// What the browser is allowed to see: the key itself is replaced by flags.
export function toPublicSettings(settings: UserSettings): UserSettings {
  const { geminiApiKey, ...rest } = settings;
  return {
    ...rest,
    hasGeminiKey: Boolean(geminiApiKey || process.env.GEMINI_API_KEY),
    geminiKeyFromEnv: !geminiApiKey && Boolean(process.env.GEMINI_API_KEY),
  };
}

// geminiApiKey semantics: undefined keeps the stored key, '' removes it,
// any other string replaces it.
export async function updateSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
  return withWriteLock(async () => {
    const current = await getSettings();
    const { hasGeminiKey: _h, geminiKeyFromEnv: _e, geminiApiKey, ...rest } = updates;
    const updated: UserSettings = { ...current, ...rest };
    if (geminiApiKey !== undefined) {
      if (geminiApiKey.trim()) updated.geminiApiKey = geminiApiKey.trim();
      else delete updated.geminiApiKey;
    }
    delete updated.hasGeminiKey;
    delete updated.geminiKeyFromEnv;
    await writeJsonAtomic(SETTINGS_FILE, updated);
    return updated;
  });
}

export async function getStats() {
  const wines = (await getWines()).filter(isTasted);
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
  let ratedCount = 0;
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
    if (wine.averageRating > 0) {
      totalScore += wine.averageRating;
      ratedCount++;
    }
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
    } else if (
      typeof wine.partner1Review?.liked === 'boolean' &&
      typeof wine.partner2Review?.liked === 'boolean'
    ) {
      // No stars from both: use the swipes. A split counts as the widest gap.
      dualRatedCount++;
      agreementDiffSum += wine.partner1Review.liked === wine.partner2Review.liked ? 0 : 4;
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

  const topGrape = Object.entries(grapeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';
  const topRegion = Object.entries(regionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

  const avgDiff = dualRatedCount > 0 ? agreementDiffSum / dualRatedCount : 0;
  const coupleAgreementScore = Math.max(60, Math.round(100 - avgDiff * 18));

  return {
    totalBottles,
    avgRating: ratedCount > 0 ? Number((totalScore / ratedCount).toFixed(1)) : 0,
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
