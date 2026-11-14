import type { ScenarioResult } from '../types';

const DAY_MS = 86_400_000;

export type Summary = { sunPct: number; earthPct: number; linkPct: number; sentence: string };

function sunSentence(pct: number, darkH: number): string {
  if (pct >= 99.5) return 'Sunlit the whole time.';
  if (pct <= 0.5) return 'No sunlight at all.';
  const part =
    pct < 12.5 ? 'a small part of the time'
    : pct <= 37.5 ? 'a quarter of the time'
    : pct <= 62.5 ? 'half the time'
    : pct <= 87.5 ? 'three quarters of the time'
    : 'most of the time';
  const night = darkH >= 48 ? `${Math.round(darkH / 24)} days` : `${Math.round(darkH)} hours`;
  return `Sunlit about ${part}, with a longest night of ${night}.`;
}

function earthSentence(pct: number, first: [number, number] | undefined, rangeStart: number): string {
  if (pct >= 99.5) return 'Earth is in view the whole time.';
  if (pct <= 0.5 || !first) return 'Earth never comes into view.';
  const [s, e] = first;
  if (s <= rangeStart) return `Earth is in view for the first ${Math.round((e - s) / DAY_MS)} days.`;
  return `Earth comes into view on day ${Math.floor((s - rangeStart) / DAY_MS)} and stays for ${Math.round((e - s) / DAY_MS)} days.`;
}

export function summarize(result: ScenarioResult, _days: number): Summary {
  const m = result.metrics;
  const rangeStart = result.samples.t[0] ?? 0;
  const sentence = `${sunSentence(m.sun_time_pct, m.longest_dark_h)} ${earthSentence(m.earth_vis_pct, result.windows.earth[0], rangeStart)}`;
  return { sunPct: m.sun_time_pct, earthPct: m.earth_vis_pct, linkPct: m.dte_pct, sentence };
}

