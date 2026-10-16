import crypto from 'crypto';
import path from 'path';
import { DATA_DIR } from './paths';
import { readJson, withWriteLock, writeJsonAtomic } from './json-store';
import { getSettings, getWines } from './db';
import { callGemini, GEMINI_MODEL } from './gemini';
import { RecommendationSet, WineRecommendation, bothDisliked, bothLiked } from './recommendations';
import { generateWineBuyLinks } from './wine-search-links';
import { Wine, WineType } from './types';

const CACHE_FILE = path.join(DATA_DIR, 'recommendations.json');
const WINE_TYPES: WineType[] = ['red', 'white', 'rose', 'sparkling', 'dessert', 'orange'];
const HOW_MANY = 6;

function describe(w: Wine): string {
  const bits = [
    [w.producer, w.name].filter(Boolean).join(' '),
    w.vintage && w.vintage !== 'NV' ? w.vintage : '',
    w.type,
    w.grape,
    [w.region, w.country].filter(Boolean).join(', '),
    w.purchase?.price ? `${w.purchase.currency}${w.purchase.price}` : '',
    w.aromaTags?.length ? `notes: ${w.aromaTags.slice(0, 5).join(', ')}` : '',
  ];
  return bits.filter(Boolean).join(' | ');
}

// What the suggestions depend on: the wines you both liked or both disliked,
// and everything already in the cellar (so it isn't suggested back).
export function fingerprint(wines: Wine[]): string {
  const key = JSON.stringify({
    liked: bothLiked(wines).map((w) => w.id).sort(),
    disliked: bothDisliked(wines).map((w) => w.id).sort(),
    cellar: wines.map((w) => `${w.producer}|${w.name}`.toLowerCase()).sort(),
    model: GEMINI_MODEL,
  });
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
}

function str(v: unknown, max = 120): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

// The schema makes Gemini answer {"recommendations":[...]}, but older models
// and aliases have been seen to ignore it and return a bare array or use
// another key, so accept any of those.
function findList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.recommendations)) return obj.recommendations;
  return Object.values(obj).find(Array.isArray) ?? [];
}

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    recommendations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          producer: { type: 'STRING' },
          type: { type: 'STRING', enum: WINE_TYPES },
          grape: { type: 'STRING' },
          region: { type: 'STRING' },
          country: { type: 'STRING' },
          approxPrice: { type: 'NUMBER' },
          why: { type: 'STRING' },
          similarTo: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['name', 'producer', 'type', 'grape', 'country', 'approxPrice', 'why'],
      },
    },
  },
  required: ['recommendations'],
};

function sanitize(list: unknown[], currency: string, cellar: Set<string>, max: number): WineRecommendation[] {
  const out: WineRecommendation[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const name = str(r.name);
    const producer = str(r.producer);
    if (!name || cellar.has(`${producer}|${name}`.toLowerCase())) continue;
    const type = str(r.type).toLowerCase() as WineType;
    const price = Number(r.approxPrice);
    out.push({
      id: `rec-${crypto.randomBytes(5).toString('hex')}`,
      name,
      producer,
      type: WINE_TYPES.includes(type) ? type : 'red',
      grape: str(r.grape),
      region: str(r.region),
      country: str(r.country),
      estimatedPrice: Number.isFinite(price) && price > 0 ? Math.round(price * 100) / 100 : 0,
      currency,
      reason: str(r.why, 400),
      basedOn: Array.isArray(r.similarTo) ? r.similarTo.map((s) => str(s)).filter(Boolean).slice(0, 3) : [],
      onlineLinks: generateWineBuyLinks({ name, producer }),
    });
  }
  return out.slice(0, max);
}

export async function getCachedRecommendations(): Promise<RecommendationSet | null> {
  return readJson<RecommendationSet | null>(CACHE_FILE, null);
}

export type GenerateResult =
  | { ok: true; set: RecommendationSet }
  | { ok: false; reason: 'no-key' | 'ai-error' | 'busy' | 'not-enough'; error: string };

let inFlight: Promise<GenerateResult> | null = null;

// Asks Gemini for new suggestions and caches them. Concurrent calls (both
// phones opening For You at once) share one request.
export function generateRecommendations(): Promise<GenerateResult> {
  inFlight ??= generate().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function generate(): Promise<GenerateResult> {
  const wines = await getWines();
  const liked = bothLiked(wines);
  if (liked.length === 0) {
    return {
      ok: false,
      reason: 'not-enough',
      error: 'Suggestions are based on wines you both liked. Rate a few first.',
    };
  }
  const disliked = bothDisliked(wines);
  const currency = (await getSettings()).defaultCurrency || '£';

  const prompt = `You are a friendly, knowledgeable wine merchant helping a couple in the UK find their next bottle.

Wines they BOTH liked:
${liked.slice(0, 40).map((w) => `- ${describe(w)}`).join('\n')}
${disliked.length ? `\nWines they BOTH disliked (steer away from these styles):\n${disliked.slice(0, 20).map((w) => `- ${describe(w)}`).join('\n')}\n` : ''}
Wines already in their cellar (do not suggest these): ${wines.map((w) => [w.producer, w.name].filter(Boolean).join(' ')).slice(0, 150).join('; ')}

Suggest ${HOW_MANY} different real, currently available wines they are likely to enjoy together, at roughly the price they usually pay. Prefer wines sold by UK supermarkets or high-street merchants. Mix close matches with one or two adventurous picks.

Return ONLY JSON:
{"recommendations":[{"name":"wine name without producer","producer":"producer","type":"red|white|rose|sparkling|dessert|orange","grape":"grape or blend","region":"region","country":"country","approxPrice":12.5,"why":"one or two sentences, addressed to them, on why it fits","similarTo":["name of one of their liked wines it's based on"]}]}
Prices are in ${currency}.`;

  const asked = await askForWines(prompt, wines, currency, 'Suggestions', HOW_MANY);
  if (!asked.ok) return asked;

  const set: RecommendationSet = {
    fingerprint: fingerprint(wines),
    generatedAt: new Date().toISOString(),
    model: asked.model,
    recommendations: asked.recommendations,
  };
  await withWriteLock(() => writeJsonAtomic(CACHE_FILE, set));
  return { ok: true, set };
}

const JSON_SHAPE = `{"recommendations":[{"name":"wine name without producer","producer":"producer","type":"red|white|rose|sparkling|dessert|orange","grape":"grape or blend","region":"region","country":"country","approxPrice":12.5,"why":"one or two sentences, addressed to them, on why it fits","similarTo":["name of one of their wines it's based on"]}]}`;

function cellarLine(wines: Wine[]): string {
  return wines.map((w) => [w.producer, w.name].filter(Boolean).join(' ')).slice(0, 150).join('; ');
}

type AskResult =
  | { ok: true; recommendations: WineRecommendation[]; model: string }
  | { ok: false; reason: 'no-key' | 'ai-error' | 'busy'; error: string };

// One Gemini request for a list of wines, shared by For You and More like
// this: schema, retries (in callGemini), parsing and dropping cellar wines.
async function askForWines(prompt: string, wines: Wine[], currency: string, feature: string, max: number): Promise<AskResult> {
  const result = await callGemini([{ text: prompt }], {
    feature,
    temperature: 0.7,
    timeoutMs: 60_000,
    responseSchema: RESPONSE_SCHEMA,
  });
  if (!result.ok) return result;

  let list: unknown[];
  try {
    // Some models wrap JSON in a markdown fence even in JSON mode.
    list = findList(JSON.parse(result.text.replace(/^```(?:json)?\s*|\s*```$/g, '')));
  } catch {
    console.warn(`${feature}: Gemini (${result.model}) answer was not JSON:`, result.text.slice(0, 2000));
    return { ok: false, reason: 'ai-error', error: "Gemini's answer couldn't be read. Try again." };
  }
  const cellar = new Set(wines.map((w) => `${w.producer}|${w.name}`.toLowerCase()));
  const recommendations = sanitize(list, currency, cellar, max);
  if (recommendations.length === 0) {
    console.warn(`${feature}: nothing usable from Gemini (${result.model}); ${list.length} item(s) returned:`, result.text.slice(0, 2000));
    return {
      ok: false,
      reason: 'ai-error',
      error:
        list.length > 0
          ? 'Gemini only suggested wines already in your cellar. Try again.'
          : 'Gemini didn’t suggest anything this time. Try again.',
    };
  }
  return { ok: true, recommendations, model: result.model };
}

// ---- More like this: suggestions for one wine ----

const SIMILAR_FILE = path.join(DATA_DIR, 'similar.json');
const SIMILAR_COUNT = 4;

type SimilarCache = Record<string, RecommendationSet>;

// Changes when anything Gemini was told about the wine changes, so editing
// the wine (or adding notes) offers a fresh set.
export function similarFingerprint(wine: Wine): string {
  const key = JSON.stringify({ wine: describeForSimilar(wine), model: GEMINI_MODEL });
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
}

function describeForSimilar(w: Wine): string {
  const profile = (
    [
      ['body', w.body],
      ['sweetness', w.sweetness],
      ['tannin', w.tannin],
      ['acidity', w.acidity],
    ] as const
  )
    .filter(([, v]) => typeof v === 'number' && v > 0)
    .map(([k, v]) => `${k} ${v}/5`)
    .join(', ');
  const notes = [w.partner1Review?.notes, w.partner2Review?.notes, w.jointNotes]
    .map((n) => n?.trim())
    .filter(Boolean)
    .join(' / ')
    .slice(0, 600);
  return [
    describe(w),
    profile && `taste profile: ${profile}`,
    w.foodPairings?.length ? `goes with: ${w.foodPairings.slice(0, 5).join(', ')}` : '',
    notes && `their notes: ${notes}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function getCachedSimilar(wineId: string): Promise<RecommendationSet | null> {
  const cache = await readJson<SimilarCache>(SIMILAR_FILE, {});
  return cache[wineId] ?? null;
}

const similarInFlight = new Map<string, Promise<GenerateResult>>();

// Both phones asking about the same wine at once share one request.
export function generateSimilar(wineId: string): Promise<GenerateResult> {
  let pending = similarInFlight.get(wineId);
  if (!pending) {
    pending = makeSimilar(wineId).finally(() => similarInFlight.delete(wineId));
    similarInFlight.set(wineId, pending);
  }
  return pending;
}

async function makeSimilar(wineId: string): Promise<GenerateResult> {
  const wines = await getWines();
  const wine = wines.find((w) => w.id === wineId);
  if (!wine) return { ok: false, reason: 'ai-error', error: 'That wine no longer exists.' };
  const currency = (await getSettings()).defaultCurrency || '£';

  const prompt = `You are a friendly, knowledgeable wine merchant helping a couple in the UK.

They want more wines that taste like this one:
${describeForSimilar(wine)}

Wines already in their cellar (do not suggest these): ${cellarLine(wines)}

Suggest ${SIMILAR_COUNT} different real, currently available wines with a similar taste and style: similar body, fruit, sweetness and structure. They can be from other producers, regions or grapes as long as they would feel familiar to someone who enjoys this wine. Keep to a similar price where possible. Prefer wines sold by UK supermarkets or high-street merchants.

Return ONLY JSON:
${JSON_SHAPE}
In "why", say what they share with this wine. "similarTo" can be left empty. Prices are in ${currency}.`;

  const asked = await askForWines(prompt, wines, currency, 'More like this', SIMILAR_COUNT);
  if (!asked.ok) return asked;

  const set: RecommendationSet = {
    fingerprint: similarFingerprint(wine),
    generatedAt: new Date().toISOString(),
    model: asked.model,
    recommendations: asked.recommendations,
  };
  // Read outside the lock: getWines can take it itself.
  const ids = new Set((await getWines()).map((w) => w.id));
  await withWriteLock(async () => {
    const cache = await readJson<SimilarCache>(SIMILAR_FILE, {});
    // Drop entries for wines that have since been deleted.
    for (const id of Object.keys(cache)) if (!ids.has(id)) delete cache[id];
    cache[wineId] = set;
    await writeJsonAtomic(SIMILAR_FILE, cache);
  });
  return { ok: true, set };
}
