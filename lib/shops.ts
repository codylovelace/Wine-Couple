// The shops offered in the "Where you bought it" dropdown, and the rules for
// treating different spellings of one shop as the same place.

export const UK_SHOPS = [
  'Aldi',
  'Asda',
  'Booths',
  'Co-op',
  'Costco',
  'Iceland',
  'Lidl',
  'M&S',
  'Majestic',
  'Morrisons',
  'Ocado',
  "Sainsbury's",
  'Tesco',
  'Waitrose',
] as const;

// Lower-cased, punctuation-free spellings people type, mapped to the name in
// the list above.
const ALIASES: Record<string, string> = {
  'marks spencer': 'M&S',
  'marks and spencer': 'M&S',
  'marks spencers': 'M&S',
  'marks and spencers': 'M&S',
  ms: 'M&S',
  'm and s': 'M&S',
  sainsburys: "Sainsbury's",
  sainsbury: "Sainsbury's",
  'majestic wine': 'Majestic',
  'majestic wines': 'Majestic',
  coop: 'Co-op',
  'co op': 'Co-op',
  'the coop': 'Co-op',
  'the co operative': 'Co-op',
  'co operative': 'Co-op',
  'asda stores': 'Asda',
  'tesco extra': 'Tesco',
  'tesco express': 'Tesco',
  'sainsburys local': "Sainsbury's",
  'little waitrose': 'Waitrose',
  'waitrose partners': 'Waitrose',
};

function squash(name: string): string {
  return name
    .toLowerCase()
    .replace(/[’'`.]/g, '')
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const BY_SQUASHED = new Map<string, string>(UK_SHOPS.map((s) => [squash(s), s]));

// The tidy name for a shop: "marks & spencer" and "M&S" both give "M&S",
// "sainsburys " gives "Sainsbury's". Shops not in the list keep their own
// spelling, trimmed.
export function canonicalShop(name: string | undefined | null): string {
  const trimmed = (name ?? '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  const key = squash(trimmed);
  return BY_SQUASHED.get(key) ?? ALIASES[key] ?? trimmed;
}

// A key for grouping and matching shops regardless of spelling.
export function shopKey(name: string | undefined | null): string {
  return squash(canonicalShop(name));
}

export function isListedShop(name: string): boolean {
  return (UK_SHOPS as readonly string[]).includes(canonicalShop(name));
}
