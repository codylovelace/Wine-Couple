import { getSettings } from './db';

// gemini-flash-latest is Google's rolling alias for the current Flash model,
// so the app keeps working as individual model versions are retired.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export type GeminiResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'no-key' | 'ai-error'; error: string };

export async function geminiApiKey(): Promise<string | undefined> {
  const settings = await getSettings();
  return settings.geminiApiKey || process.env.GEMINI_API_KEY || undefined;
}

// One JSON-mode generateContent call. Errors come back as a message the app
// can show as-is, rather than as an exception.
export async function callGemini(
  parts: GeminiPart[],
  opts: { temperature?: number; timeoutMs?: number; feature: string }
): Promise<GeminiResult> {
  const apiKey = await geminiApiKey();
  if (!apiKey) {
    return {
      ok: false,
      reason: 'no-key',
      error: `${opts.feature} needs a Gemini API key. Add one in Settings, or set GEMINI_API_KEY on the server.`,
    };
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Header rather than ?key= so the key never lands in URL logs.
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseMimeType: 'application/json', temperature: opts.temperature ?? 0.2 },
        }),
        signal: AbortSignal.timeout(opts.timeoutMs ?? 45_000),
      }
    );

    if (!res.ok) {
      const detail = await res.text();
      console.warn(`Gemini (${GEMINI_MODEL}) returned ${res.status}:`, detail);
      const keyProblem = /API_KEY_INVALID|API key not valid|PERMISSION_DENIED|API_KEY/i.test(detail);
      const error =
        res.status === 401 || res.status === 403 || (res.status === 400 && keyProblem)
          ? 'Gemini rejected the API key. Check or replace it in Settings.'
          : res.status === 404
            ? `Gemini model "${GEMINI_MODEL}" was not found. Set GEMINI_MODEL to a current model.`
            : res.status === 429
              ? 'Gemini rate limit reached. Try again in a minute.'
              : `Gemini returned an error (${res.status}).`;
      return { ok: false, reason: 'ai-error', error };
    }

    const data = await res.json();
    const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { ok: false, reason: 'ai-error', error: 'Gemini returned an empty answer. Try again.' };
    return { ok: true, text };
  } catch (error) {
    console.error(`Gemini call for ${opts.feature} failed:`, error);
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    return {
      ok: false,
      reason: 'ai-error',
      error: timedOut ? 'Gemini took too long to answer. Try again.' : "Couldn't reach Gemini. Try again.",
    };
  }
}
