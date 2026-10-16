import { NextResponse } from 'next/server';
import { withUser } from '@/lib/auth';
import { getWines } from '@/lib/db';
import { generateSimilar, getCachedSimilar, similarFingerprint } from '@/lib/recommendations-server';
import { geminiApiKey } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

// The last "more like this" set for a wine, without calling Gemini. stale:
// true means the wine's details have changed since.
export const GET = withUser<Ctx>(async (_req, _user, { params }) => {
  const { id } = await params;
  const wine = (await getWines()).find((w) => w.id === id);
  if (!wine) return NextResponse.json({ success: false, error: 'Wine not found.' }, { status: 404 });
  const [set, key] = await Promise.all([getCachedSimilar(id), geminiApiKey()]);
  return NextResponse.json({
    success: true,
    set,
    stale: !set || set.fingerprint !== similarFingerprint(wine),
    hasKey: Boolean(key),
  });
});

// Ask Gemini for wines like this one (and cache them).
export const POST = withUser<Ctx>(async (_req, _user, { params }) => {
  const { id } = await params;
  const result = await generateSimilar(id);
  if (!result.ok) {
    return NextResponse.json({ success: false, reason: result.reason, error: result.error }, { status: 200 });
  }
  return NextResponse.json({ success: true, set: result.set, stale: false });
});
