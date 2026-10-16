// "just now", "5 min ago", "3 h ago", "yesterday", then a date.
export function timeAgo(iso: string, now = Date.now()): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return '';
  const minutes = Math.round((now - then) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  if (hours < 48) return 'yesterday';
  return new Date(then).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? isoDate
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// The big title and the line under it for a wine. Supermarket labels often
// lead with a brand ("Navigator") over the grape, and older label scans
// stored the grape as the name and the brand as the producer. When the name
// is just the grape, the brand is the title and the grape goes underneath.
export function wineTitle(wine: { name: string; producer?: string; grape?: string }): { title: string; subtitle: string } {
  const name = wine.name?.trim() ?? '';
  const producer = wine.producer?.trim() ?? '';
  const grape = wine.grape?.trim() ?? '';
  if (producer && grape && name.toLowerCase() === grape.toLowerCase()) {
    return { title: producer, subtitle: name };
  }
  return { title: name || producer, subtitle: name ? producer : '' };
}
