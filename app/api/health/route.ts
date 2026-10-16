import { NextResponse } from 'next/server';
import fs from 'fs';
import { DATA_DIR, UPLOADS_DIR } from '@/lib/paths';

export const dynamic = 'force-dynamic';

// Used by the Docker HEALTHCHECK: healthy only if both volumes are writable,
// which catches the common "bind mount owned by root" permission mistake.
export async function GET() {
  try {
    for (const dir of [DATA_DIR, UPLOADS_DIR]) {
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.access(dir, fs.constants.W_OK);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 503 });
  }
}
