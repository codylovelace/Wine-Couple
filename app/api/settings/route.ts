import { NextRequest, NextResponse } from 'next/server';
import { getSettings, toPublicSettings, updateSettings } from '@/lib/db';
import { getUsers, withUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const GET = withUser(async () => {
  try {
    return NextResponse.json({ success: true, settings: toPublicSettings(await getSettings(), await getUsers()) });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
  }
});

export const POST = withUser(async (request: NextRequest) => {
  try {
    const updated = await updateSettings(await request.json());
    return NextResponse.json({ success: true, settings: toPublicSettings(updated, await getUsers()) });
  } catch (error) {
    console.error('Settings POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 });
  }
});
