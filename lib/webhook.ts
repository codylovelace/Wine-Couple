import { getSettings } from './db';

export interface PartnerWebhookPayload {
  event: 'wine.logged' | 'wine.rated' | 'wine.commented' | 'test';
  title: string;
  message: string;
  actor: string;
  targetPartner?: string;
  wineId?: string;
  wineName?: string;
  verdict?: string;
}

async function postWebhook(url: string, payload: PartnerWebhookPayload): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      app: 'Vino',
      timestamp: new Date().toISOString(),
    }),
    signal: AbortSignal.timeout(5_000),
  });
}

// Fire-and-forget notification when your partner logs, rates, or comments.
export async function notifyPartnerWebhook(payload: PartnerWebhookPayload): Promise<void> {
  try {
    const { webhookUrl } = await getSettings();
    if (!webhookUrl) return;
    const res = await postWebhook(webhookUrl, payload);
    if (!res.ok) {
      console.warn(`Partner webhook (${payload.event}) returned HTTP ${res.status}`);
    }
  } catch (err) {
    console.warn(`Partner webhook (${payload.event}) failed:`, err);
  }
}

export async function sendTestWebhook(actor: string): Promise<{ ok: boolean; error?: string }> {
  const { webhookUrl } = await getSettings();
  if (!webhookUrl) {
    return { ok: false, error: 'Save a webhook URL first.' };
  }
  try {
    const res = await postWebhook(webhookUrl, {
      event: 'test',
      title: 'Vino test notification',
      message: `${actor} sent a test notification from Vino.`,
      actor,
    });
    if (!res.ok) {
      return { ok: false, error: `Webhook endpoint returned HTTP ${res.status}.` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not reach webhook URL.' };
  }
}
