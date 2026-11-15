const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

export function dayLabel(rawOffsetMs: number): string {
  const offsetMs = Math.max(0, rawOffsetMs);
  const day = Math.floor(offsetMs / DAY_MS);
  const h = Math.floor((offsetMs - day * DAY_MS) / HOUR_MS);
  const m = Math.floor((offsetMs % HOUR_MS) / 60_000);
  return `Day ${day}, ${pad(h)}:${pad(m)}`;
}

export function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function pct(v: number): string {
  if (v > 0 && v < 1) return '<1%';
  if (v > 99 && v < 100) return '>99%';
  return `${Math.round(v)}%`;
}

/** "13 Dec 2026, 14:05 UTC" for an epoch time in ms. */
export function utcLabel(ms: number): string {
  const d = new Date(ms);
  return `${dateLabel(d.toISOString())}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

/** The place a scenario is at, without the bracketed detail: "Connecting Ridge (Shackleton–de Gerlache)" -> "Connecting Ridge". */
export function placeName(label: string): string {
  return label.split(' (')[0];
}

const coord = (v: number) => String(Number(v.toFixed(4)));
/** Label of a spot picked by coordinates: "Custom -87.5°, 45°". */
export function customLabel(lat: number, lon: number): string {
  return `Custom ${coord(lat)}°, ${coord(lon)}°`;
}
