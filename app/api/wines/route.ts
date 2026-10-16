import { NextRequest, NextResponse } from 'next/server';
import { createWine, getWines } from '@/lib/db';
import { withUser } from '@/lib/auth';
import { Wine } from '@/lib/types';
import { applyReview, applySharedFields, cleanReviewInput, cleanSharedFields } from '@/lib/wine-logic';

export const dynamic = 'force-dynamic';

export const GET = withUser(async () => {
  try {
    return NextResponse.json({ success: true, wines: await getWines() });
  } catch (error) {
    console.error('API /api/wines GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch wines' }, { status: 500 });
  }
});

// Body: { wine: shared fields, myReview?: { liked, rating, notes } | null }
// Only the signed-in person's own review can be set; the other partner's
// stays open for them to add from their own phone.
export const POST = withUser(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const fields = cleanSharedFields(body.wine);
    if (!fields.name) {
      return NextResponse.json({ success: false, error: 'The wine needs a name.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const wine: Wine = {
      id: `wine-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: '',
      producer: '',
      vintage: 'NV',
      type: 'red',
      grape: '',
      region: '',
      country: '',
      coupleVerdict: 'okay',
      averageRating: 0,
      tastedTogether: false,
      purchase: { store: '', price: 0, currency: '£' },
      onlineLinks: {},
      comments: [],
      createdBy: user.id,
      updatedBy: user.id,
      createdAt: now,
      updatedAt: now,
    };
    applySharedFields(wine, fields);
    if (!wine.vintage) wine.vintage = 'NV';

    const review = cleanReviewInput(body.myReview);
    if (review !== undefined) applyReview(wine, user.slot, user.name, review);

    const saved = await createWine(wine);
    return NextResponse.json({ success: true, wine: saved }, { status: 201 });
  } catch (error) {
    console.error('API /api/wines POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save wine' }, { status: 500 });
  }
});
