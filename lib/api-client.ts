'use client';

import { Wine } from './types';
import { ReviewInput, SharedWineFields } from './wine-logic';

// An API failure. reason is the server's own code when it sent one; 'busy'
// means Gemini was overloaded and asking again later should work.
export class ApiError extends Error {
  constructor(
    message: string,
    readonly reason?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// fetch wrapper for the app's JSON API. Throws with the server's message on
// failure; a 401 (signed out, or the session expired) goes to the sign-in page.
export async function api<T = Record<string, unknown>>(
  url: string,
  init?: { method?: string; body?: unknown; signal?: AbortSignal }
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init?.method ?? 'GET',
      headers: init?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
      signal: init?.signal,
    });
  } catch (err) {
    if (init?.signal?.aborted) throw err;
    // The phone dropping off wifi for a moment is worth retrying too.
    throw new ApiError("Couldn't reach the server. Check your connection.", 'busy');
  }
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Please sign in again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    // A 502/504 from a proxy in front of the app means a slow Gemini call
    // outlasted it: just as worth retrying.
    const reason = data.reason ?? (res.status === 502 || res.status === 504 ? 'busy' : undefined);
    throw new ApiError(data.error || `Server returned ${res.status}`, reason);
  }
  return data as T;
}

export function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

// Keeps calling fn while Gemini is busy, waiting a little longer each time
// (2s, 3s, 4.5s... up to 20s), until it works, fails for another reason, or
// signal is aborted (the Cancel button). onRetry reports each new attempt.
export async function retryWhileBusy<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  opts: { signal: AbortSignal; onRetry: (attempt: number, error: string) => void }
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn(opts.signal);
    } catch (err) {
      if (opts.signal.aborted || !(err instanceof ApiError) || err.reason !== 'busy') throw err;
      opts.onRetry(attempt + 1, err.message);
      const wait = Math.min(2_000 * 1.5 ** (attempt - 1), 20_000);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, wait);
        opts.signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(new DOMException('Cancelled', 'AbortError'));
          },
          { once: true }
        );
      });
    }
  }
}

export interface WineSubmission {
  changes: Partial<SharedWineFields>;
  // undefined: leave my review as it is. null: I didn't taste it.
  myReview?: ReviewInput | null;
}

export async function createWineApi(submission: WineSubmission): Promise<Wine> {
  const { wine } = await api<{ wine: Wine }>('/api/wines', {
    method: 'POST',
    body: { wine: submission.changes, myReview: submission.myReview },
  });
  return wine;
}

export async function updateWineApi(id: string, submission: WineSubmission): Promise<Wine> {
  const { wine } = await api<{ wine: Wine }>(`/api/wines/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: submission,
  });
  return wine;
}
