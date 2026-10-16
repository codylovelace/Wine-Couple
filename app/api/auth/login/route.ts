import { NextRequest, NextResponse } from 'next/server';
import { checkLogin, createSession, setSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { name, password } = await request.json();
    if (typeof name !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ success: false, error: 'Enter your name and password.' }, { status: 400 });
    }
    const result = await checkLogin(name, password);
    if (!result.ok) {
      const error =
        result.reason === 'locked'
          ? `Too many wrong passwords. Try again in ${Math.ceil(result.seconds / 60)} min.`
          : "That password isn't right.";
      return NextResponse.json({ success: false, error }, { status: result.reason === 'locked' ? 429 : 401 });
    }
    const { token, expiresAt } = await createSession(result.user.id);
    const res = NextResponse.json({ success: true });
    setSessionCookie(res, request, token, expiresAt);
    return res;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Sign in failed' }, { status: 500 });
  }
}
