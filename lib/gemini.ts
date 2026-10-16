import { getSettings } from './db';

// gemini-flash-latest is Google's rolling alias for the current Flash model,
// so the app keeps working as individual model versions are retired.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
// Optional second model to try when the main one is overloaded, rate limited
// or retired. Off unless set.
export const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL?.trim() || '';

export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export type GeminiResult =
  | { ok: true; text: string; model: string }
  | { ok: false; reason: 'no-key' | 'ai-error'; error: string };

export async function geminiApiKey(): Promise<string | undefined> {
  const settings = await getSettings();
  return settings.geminiApiKey || process.env.GEMINI_API_KEY || undefined;
}

// One JSON-mode generateContent call. Errors come back as a message the app
// can show as-is, rather than as an exception.
export async function callGemini(
  parts: GeminiPart[],
  opts: {
    temperature?: number;
    timeoutMs?: number;
    feature: string;
    // OpenAPI-style schema. Gemini then returns exactly this shape instead of
    // whatever JSON it picks (a bare array, a different key, and so on).
    responseSchema?: Record<string, unknown>;
  }
): Promise<GeminiResult> {
  const apiKey = await geminiApiKey();
  if (!apiKey) {
    return {
      ok: false,
      reason: 'no-key',
      error: `${opts.feature} needs a Gemini API key. Add one in Settings, or set GEMINI_API_KEY on the server.`,
    };
  }

  // Overloads (503) and rate limits (429) are usually brief, so retry a few
  // times with backoff, then try the backup model if one is configured. The
  // whole thing stays within one overall time budget.
  const deadline = Date.now() + (opts.timeoutMs ?? 45_000);
  const models = [GEMINI_MODEL, ...(GEMINI_FALLBACK_MODEL && GEMINI_FALLBACK_MODEL !== GEMINI_MODEL ? [GEMINI_FALLBACK_MODEL] : [])];
  let last: Attempt | null = null;

  for (const [m, model] of models.entries()) {
    for (let attempt = 0; attempt < RETRY_DELAYS_MS.length + 1; attempt++) {
      if (attempt > 0) {
        const wait = Math.max(RETRY_DELAYS_MS[attempt - 1], last?.retryAfterMs ?? 0) + Math.random() * 500;
        if (Date.now() + wait + MIN_ATTEMPT_MS > deadline) break;
        await new Promise((r) => setTimeout(r, wait));
      }
      const remaining = deadline - Date.now();
      if (remaining < MIN_ATTEMPT_MS) break;
      last = await attemptOnce(model, apiKey, parts, opts, remaining);
      if (last.ok) {
        if (m > 0) console.warn(`Gemini: ${GEMINI_MODEL} unavailable, ${opts.feature} answered by backup model ${model}.`);
        return { ok: true, text: last.text, model };
      }
      if (!last.retryable) break;
    }
    // Only move on to the backup model for problems a different model can fix.
    if (last && !last.ok && !last.tryOtherModel) break;
  }

  return { ok: false, reason: 'ai-error', error: last && !last.ok ? last.error : 'Gemini took too long to answer. Try again.' };
}

const RETRY_DELAYS_MS = [1_000, 3_000];
const MIN_ATTEMPT_MS = 5_000;

type Attempt =
  | { ok: true; text: string }
  | { ok: false; error: string; retryable: boolean; tryOtherModel: boolean; retryAfterMs?: number };

async function attemptOnce(
  model: string,
  apiKey: string,
  parts: GeminiPart[],
  opts: { temperature?: number; feature: string; responseSchema?: Record<string, unknown> },
  timeoutMs: number
): Promise<Attempt> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Header rather than ?key= so the key never lands in URL logs.
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: opts.temperature ?? 0.2,
            ...(opts.responseSchema ? { responseSchema: opts.responseSchema } : {}),
          },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      }
    );

    if (!res.ok) {
      const detail = await res.text();
      console.warn(`Gemini (${model}) returned ${res.status} for ${opts.feature}:`, detail.slice(0, 1000));
      const keyProblem = /API_KEY_INVALID|API key not valid|PERMISSION_DENIED|API_KEY/i.test(detail);
      if (res.status === 401 || res.status === 403 || (res.status === 400 && keyProblem)) {
        return { ok: false, error: 'Gemini rejected the API key. Check or replace it in Settings.', retryable: false, tryOtherModel: false };
      }
      if (res.status === 404) {
        return {
          ok: false,
          error: `Gemini model "${model}" was not found. Set GEMINI_MODEL to a current model.`,
          retryable: false,
          tryOtherModel: true,
        };
      }
      if (res.status === 429) {
        // A used-up daily quota won't clear by retrying; a per-minute limit will.
        const daily = /per.?day|PerDay/i.test(detail);
        return {
          ok: false,
          error: daily
            ? 'Your Gemini key has used up its free daily allowance. It resets at midnight Pacific time.'
            : 'Gemini rate limit reached. Try again in a minute.',
          retryable: !daily,
          tryOtherModel: true,
          retryAfterMs: retryAfterMs(res, detail),
        };
      }
      if (res.status === 500 || res.status === 503 || res.status === 504) {
        return {
          ok: false,
          error: 'Gemini is overloaded right now (a problem on Google’s side). Try again in a few minutes.',
          retryable: true,
          tryOtherModel: true,
          retryAfterMs: retryAfterMs(res, detail),
        };
      }
      return { ok: false, error: `Gemini returned an error (${res.status}).`, retryable: false, tryOtherModel: false };
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    // Thinking models can put a thought summary in an earlier part, so join
    // every non-thought part rather than trusting parts[0].
    const outParts: { text?: string; thought?: boolean }[] = candidate?.content?.parts ?? [];
    const text = outParts
      .filter((p) => !p.thought && typeof p.text === 'string')
      .map((p) => p.text)
      .join('')
      .trim();
    if (!text) {
      const why = candidate?.finishReason || data.promptFeedback?.blockReason || 'no candidates';
      console.warn(`Gemini (${model}) gave no text for ${opts.feature} (${why}):`, JSON.stringify(data).slice(0, 2000));
      const blocked = why === 'SAFETY' || why === 'PROHIBITED_CONTENT';
      return {
        ok: false,
        error: blocked ? 'Gemini declined to answer. Try again.' : 'Gemini returned an empty answer. Try again.',
        retryable: false,
        tryOtherModel: !blocked,
      };
    }
    return { ok: true, text };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    console.error(`Gemini (${model}) call for ${opts.feature} failed:`, error);
    return timedOut
      ? { ok: false, error: 'Gemini took too long to answer. Try again.', retryable: false, tryOtherModel: false }
      : { ok: false, error: "Couldn't reach Gemini. Try again.", retryable: true, tryOtherModel: false };
  }
}

// Honour Retry-After or Google's RetryInfo ("retryDelay": "7s"), capped so a
// phone isn't left waiting.
function retryAfterMs(res: Response, detail: string): number | undefined {
  const header = Number(res.headers.get('retry-after'));
  const fromBody = Number(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(detail)?.[1]);
  const secs = Number.isFinite(header) && header > 0 ? header : Number.isFinite(fromBody) && fromBody > 0 ? fromBody : 0;
  return secs ? Math.min(secs * 1000, 10_000) : undefined;
}
