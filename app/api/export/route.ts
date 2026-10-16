import { NextResponse } from 'next/server';
import { getWines, SCHEMA_VERSION } from '@/lib/db';
import { withUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Backup of every wine (photos stay on the photos volume). Restore it with
// Settings > Import.
export const GET = withUser(async () => {
  const wines = await getWines();
  const date = new Date().toISOString().split('T')[0];
  return new NextResponse(JSON.stringify({ schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), wines }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="wine-couple-backup-${date}.json"`,
      'Cache-Control': 'no-store',
    },
  });
});
