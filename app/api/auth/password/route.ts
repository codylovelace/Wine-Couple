import { NextRequest, NextResponse } from 'next/server';
import {
  deleteUserSessions,
  getUsers,
  passwordProblem,
  sessionToken,
  setUserPassword,
  verifyPassword,
  withUser,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Body: { currentPassword, newPassword, forUserId? }
// Changes your own password, or (with forUserId) resets your partner's when
// they've forgotten it. Either way your own current password is required, so
// a phone left signed in can't be used to lock someone out.
export const POST = withUser(async (request: NextRequest, user) => {
  try {
    const { currentPassword, newPassword, forUserId } = await request.json();
    if (typeof currentPassword !== 'string' || !(await verifyPassword(currentPassword, user.passwordHash))) {
      return NextResponse.json({ success: false, error: 'Your current password isn’t right.' }, { status: 403 });
    }
    const problem = passwordProblem(newPassword);
    if (problem) return NextResponse.json({ success: false, error: problem }, { status: 400 });

    const targetId = typeof forUserId === 'string' && forUserId ? forUserId : user.id;
    if (!(await getUsers()).some((u) => u.id === targetId)) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
    }
    await setUserPassword(targetId, newPassword);
    // Sign the account out on its other devices; keep this phone signed in.
    await deleteUserSessions(targetId, targetId === user.id ? sessionToken(request) : undefined);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json({ success: false, error: 'Password change failed' }, { status: 500 });
  }
});
