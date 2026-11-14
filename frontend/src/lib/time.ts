import type { Win } from '../types';

export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

export function indexAt(t: number[], time: number): number {
  if (t.length === 0) return 0;
  let lo = 0;
  let hi = t.length - 1;
  if (time <= t[lo]) return lo;
  if (time >= t[hi]) return hi;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (t[mid] <= time) lo = mid;
    else hi = mid;
  }
  return time - t[lo] <= t[hi] - time ? lo : hi;
}

export function windowStatus(windows: Win[], time: number, rangeEnd: number) {
  for (const [s, e] of windows) {
    if (time >= s && time < e) return { inWindow: true, msUntilChange: e - time, openEnded: e >= rangeEnd };
    if (s > time) return { inWindow: false, msUntilChange: s - time, openEnded: false };
  }
  return { inWindow: false, msUntilChange: null, openEnded: true };
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 60_000) return '<1m';
  const d = Math.floor(ms / DAY_MS);
  const h = Math.floor((ms % DAY_MS) / HOUR_MS);
  const m = Math.floor((ms % HOUR_MS) / 60_000);
  if (d > 0) return `${d}d ${pad(h)}h`;
  if (h > 0) return `${h}h ${pad(m)}m`;
  return `${m}m`;
}

export function addDaysIso(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * DAY_MS).toISOString().replace('.000Z', 'Z');
}
