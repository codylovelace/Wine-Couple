import { NextRequest, NextResponse } from 'next/server';
import { WineScanResult, WineType, Verdict, VERDICTS } from '@/lib/types';
import { getSettings } from '@/lib/db';

// gemini-flash-latest is Google's rolling alias for the current Flash model,
// so the scanner keeps working as individual model versions are retired.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

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
  "name": "Wine Name (e.g. Reserva, Private Bin, Grand Vin)",
  "producer": "Winery / Producer / Brand name",
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

export async function POST(request: NextRequest) {
  let imageBase64: unknown;
  try {
    ({ imageBase64 } = await request.json());
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
  if (typeof imageBase64 !== 'string' || !imageBase64) {
    return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
  }

  const settings = await getSettings();
  const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // No key means no scanner. Say so instead of guessing, so the form is
    // left for manual entry rather than filled with a wine we made up.
    return NextResponse.json(
      {
        success: false,
        reason: 'no-key',
        error: 'Label scanning needs a Gemini API key (Settings, or GEMINI_API_KEY on the server). Fill in the details by hand for now.',
      },
      { status: 200 }
    );
  }

  const mimeMatch = imageBase64.match(/^data:(image\/[\w.+-]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const cleanBase64 = imageBase64.replace(/^data:image\/[\w.+-]+;base64,/, '');

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Header rather than ?key= so the key never lands in URL logs.
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT }, { inlineData: { mimeType, data: cleanBase64 } }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        }),
        signal: AbortSignal.timeout(45_000),
      }
    );

    if (!geminiRes.ok) {
      const detail = await geminiRes.text();
      console.warn(`Gemini (${GEMINI_MODEL}) returned ${geminiRes.status}:`, detail);
      const hint =
        geminiRes.status === 400 || geminiRes.status === 403
          ? 'Gemini rejected the request. Check the API key in Settings.'
          : geminiRes.status === 404
            ? `Gemini model "${GEMINI_MODEL}" was not found. Set GEMINI_MODEL to a current model.`
            : geminiRes.status === 429
              ? 'Gemini rate limit reached. Try again in a minute.'
              : `Gemini returned an error (${geminiRes.status}).`;
      return NextResponse.json({ success: false, reason: 'ai-error', error: hint }, { status: 200 });
    }

    const data = await geminiRes.json();
    const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json(
        { success: false, reason: 'ai-error', error: "Gemini couldn't read a label in that photo." },
        { status: 200 }
      );
    }

    const scanResult = sanitize(JSON.parse(text));
    if (!scanResult.name && !scanResult.producer) {
      return NextResponse.json(
        { success: false, reason: 'no-label', error: "Couldn't find a wine label in that photo. Try a closer, straight-on shot." },
        { status: 200 }
      );
    }
    return NextResponse.json({ success: true, scanResult, source: 'gemini-ai' });
  } catch (error) {
    console.error('Error invoking Gemini Vision API:', error);
    return NextResponse.json(
      { success: false, reason: 'ai-error', error: 'Label scan failed. Fill in the details by hand, or try again.' },
      { status: 200 }
    );
  }
}
