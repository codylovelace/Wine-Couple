import { NextRequest, NextResponse } from 'next/server';
import {
  cleanName,
  createInitialUsers,
  createSession,
  passwordProblem,
  setSessionCookie,
  SetupAlreadyDoneError,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

// First run only: creates both accounts and signs in whoever filled the form.
// Body: { people: [{ name, password }, { name, password }], me: 0 | 1 }
// people[0] becomes partner 1, matching the existing reviews in the cellar.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const people = Array.isArray(body.people) ? body.people.slice(0, 2) : [];
    if (people.length !== 2) {
      return NextResponse.json({ success: false, error: 'Set up both accounts.' }, { status: 400 });
    }
    const cleaned = people.map((p: { name?: unknown; password?: unknown }) => ({
      name: cleanName(p?.name),
      password: typeof p?.password === 'string' ? p.password : '',
    }));
    if (cleaned.some((p: { name: string }) => !p.name)) {
      return NextResponse.json({ success: false, error: 'Both of you need a name.' }, { status: 400 });
    }
    if (cleaned[0].name.toLowerCase() === cleaned[1].name.toLowerCase()) {
      return NextResponse.json({ success: false, error: 'Both of you need different names.' }, { status: 400 });
    }
    for (const p of cleaned) {
      const problem = passwordProblem(p.password);
      if (problem) return NextResponse.json({ success: false, error: `${p.name}: ${problem}` }, { status: 400 });
    }

    const users = await createInitialUsers(cleaned);
    const me = users[body.me === 1 ? 1 : 0];
    const { token, expiresAt } = await createSession(me.id);
    const res = NextResponse.json({ success: true });
    setSessionCookie(res, request, token, expiresAt);
    return res;
  } catch (error) {
    if (error instanceof SetupAlreadyDoneError) {
      return NextResponse.json({ success: false, error: 'Accounts are already set up. Sign in instead.' }, { status: 409 });
    }
    console.error('Setup error:', error);
    return NextResponse.json({ success: false, error: 'Setup failed' }, { status: 500 });
  }
}
