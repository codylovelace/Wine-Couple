import { NextRequest, NextResponse } from 'next/server';
import { cleanName, renameUser, toPublicUser, withUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Change your own display name (it's also what you sign in with).
export const PATCH = withUser(async (request: NextRequest, user) => {
  try {
    const name = cleanName((await request.json()).name);
    if (!name) return NextResponse.json({ success: false, error: 'Your name can’t be empty.' }, { status: 400 });
    const updated = await renameUser(user.id, name);
    return NextResponse.json({ success: true, user: toPublicUser(updated) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Rename failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
});
