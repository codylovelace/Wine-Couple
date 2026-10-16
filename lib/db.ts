import path from 'path';
import { Wine, UserSettings, isTasted, verdictFromSwipes } from './types';
import { generateWineBuyLinks } from './wine-search-links';
import { DATA_DIR } from './paths';
import { saveDataUrlImage, deleteUploadedImage } from './uploads';
import { readJson, withWriteLock, writeJsonAtomic } from './json-store';
import type { StoredUser } from './auth';

const WINES_FILE = path.join(DATA_DIR, 'wines.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const META_FILE = path.join(DATA_DIR, 'meta.json');

// Bump when adding a one-off data migration below.
const SCHEMA_VERSION = 2;

const DEFAULT_SETTINGS: UserSettings = {
  partner1Name: 'Cody',
  partner2Name: 'Jess',
  partner1Avatar: 'C',
  partner2Avatar: 'J',
  defaultCurrency: '£',
};

async function readWinesFile(): Promise<Wine[]> {
  // Parse errors propagate: returning [] here would make the next save
  // overwrite a damaged-but-recoverable file with an empty cellar.
  return readJson<Wine[]>(WINES_FILE, []);
}

// The add form used to save these taste-profile values for every wine
// whether or not anything was known about it (there were no sliders, only
// the label scan could change them). A wine still holding exactly one of
// those default sets has no real profile.
const FILLER_TASTE_PROFILES = ['4,1,3,3', '3,1,3,3'];

// One-off fixes for data saved by older versions. Returns true if anything changed.
async function migrateLegacyData(wines: Wine[], fromVersion: number): Promise<boolean> {
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

    if (fromVersion < 2) {
      // Before logins, both reviews were entered together, so a missing
      // review meant that partner didn't taste it. Now a missing review means
      // "hasn't rated yet", so mark the old gaps explicitly.
      if (isTasted(wine)) {
        if (!wine.partner1Review) wine.partner1NotTasted = true;
        if (!wine.partner2Review) wine.partner2NotTasted = true;
        // A verdict that doesn't match the swipes (or predates them) was
        // chosen by hand, so it shouldn't change when someone re-rates.
        const fromSwipes = verdictFromSwipes(wine.partner1Review?.liked, wine.partner2Review?.liked);
        wine.verdictPinned = fromSwipes !== wine.coupleVerdict;
      }
      const profile = [wine.body, wine.sweetness, wine.tannin, wine.acidity].join(',');
      if (FILLER_TASTE_PROFILES.includes(profile)) {
        delete wine.body;
        delete wine.sweetness;
        delete wine.tannin;
        delete wine.acidity;
      }
      changed = true;
    }
  }
  return changed;
}

let migrationDone = false;

export async function getWines(): Promise<Wine[]> {
  if (!migrationDone) {
    await withWriteLock(async () => {
      if (migrationDone) return;
      const meta = await readJson<{ schemaVersion?: number }>(META_FILE, {});
      const wines = await readWinesFile();
      // A brand-new install has nothing to migrate.
      const fromVersion = meta.schemaVersion ?? (wines.length === 0 ? SCHEMA_VERSION : 1);
      if (await migrateLegacyData(wines, fromVersion)) {
        await writeJsonAtomic(WINES_FILE, wines);
      }
      if (meta.schemaVersion !== SCHEMA_VERSION) {
        await writeJsonAtomic(META_FILE, { ...meta, schemaVersion: SCHEMA_VERSION });
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

function withBuyLinks(wine: Wine) {
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
}

// A photo sent as a data URL is written to the photos volume first, so only
// its /uploads/ URL is stored.
export async function storeImage(imageUrl: string | undefined): Promise<string | undefined> {
  return imageUrl?.startsWith('data:image/') ? saveDataUrlImage(imageUrl) : imageUrl;
}

export async function createWine(wine: Wine): Promise<Wine> {
  wine.imageUrl = await storeImage(wine.imageUrl);
  withBuyLinks(wine);
  const now = new Date().toISOString();
  const saved = { ...wine, createdAt: now, updatedAt: now };
  await withWriteLock(async () => {
    const wines = await readWinesFile();
    if (wines.some((w) => w.id === saved.id)) throw new Error('A wine with that id already exists');
    wines.unshift(saved);
    await writeJsonAtomic(WINES_FILE, wines);
  });
  return saved;
}

export class WineNotFoundError extends Error {
  constructor() {
    super('Wine not found');
  }
}

// Read-modify-write of one wine under the write lock, so a change from one
// phone is applied to the latest copy and never undoes the other's.
export async function updateWine(
  id: string,
  userId: string,
  mutate: (wine: Wine) => void
): Promise<Wine> {
  let replacedImage: string | undefined;
  let saved: Wine | undefined;
  await withWriteLock(async () => {
    const wines = await readWinesFile();
    const index = wines.findIndex((w) => w.id === id);
    if (index < 0) throw new WineNotFoundError();
    const wine: Wine = structuredClone(wines[index]);
    const previousImage = wine.imageUrl;
    mutate(wine);
    if (previousImage && previousImage !== wine.imageUrl) replacedImage = previousImage;
    if (wine.name !== wines[index].name || wine.producer !== wines[index].producer) {
      // Search links are built from the name, so rebuild them after a rename.
      wine.onlineLinks = {};
    }
    withBuyLinks(wine);
    wine.updatedAt = new Date().toISOString();
    wine.updatedBy = userId;
    wines[index] = wine;
    saved = wine;
    await writeJsonAtomic(WINES_FILE, wines);
  });
  if (replacedImage) await deleteUploadedImage(replacedImage);
  return saved!;
}

export { SCHEMA_VERSION };

// Restores a backup made by Settings > Export. Backups from before
// schemaVersion was exported get the same one-off migrations as old data.
export async function replaceAllWines(wines: Wine[], backupSchemaVersion = 1): Promise<Wine[]> {
  await migrateLegacyData(wines, backupSchemaVersion);
  for (const wine of wines) withBuyLinks(wine);
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
  try {
    return { ...DEFAULT_SETTINGS, ...(await readJson<Partial<UserSettings>>(SETTINGS_FILE, {})) };
  } catch (err) {
    console.error('Error reading settings file, using defaults:', err);
    return { ...DEFAULT_SETTINGS };
  }
}

// What the browser is allowed to see: the key itself is replaced by flags,
// and once accounts exist the partner names are the account names.
export function toPublicSettings(settings: UserSettings, users: Pick<StoredUser, 'name' | 'slot'>[] = []): UserSettings {
  const { geminiApiKey, ...rest } = settings;
  const named = { ...rest };
  for (const user of users) {
    if (user.slot === 1) {
      named.partner1Name = user.name;
      named.partner1Avatar = user.name.charAt(0).toUpperCase();
    } else {
      named.partner2Name = user.name;
      named.partner2Avatar = user.name.charAt(0).toUpperCase();
    }
  }
  return {
    ...named,
    hasGeminiKey: Boolean(geminiApiKey || process.env.GEMINI_API_KEY),
    geminiKeyFromEnv: !geminiApiKey && Boolean(process.env.GEMINI_API_KEY),
  };
}

const CURRENCIES = ['£', '$', '€', 'A$'];

// Only the shared preferences can change here; partner names come from the
// accounts. geminiApiKey: undefined keeps the stored key, '' removes it, any
// other string replaces it.
export async function updateSettings(updates: { defaultCurrency?: unknown; geminiApiKey?: unknown }): Promise<UserSettings> {
  return withWriteLock(async () => {
    const updated = await getSettings();
    if (typeof updates.defaultCurrency === 'string' && CURRENCIES.includes(updates.defaultCurrency)) {
      updated.defaultCurrency = updates.defaultCurrency;
    }
    if (typeof updates.geminiApiKey === 'string') {
      if (updates.geminiApiKey.trim()) updated.geminiApiKey = updates.geminiApiKey.trim();
      else delete updated.geminiApiKey;
    }
    delete updated.hasGeminiKey;
    delete updated.geminiKeyFromEnv;
    await writeJsonAtomic(SETTINGS_FILE, updated, 0o600);
    return updated;
  });
}
