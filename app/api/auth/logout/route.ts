import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, deleteSession, sessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const token = sessionToken(request);
  if (token) await deleteSession(token);
  const res = NextResponse.json({ success: true });
  clearSessionCookie(res);
  return res;
}
