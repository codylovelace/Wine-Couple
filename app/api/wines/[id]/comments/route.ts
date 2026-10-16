import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { updateWine, WineNotFoundError } from '@/lib/db';
import { withUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const MAX_COMMENT = 2000;

export const POST = withUser(async (request: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  try {
    const { text } = await request.json();
    const clean = typeof text === 'string' ? text.trim().slice(0, MAX_COMMENT) : '';
    if (!clean) {
      return NextResponse.json({ success: false, error: 'Write something first.' }, { status: 400 });
    }
    const wine = await updateWine(id, user.id, (w) => {
      w.comments = [
        ...(w.comments ?? []),
        {
          id: `c-${crypto.randomBytes(6).toString('hex')}`,
          authorId: user.id,
          text: clean,
          createdAt: new Date().toISOString(),
        },
      ];
    });
    return NextResponse.json({ success: true, wine }, { status: 201 });
  } catch (error) {
    if (error instanceof WineNotFoundError) {
      return NextResponse.json({ success: false, error: 'Wine not found' }, { status: 404 });
    }
    console.error('Comment POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to add comment' }, { status: 500 });
  }
});
