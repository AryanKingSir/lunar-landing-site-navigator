const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

export function dayLabel(offsetMs: number): string {
  const day = Math.floor(offsetMs / DAY_MS);
  const h = Math.floor((offsetMs - day * DAY_MS) / HOUR_MS);
  const m = Math.floor((offsetMs % HOUR_MS) / 60_000);
  return `Day ${day}, ${pad(h)}:${pad(m)}`;
}

export function dateLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function pct(v: number): string {
  if (v > 0 && v < 1) return '<1%';
  if (v > 99 && v < 100) return '>99%';
  return `${Math.round(v)}%`;
}
