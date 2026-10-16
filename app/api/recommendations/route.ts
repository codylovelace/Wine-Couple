import { NextResponse } from 'next/server';
import { getWines } from '@/lib/db';
import { getRecommendationsForCouple } from '@/lib/recommendations';

export async function GET() {
  try {
    const wines = await getWines();
    const recommendations = getRecommendationsForCouple(wines);
    return NextResponse.json({ success: true, recommendations });
  } catch (error) {
    console.error('Recommendations API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
