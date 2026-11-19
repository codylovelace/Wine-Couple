import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/lib/auth';
import { getWines } from '@/lib/db';
import { callGemini } from '@/lib/gemini';
import { bothDisliked, bothLiked } from '@/lib/recommendations';
import { findDuplicateWine } from '@/lib/wine-match';
import { scanBottleImages } from '@/lib/wine-scan';
import { Wine } from '@/lib/types';

export const dynamic = 'force-dynamic';

export type ShelfVerdict = 'great-match' | 'worth-trying' | 'risky' | 'skip';

export interface ShelfPrediction {
  verdict: ShelfVerdict;
  matchScore: number;
  headline: string;
  summary: string;
  similarTo: string[];
}

const PREDICTION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    verdict: { type: 'STRING', enum: ['great-match', 'worth-trying', 'risky', 'skip'] },
    matchScore: { type: 'INTEGER' },
    headline: { type: 'STRING' },
    summary: { type: 'STRING' },
    similarTo: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['verdict', 'matchScore', 'headline', 'summary'],
};

function shortDesc(w: Wine): string {
  return [
    [w.producer, w.name].filter(Boolean).join(' '),
    w.type,
    w.grape,
    w.region,
    w.country,
  ]
    .filter(Boolean)
    .join(' | ');
}

export const POST = withUser(async (request: NextRequest) => {
  let imageBase64: unknown;
  let backImageBase64: unknown;
  try {
    ({ imageBase64, backImageBase64 } = await request.json());
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
  if (typeof imageBase64 !== 'string' || !imageBase64) {
    return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
  }

  const scan = await scanBottleImages(
    imageBase64,
    typeof backImageBase64 === 'string' && backImageBase64 ? backImageBase64 : undefined
  );
  if (!scan.ok) {
    return NextResponse.json({ success: false, reason: scan.reason, error: scan.error }, { status: 200 });
  }

  const wines = await getWines();
  const existingWine = findDuplicateWine(scan.scanResult, wines);
  if (existingWine) {
    return NextResponse.json({
      success: true,
      scanResult: scan.scanResult,
      existingWine,
      prediction: null,
    });
  }

  const liked = bothLiked(wines);
  const disliked = bothDisliked(wines);
  let prediction: ShelfPrediction | null = null;

  if (liked.length > 0) {
    const s = scan.scanResult;
    const candidateDesc = [
      [s.producer, s.name].filter(Boolean).join(' '),
      s.vintage,
      s.type,
      s.grape,
      [s.region, s.country].filter(Boolean).join(', '),
      s.tastingNotesSummary,
    ]
      .filter(Boolean)
      .join(' | ');

    const prompt = `You are a friendly sommelier advising a couple standing in a supermarket wine aisle.
They just scanned this bottle they haven't tried yet:
${candidateDesc}

Wines they BOTH loved (Must Buy Again):
${liked.slice(0, 25).map((w) => `- ${shortDesc(w)}`).join('\n')}
${disliked.length ? `\nWines they BOTH disliked (Avoid):\n${disliked.slice(0, 15).map((w) => `- ${shortDesc(w)}`).join('\n')}\n` : ''}
Predict how likely they are to enjoy this bottle together.
Return ONLY JSON:
{"verdict":"great-match|worth-trying|risky|skip","matchScore":0-100,"headline":"short 3-6 word verdict","summary":"1-2 friendly sentences comparing it to their tastes","similarTo":["up to 2 names of their liked wines if relevant"]}`;

    const ai = await callGemini([{ text: prompt }], {
      feature: 'Shelf check prediction',
      temperature: 0.3,
      timeoutMs: 25_000,
      responseSchema: PREDICTION_SCHEMA,
    });

    if (ai.ok) {
      try {
        const raw = JSON.parse(ai.text.replace(/^```(?:json)?\s*|\s*```$/g, '')) as Record<string, unknown>;
        const v = String(raw.verdict || 'worth-trying') as ShelfVerdict;
        const score = Number(raw.matchScore);
        prediction = {
          verdict: ['great-match', 'worth-trying', 'risky', 'skip'].includes(v) ? v : 'worth-trying',
          matchScore: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 70,
          headline: typeof raw.headline === 'string' && raw.headline.trim() ? raw.headline.trim().slice(0, 80) : 'Worth considering',
          summary: typeof raw.summary === 'string' ? raw.summary.trim().slice(0, 320) : '',
          similarTo: Array.isArray(raw.similarTo)
            ? raw.similarTo.filter((x): x is string => typeof x === 'string' && x.trim() !== '').slice(0, 2)
            : [],
        };
      } catch {
        prediction = null;
      }
    }
  }

  return NextResponse.json({
    success: true,
    scanResult: scan.scanResult,
    existingWine: null,
    prediction,
  });
});
