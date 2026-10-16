'use client';

import { Wine } from './types';
import { ReviewInput, SharedWineFields } from './wine-logic';

// fetch wrapper for the app's JSON API. Throws with the server's message on
// failure; a 401 (signed out, or the session expired) goes to the sign-in page.
export async function api<T = Record<string, unknown>>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init?.method ?? 'GET',
      headers: init?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new Error("Couldn't reach the server. Check your connection.");
  }
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Please sign in again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || `Server returned ${res.status}`);
  return data as T;
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
