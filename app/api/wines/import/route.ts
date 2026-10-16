import { NextRequest, NextResponse } from 'next/server';
import { replaceAllWines } from '@/lib/db';
import { withUser } from '@/lib/auth';
import { Wine } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Restores a backup from Settings > Export, replacing every wine.
// Accepts the export file ({ schemaVersion, wines }) or older backups
// ({ wines, settings } or a bare array).
export const POST = withUser(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const wines: unknown = Array.isArray(body) ? body : body?.wines;
    const valid =
      Array.isArray(wines) &&
      wines.every((w) => w && typeof w === 'object' && typeof w.id === 'string' && typeof w.name === 'string');
    if (!valid) {
      return NextResponse.json({ success: false, error: "That file isn't a Wine Couple backup." }, { status: 400 });
    }
    const version = typeof body?.schemaVersion === 'number' ? body.schemaVersion : 1;
    const saved = await replaceAllWines(wines as Wine[], version);
    return NextResponse.json({ success: true, wines: saved });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ success: false, error: 'Import failed' }, { status: 500 });
  }
});
