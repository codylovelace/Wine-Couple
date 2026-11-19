import fs from 'fs';
import { callGemini, GeminiPart } from './gemini';
import { Verdict, VERDICTS, WineScanResult, WineType } from './types';
import { detectImageType, IMAGE_TYPES, uploadPathFromUrl } from './uploads';

const WINE_TYPES: WineType[] = ['red', 'white', 'rose', 'sparkling', 'dessert', 'orange'];

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function scale(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? Math.round(n) : undefined;
}

function strList(v: unknown): string[] | undefined {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : undefined;
}

export function sanitizeScanResult(raw: Record<string, unknown>): WineScanResult {
  const type = str(raw.type).toLowerCase() as WineType;
  const verdict = str(raw.suggestedVerdict) as Verdict;
  return {
    name: str(raw.name),
    producer: str(raw.producer),
    vintage: str(raw.vintage),
    type: WINE_TYPES.includes(type) ? type : 'red',
    grape: str(raw.grape),
    region: str(raw.region),
    country: str(raw.country),
    abv: str(raw.abv),
    suggestedVerdict: verdict in VERDICTS ? verdict : undefined,
    suggestedAromas: strList(raw.suggestedAromas),
    tastingNotesSummary: str(raw.tastingNotesSummary) || undefined,
    body: scale(raw.body),
    sweetness: scale(raw.sweetness),
    tannin: scale(raw.tannin),
    acidity: scale(raw.acidity),
    foodPairings: strList(raw.foodPairings),
  };
}

export const SCAN_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    producer: { type: 'STRING' },
    vintage: { type: 'STRING' },
    type: { type: 'STRING', enum: WINE_TYPES },
    grape: { type: 'STRING' },
    region: { type: 'STRING' },
    country: { type: 'STRING' },
    abv: { type: 'STRING' },
    suggestedAromas: { type: 'ARRAY', items: { type: 'STRING' } },
    tastingNotesSummary: { type: 'STRING' },
    body: { type: 'INTEGER' },
    sweetness: { type: 'INTEGER' },
    tannin: { type: 'INTEGER' },
    acidity: { type: 'INTEGER' },
    foodPairings: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['name', 'producer', 'vintage', 'type', 'grape', 'region', 'country'],
};

async function resolveScanImage(input: string): Promise<{ mimeType: string; data: string } | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('data:image/')) {
    const match = trimmed.match(/^data:(image\/[\w.+-]+);base64,(.+)$/s);
    if (!match) return null;
    const data = match[2].replace(/\s+/g, '');
    return data ? { mimeType: match[1], data } : null;
  }

  const filePath = uploadPathFromUrl(trimmed);
  if (!filePath) return null;

  try {
    const buf = await fs.promises.readFile(filePath);
    const kind = detectImageType(buf);
    if (!kind) return null;
    return { mimeType: IMAGE_TYPES[kind].mime, data: buf.toString('base64') };
  } catch {
    return null;
  }
}

export type ScanOutcome =
  | { ok: true; scanResult: WineScanResult; model: string }
  | { ok: false; reason: 'no-key' | 'ai-error' | 'busy' | 'no-label'; error: string };

// Reads front (and optional back) label photo(s) using Gemini with a strict JSON schema.
export async function scanBottleImages(imageBase64: string, backImageBase64?: string): Promise<ScanOutcome> {
  const front = await resolveScanImage(imageBase64);
  const back =
    typeof backImageBase64 === 'string' && backImageBase64.trim()
      ? await resolveScanImage(backImageBase64)
      : null;
  const images = [front, back].filter((x): x is { mimeType: string; data: string } => x !== null);
  if (images.length === 0) {
    return {
      ok: false,
      reason: 'ai-error',
      error: "Couldn't read the bottle photo for scanning. Try taking a fresh photo.",
    };
  }

  const hasBoth = Boolean(front && back);
  const prompt = `You are an expert master sommelier and wine label recognition system.
Analyze ${hasBoth ? 'these front and back wine bottle label photos together' : 'this wine bottle / label photo'} and extract all key information into structured JSON.
${hasBoth ? 'Use the front label for the main bottle name/brand and vintage, and the back label for grape varietals, ABV, tasting notes, and food pairings if printed there.' : ''}
Field guidance:
- "name": The wine's own name as the front label shows it most prominently (brand or cuvée such as 'Navigator', 'Yellow Tail', 'Gran Reserva 904', 'Private Bin'). Never just the grape variety if a brand/cuvée or producer is shown; if only producer and grape appear, put producer here.
- "producer": The winery or producer if printed separately from the name; otherwise "".
- "vintage": Year (e.g. "2021") or "NV" if non-vintage.
- "type": One of "red", "white", "rose", "sparkling", "dessert", "orange".
- "grape": Primary grape or blend.
- "region": Appellation / region.
- "country": Country of origin.
- "abv": Alcohol percentage (e.g. "13.5%").
- "suggestedAromas": 3-5 classic aroma/flavour tags.
- "tastingNotesSummary": 1-2 sentence summary of the wine's style and flavours.
- "body", "sweetness", "tannin", "acidity": integers from 1 to 5.
- "foodPairings": 2-4 concise food pairing suggestions.`;

  const parts: GeminiPart[] = [
    { text: prompt },
    ...images.map((img) => ({ inlineData: img })),
  ];

  const result = await callGemini(parts, {
    feature: 'Label scanning',
    responseSchema: SCAN_RESPONSE_SCHEMA,
  });
  if (!result.ok) {
    return { ok: false, reason: result.reason, error: result.error };
  }

  let scanResult: WineScanResult;
  try {
    const cleaned = result.text.replace(/^```(?:json)?\s*|\s*```$/g, '');
    scanResult = sanitizeScanResult(JSON.parse(cleaned));
  } catch {
    return {
      ok: false,
      reason: 'ai-error',
      error: "Gemini's answer couldn't be read. Try again.",
    };
  }

  if (!scanResult.name && !scanResult.producer) {
    return {
      ok: false,
      reason: 'no-label',
      error: "Couldn't find a wine label in that photo. Try a closer, straight-on shot.",
    };
  }

  return { ok: true, scanResult, model: result.model };
}
