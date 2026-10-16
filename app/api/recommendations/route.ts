import { NextResponse } from 'next/server';
import { withUser } from '@/lib/auth';
import { getWines } from '@/lib/db';
import { bothLiked } from '@/lib/recommendations';
import { fingerprint, generateRecommendations, getCachedRecommendations } from '@/lib/recommendations-server';
import { geminiApiKey } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

// The last suggestions, without calling Gemini. stale: true means the wines
// you both liked have changed since, so the page asks for a fresh set.
export const GET = withUser(async () => {
  const [cached, wines, key] = await Promise.all([getCachedRecommendations(), getWines(), geminiApiKey()]);
  return NextResponse.json({
    success: true,
    set: cached,
    stale: !cached || cached.fingerprint !== fingerprint(wines),
    bothLikedCount: bothLiked(wines).length,
    hasKey: Boolean(key),
  });
});

// Ask Gemini for a fresh set (and cache it).
export const POST = withUser(async () => {
  const result = await generateRecommendations();
  if (!result.ok) {
    return NextResponse.json({ success: false, reason: result.reason, error: result.error }, { status: 200 });
  }
  return NextResponse.json({ success: true, set: result.set, stale: false });
});
