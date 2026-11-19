import { Wine } from './types';

export function normalizeWineText(s?: string): string {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokensOf(s: string): Set<string> {
  const out = new Set<string>();
  for (const tok of normalizeWineText(s).split(' ')) {
    if (tok.length >= 3) out.add(tok);
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

// Finds an existing bottle that matches a newly scanned or typed wine so
// repeat purchases don't create duplicates in the cellar.
export function findDuplicateWine(
  candidate: { name?: string; producer?: string; grape?: string },
  wines: Wine[],
  excludeId?: string
): Wine | null {
  const candName = normalizeWineText(candidate.name);
  const candProd = normalizeWineText(candidate.producer);
  const candFull = normalizeWineText([candidate.producer, candidate.name].filter(Boolean).join(' '));
  if (candName.length < 3 && candFull.length < 3) return null;

  let bestExact: Wine | null = null;
  let bestFuzzy: { wine: Wine; score: number } | null = null;
  const candTokens = tokensOf(candFull || candName);

  for (const w of wines) {
    if (excludeId && w.id === excludeId) continue;
    const wName = normalizeWineText(w.name);
    const wProd = normalizeWineText(w.producer);
    const wFull = normalizeWineText([w.producer, w.name].filter(Boolean).join(' '));

    // Highest confidence: both name and producer match (or full combined string matches).
    if (candProd && wProd && candName === wName && candProd === wProd) {
      return w;
    }
    if (candFull && wFull && candFull === wFull) {
      bestExact ??= w;
      continue;
    }
    if (candName.length >= 3 && (candName === wName || (wFull && candName === wFull) || (candFull && candFull === wName))) {
      bestExact ??= w;
      continue;
    }

    const wTokens = tokensOf(wFull || wName);
    const score = jaccard(candTokens, wTokens);
    if (score >= 0.8 && (!bestFuzzy || score > bestFuzzy.score)) {
      bestFuzzy = { wine: w, score };
    }
  }

  return bestExact ?? bestFuzzy?.wine ?? null;
}
