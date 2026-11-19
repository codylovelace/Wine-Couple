import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/lib/auth';
import { getSettings, getWines } from '@/lib/db';
import { callGemini, geminiApiKey } from '@/lib/gemini';
import { WineRecommendation } from '@/lib/recommendations';
import { generateWineBuyLinks } from '@/lib/wine-search-links';
import { isTasted, Wine, WineType } from '@/lib/types';

export const dynamic = 'force-dynamic';

const WINE_TYPES: WineType[] = ['red', 'white', 'rose', 'sparkling', 'dessert', 'orange'];

const PAIRING_SCHEMA = {
  type: 'OBJECT',
  properties: {
    cellarPicks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          wineId: { type: 'STRING' },
          why: { type: 'STRING' },
        },
        required: ['wineId', 'why'],
      },
    },
    shopPicks: {
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
        },
        required: ['name', 'producer', 'type', 'grape', 'country', 'approxPrice', 'why'],
      },
    },
  },
  required: ['cellarPicks', 'shopPicks'],
};

function keywordCellarMatch(meal: string, candidates: Wine[]): { wineId: string; why: string }[] {
  const tokens = meal
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);

  const scored = candidates.map((w) => {
    const haystack = [
      ...(w.foodPairings ?? []),
      ...(w.aromaTags ?? []),
      w.grape,
      w.type,
      w.region,
      w.jointNotes,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    let score = (w.stock ?? 0) > 0 ? 2 : 0;
    if (w.coupleVerdict === 'loved-it') score += 2;
    else if (w.coupleVerdict === 'good-value') score += 1;

    const hits: string[] = [];
    for (const tok of tokens) {
      if (haystack.includes(tok)) {
        score += 4;
        hits.push(tok);
      }
    }

    // Light style heuristics for common meals when tags are sparse
    if (/steak|beef|lamb|roast|burger|bbq|venison/.test(meal.toLowerCase()) && w.type === 'red') score += 2;
    if (/fish|salmon|seafood|prawn|chicken|salad|pasta|pesto/.test(meal.toLowerCase()) && (w.type === 'white' || w.type === 'rose')) score += 2;
    if (/curry|spicy|thai|indian|chili/.test(meal.toLowerCase()) && (w.type === 'white' || w.type === 'rose' || w.type === 'sparkling')) score += 2;
    if (/cheese|celebrat|aperitif|tapas/.test(meal.toLowerCase()) && (w.type === 'sparkling' || w.type === 'red')) score += 1;

    const why =
      hits.length > 0
        ? `Matches ${hits.join(', ')} in your bottle profile${(w.stock ?? 0) > 0 ? ' (already at home)' : ''}.`
        : `${w.type === 'rose' ? 'Rosé' : w.type.charAt(0).toUpperCase() + w.type.slice(1)} favorite${w.grape ? ` (${w.grape})` : ''} that pairs well with ${meal}.`;

    return { wineId: w.id, score, why };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ wineId, why }) => ({ wineId, why }));
}

export const POST = withUser(async (request: NextRequest) => {
  let rawMeal: unknown;
  try {
    ({ meal: rawMeal } = await request.json());
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const meal = typeof rawMeal === 'string' ? rawMeal.trim().slice(0, 160) : '';
  if (!meal) {
    return NextResponse.json({ success: false, error: 'Tell us what you are cooking or eating.' }, { status: 400 });
  }

  const wines = await getWines();
  const currency = (await getSettings()).defaultCurrency || '£';
  const candidates = wines.filter(
    (w) =>
      isTasted(w) &&
      ((w.stock ?? 0) > 0 || w.coupleVerdict === 'loved-it' || w.coupleVerdict === 'good-value')
  );

  const hasKey = Boolean(await geminiApiKey());
  if (!hasKey) {
    return NextResponse.json({
      success: true,
      meal,
      cellarPicks: keywordCellarMatch(meal, candidates),
      shopPicks: [],
      source: 'cellar-only',
    });
  }

  const candidateLines = candidates
    .slice(0, 40)
    .map((w) =>
      [
        `id=${w.id}`,
        [w.producer, w.name].filter(Boolean).join(' '),
        w.type,
        w.grape,
        (w.stock ?? 0) > 0 ? `inRack=${w.stock}` : '',
        w.foodPairings?.length ? `pairings=${w.foodPairings.slice(0, 4).join(',')}` : '',
        w.aromaTags?.length ? `aromas=${w.aromaTags.slice(0, 4).join(',')}` : '',
      ]
        .filter(Boolean)
        .join(' | ')
    )
    .join('\n');

  const prompt = `You are a friendly UK sommelier helping a couple pick a wine for dinner tonight.
Tonight's meal: "${meal}"

Their favorite & in-rack cellar wines (prefer wines with inRack>0 when they pair well!):
${candidateLines || '(none logged yet)'}

Return ONLY JSON:
1. "cellarPicks": up to 3 best-matching wineIds from the list above (if none fit well, return fewer or []). Use the exact "id=" string.
2. "shopPicks": 2-3 real, UK-supermarket/high-street bottles they could buy for this meal (avoiding bottles already listed above). Prices in ${currency}.`;

  const result = await callGemini([{ text: prompt }], {
    feature: 'Dinner pairing',
    temperature: 0.5,
    timeoutMs: 35_000,
    responseSchema: PAIRING_SCHEMA,
  });

  if (!result.ok) {
    if (result.reason === 'busy') {
      return NextResponse.json({ success: false, reason: 'busy', error: result.error }, { status: 200 });
    }
    return NextResponse.json({
      success: true,
      meal,
      cellarPicks: keywordCellarMatch(meal, candidates),
      shopPicks: [],
      source: 'cellar-only',
    });
  }

  try {
    const parsed = JSON.parse(result.text.replace(/^```(?:json)?\s*|\s*```$/g, '')) as {
      cellarPicks?: { wineId?: unknown; why?: unknown }[];
      shopPicks?: Record<string, unknown>[];
    };
    const validIds = new Set(wines.map((w) => w.id));
    const cellarPicks = (Array.isArray(parsed.cellarPicks) ? parsed.cellarPicks : [])
      .filter((p) => typeof p?.wineId === 'string' && validIds.has(p.wineId))
      .slice(0, 3)
      .map((p) => ({
        wineId: p.wineId as string,
        why: typeof p.why === 'string' ? p.why.trim().slice(0, 260) : '',
      }));

    const shopPicks: WineRecommendation[] = (Array.isArray(parsed.shopPicks) ? parsed.shopPicks : [])
      .slice(0, 3)
      .map((r) => {
        const name = typeof r.name === 'string' ? r.name.trim().slice(0, 120) : '';
        const producer = typeof r.producer === 'string' ? r.producer.trim().slice(0, 120) : '';
        const t = typeof r.type === 'string' ? (r.type.toLowerCase() as WineType) : 'red';
        const price = Number(r.approxPrice);
        return {
          id: `pair-${crypto.randomBytes(5).toString('hex')}`,
          name,
          producer,
          type: WINE_TYPES.includes(t) ? t : 'red',
          grape: typeof r.grape === 'string' ? r.grape.trim().slice(0, 80) : '',
          region: typeof r.region === 'string' ? r.region.trim().slice(0, 80) : '',
          country: typeof r.country === 'string' ? r.country.trim().slice(0, 80) : '',
          estimatedPrice: Number.isFinite(price) && price > 0 ? Math.round(price * 100) / 100 : 0,
          currency,
          reason: typeof r.why === 'string' ? r.why.trim().slice(0, 300) : '',
          basedOn: [],
          onlineLinks: generateWineBuyLinks({ name, producer }),
        };
      })
      .filter((r) => Boolean(r.name));

    return NextResponse.json({
      success: true,
      meal,
      cellarPicks,
      shopPicks,
      source: 'gemini-ai',
    });
  } catch {
    return NextResponse.json({
      success: true,
      meal,
      cellarPicks: keywordCellarMatch(meal, candidates),
      shopPicks: [],
      source: 'cellar-only',
    });
  }
});
