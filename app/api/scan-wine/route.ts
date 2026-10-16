import { NextRequest, NextResponse } from 'next/server';
import { WineScanResult, WineType, Verdict, VERDICTS } from '@/lib/types';
import { withUser } from '@/lib/auth';
import { callGemini } from '@/lib/gemini';

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

// The model's JSON is untrusted: keep only fields of the right shape so a
// malformed answer can't put garbage into the form.
function sanitize(raw: Record<string, unknown>): WineScanResult {
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

const PROMPT = `You are an expert master sommelier and wine label recognition system.
Analyze this wine bottle / label photo and extract all key information into structured JSON.
Return ONLY valid JSON matching this schema:
{
  "name": "The wine's own name as the label shows it most prominently: a brand or cuvée such as 'Navigator', 'Yellow Tail', 'Gran Reserva 904' or 'Private Bin'. Never just the grape variety; if the label shows nothing but a producer and a grape, use the producer's name here",
  "producer": "The winery or producer, if printed separately from the name; otherwise an empty string",
  "vintage": "Year (e.g. 2021) or 'NV' if non-vintage",
  "type": "red" | "white" | "rose" | "sparkling" | "dessert" | "orange",
  "grape": "Primary grape or grape blend (e.g. Cabernet Sauvignon, Sauvignon Blanc, Pinot Noir)",
  "region": "Region/Appellation (e.g. Marlborough, Rioja, Bordeaux, Napa Valley)",
  "country": "Country of origin (e.g. France, Italy, New Zealand, USA, Spain, Argentina)",
  "abv": "Alcohol percentage (e.g. '13.5%')",
  "suggestedAromas": ["Dark Cherry", "Vanilla", "Oak"],
  "tastingNotesSummary": "1-2 sentence description of wine style, flavors, and profile",
  "body": 1-5 (1 light, 5 full),
  "sweetness": 1-5 (1 dry, 5 sweet),
  "tannin": 1-5 (1 low/smooth, 5 high),
  "acidity": 1-5 (1 soft, 5 crisp),
  "foodPairings": ["Steak", "Pasta"]
}`;

export const POST = withUser(async (request: NextRequest) => {
  let imageBase64: unknown;
  try {
    ({ imageBase64 } = await request.json());
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
  if (typeof imageBase64 !== 'string' || !imageBase64) {
    return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
  }

  const mimeMatch = imageBase64.match(/^data:(image\/[\w.+-]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const cleanBase64 = imageBase64.replace(/^data:image\/[\w.+-]+;base64,/, '');

  // No key or a Gemini error: say so instead of guessing, so the form is left
  // for manual entry rather than filled with a wine we made up.
  const result = await callGemini([{ text: PROMPT }, { inlineData: { mimeType, data: cleanBase64 } }], {
    feature: 'Label scanning',
  });
  if (!result.ok) {
    return NextResponse.json({ success: false, reason: result.reason, error: result.error }, { status: 200 });
  }

  let scanResult: WineScanResult;
  try {
    scanResult = sanitize(JSON.parse(result.text));
  } catch {
    return NextResponse.json(
      { success: false, reason: 'ai-error', error: "Gemini's answer couldn't be read. Try again." },
      { status: 200 }
    );
  }
  if (!scanResult.name && !scanResult.producer) {
    return NextResponse.json(
      { success: false, reason: 'no-label', error: "Couldn't find a wine label in that photo. Try a closer, straight-on shot." },
      { status: 200 }
    );
  }
  return NextResponse.json({ success: true, scanResult, source: 'gemini-ai' });
});
