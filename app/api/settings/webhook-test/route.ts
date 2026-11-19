import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/lib/auth';
import { sendTestWebhook } from '@/lib/webhook';

export const dynamic = 'force-dynamic';

export const POST = withUser(async (_request: NextRequest, user) => {
  const result = await sendTestWebhook(user.name);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error || 'Webhook test failed.' }, { status: 400 });
  }
  return NextResponse.json({ success: true });
});
