import type { ScenarioResult } from '../types';

const DAY_MS = 86_400_000;

export type Summary = { sunPct: number; earthPct: number; linkPct: number; sentence: string };

function duration(ms: number): string {
  const hours = ms / 3_600_000;
  if (hours < 1) return 'less than an hour';
  const h = Math.round(hours);
  if (h === 24) return '1 day';
  if (hours >= 48 || h >= 48) {
    const d = Math.round(hours / 24);
    return `${d} ${d === 1 ? 'day' : 'days'}`;
  }
  return `${h} ${h === 1 ? 'hour' : 'hours'}`;
}

function sunSentence(pct: number, darkH: number): string {
  if (pct >= 99.5) return 'Sunlit the whole time.';
  if (pct <= 0.5) return 'No sunlight at all.';
  const part =
    pct > 87.5 ? 'most of the time'
    : pct >= 62.5 ? 'about three quarters of the time'
    : pct >= 37.5 ? 'about half the time'
    : pct >= 12.5 ? 'about a quarter of the time'
    : 'only a small part of the time';
  return `Sunlit ${part}, with a longest night of ${duration(darkH * 3_600_000)}.`;
}

function earthSentence(pct: number, windows: [number, number][], rangeStart: number): string {
  if (pct >= 99.5) return 'Earth is in view the whole time.';
  if (pct <= 0.5) return 'Earth never comes into view.';
  const first = windows[0];
  if (!first) return `Earth is in view about ${Math.round(pct)}% of the time.`;
  const [s, e] = first;
  const d = duration(e - s);
  const atStart =
    d === 'less than an hour' ? 'Earth is in view for less than an hour at the start.'
    : d === '1 day' ? 'Earth is in view for the first day.'
    : d === '1 hour' ? 'Earth is in view for the first hour.'
    : `Earth is in view for the first ${d}.`;
  const base = s <= rangeStart
    ? atStart
    : `Earth comes into view on day ${Math.floor((s - rangeStart) / DAY_MS)} and stays for ${duration(e - s)}.`;
  return windows.length >= 2 ? `${base} It comes back later.` : base;
}

export function summarize(result: ScenarioResult, _days: number): Summary {
  const m = result.metrics;
  const rangeStart = result.samples.t[0] ?? 0;
  const sentence = `${sunSentence(m.sun_time_pct, m.longest_dark_h)} ${earthSentence(m.earth_vis_pct, result.windows.earth, rangeStart)}`;
  return { sunPct: m.sun_time_pct, earthPct: m.earth_vis_pct, linkPct: m.dte_pct, sentence };
}

