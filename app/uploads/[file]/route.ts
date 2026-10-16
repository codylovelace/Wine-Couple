import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { IMAGE_TYPES, uploadPathFromUrl, UPLOAD_URL_PREFIX } from '@/lib/uploads';

// Uploaded photos live on the data volume, not in public/: Next.js only
// serves public/ files that existed at build time, so runtime uploads there
// would 404 in the standalone Docker build.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;
  const filePath = uploadPathFromUrl(`${UPLOAD_URL_PREFIX}${file}`);
  if (!filePath) {
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    const data = await fs.promises.readFile(filePath);
    const ext = path.extname(filePath).slice(1);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': IMAGE_TYPES[ext]?.mime ?? 'application/octet-stream',
        'Content-Length': String(data.length),
        // Filenames are unique per upload, so they never change.
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return new NextResponse('Not found', { status: 404 });
    }
    console.error('Error serving upload:', err);
    return new NextResponse('Error reading file', { status: 500 });
  }
}
