import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/lib/auth';
import { scanBottleImages } from '@/lib/wine-scan';

export const POST = withUser(async (request: NextRequest) => {
  let imageBase64: unknown;
  let backImageBase64: unknown;
  try {
    ({ imageBase64, backImageBase64 } = await request.json());
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
  if (typeof imageBase64 !== 'string' || !imageBase64) {
    return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
  }

  const outcome = await scanBottleImages(
    imageBase64,
    typeof backImageBase64 === 'string' && backImageBase64 ? backImageBase64 : undefined
  );
  if (!outcome.ok) {
    return NextResponse.json(
      { success: false, reason: outcome.reason, error: outcome.error },
      { status: 200 }
    );
  }
  return NextResponse.json({
    success: true,
    scanResult: outcome.scanResult,
    source: 'gemini-ai',
  });
});
