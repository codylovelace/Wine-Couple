import { NextRequest, NextResponse } from 'next/server';
import { deleteWine, getWineById, storeImage, updateWine, WineNotFoundError } from '@/lib/db';
import { getUsers, withUser } from '@/lib/auth';
import { VERDICTS } from '@/lib/types';
import { applyReview, applySharedFields, cleanReviewInput, cleanSharedFields } from '@/lib/wine-logic';
import { notifyPartnerWebhook } from '@/lib/webhook';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ success: false, error: 'Wine not found' }, { status: 404 });

export const GET = withUser(async (_request: NextRequest, _user, { params }: Ctx) => {
  const { id } = await params;
  const wine = await getWineById(id);
  return wine ? NextResponse.json({ success: true, wine }) : notFound();
});

// Body: { changes?: shared fields, myReview?: { liked, rating, notes } | null }
// Only the fields sent are changed, on the latest stored copy, so Cody
// editing the price can't undo Jess's rating saved a moment earlier.
export const PATCH = withUser(async (request: NextRequest, user, { params }: Ctx) => {
  const { id } = await params;
  try {
    const body = await request.json();
    const fields = cleanSharedFields(body.changes);
    if (fields.name === '') {
      return NextResponse.json({ success: false, error: 'The wine needs a name.' }, { status: 400 });
    }
    if (fields.imageUrl !== undefined) fields.imageUrl = await storeImage(fields.imageUrl);
    if (fields.backImageUrl !== undefined) fields.backImageUrl = await storeImage(fields.backImageUrl);
    const review = cleanReviewInput(body.myReview);

    const wine = await updateWine(id, user.id, (w) => {
      applySharedFields(w, fields);
      if (review !== undefined) applyReview(w, user.slot, user.name, review);
    });

    if (review !== undefined) {
      const partner = (await getUsers()).find((u) => u.id !== user.id);
      const verdictCfg = VERDICTS[wine.coupleVerdict];
      const bothRated = Boolean(wine.partner1Review && wine.partner2Review);
      const message =
        review === null
          ? `${user.name} marked ${wine.name} as didn't taste.`
          : bothRated
            ? `${user.name} rated ${wine.name} — Couple verdict: ${verdictCfg?.label ?? wine.coupleVerdict}!`
            : `${user.name} rated ${wine.name} — waiting for ${partner?.name ?? 'you'}!`;
      void notifyPartnerWebhook({
        event: 'wine.rated',
        title: `Wine rated: ${wine.name}`,
        message,
        actor: user.name,
        targetPartner: partner?.name,
        wineId: wine.id,
        wineName: wine.name,
        verdict: wine.coupleVerdict,
      });
    }

    return NextResponse.json({ success: true, wine });
  } catch (error) {
    if (error instanceof WineNotFoundError) return notFound();
    console.error('API /api/wines/[id] PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update wine' }, { status: 500 });
  }
});

export const DELETE = withUser(async (_request: NextRequest, _user, { params }: Ctx) => {
  const { id } = await params;
  try {
    return (await deleteWine(id)) ? NextResponse.json({ success: true }) : notFound();
  } catch (error) {
    console.error('API /api/wines/[id] DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete wine' }, { status: 500 });
  }
});
