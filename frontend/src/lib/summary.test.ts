import { describe, expect, it } from 'vitest';
import { summarize } from './summary';
import type { ScenarioResult } from '../types';

const D = 86_400_000;
const mk = (m: Partial<ScenarioResult['metrics']>, w: Partial<ScenarioResult['windows']>): ScenarioResult => ({
  terrain_source: 'x', terrain_partial: false, site_height_m: 0, horizon: { az: [], el: [] },
  samples: { t: [0, D], sun_az: [], sun_el: [], sun_frac: [], earth_az: [], earth_el: [], earth_frac: [], earth_vis: [],
    dsn_goldstone: [], dsn_madrid: [], dsn_canberra: [], dte: [], power_w: [], sun_vec: [], earth_vec: [] },
  windows: { sun: [], earth: [], dte: [], ...w },
  metrics: { illumination_pct: 0, sun_time_pct: 0, longest_dark_h: 0, earth_vis_pct: 0, dte_pct: 0, mean_power_w: 0,
    energy_wh: 0, max_sun_el: 0, min_sun_el: 0, ...m },
});

describe('summarize', () => {
  it('always sunlit, Earth rises later', () => {
    const s = summarize(mk({ sun_time_pct: 100, earth_vis_pct: 46, dte_pct: 45.9 },
      { sun: [[0, 30 * D]], earth: [[12.7 * D, 26.5 * D]] }), 30);
    expect(s).toMatchObject({ sunPct: 100, earthPct: 46, linkPct: 45.9 });
    expect(s.sentence).toBe('Sunlit the whole time. Earth comes into view on day 12 and stays for 14 days.');
  });
  it('never sunlit, never sees Earth', () => {
    expect(summarize(mk({}, {}), 30).sentence).toBe('No sunlight at all. Earth never comes into view.');
  });
  it('day and night, Earth always in view', () => {
    const s = summarize(mk({ sun_time_pct: 49.6, earth_vis_pct: 100, longest_dark_h: 327.6 },
      { sun: [[13.65 * D, 28.53 * D]], earth: [[0, 30 * D]] }), 30);
    expect(s.sentence).toBe('Sunlit about half the time, with a longest night of 14 days. Earth is in view the whole time.');
  });
  const H = 3_600_000;
  const sent = (m: Parameters<typeof mk>[0], w: Parameters<typeof mk>[1] = {}) => summarize(mk(m, w), 30).sentence;
  it('small sunlight share with a long night', () => {
    expect(sent({ sun_time_pct: 5, longest_dark_h: 600 })).toMatch(/^Sunlit only a small part of the time, with a longest night of 25 days\./);
  });
  it('sunlight wording bands', () => {
    expect(sent({ sun_time_pct: 30, longest_dark_h: 100 })).toContain('about a quarter');
    expect(sent({ sun_time_pct: 75, longest_dark_h: 100 })).toContain('about three quarters');
    expect(sent({ sun_time_pct: 95, longest_dark_h: 100 })).toMatch(/^Sunlit most of the time/);
  });
  it('durations are grammatical (halves round up: 60 h = 2.5 days -> 3 days)', () => {
    expect(sent({ sun_time_pct: 50, longest_dark_h: 30 })).toContain('a longest night of 30 hours');
    expect(sent({ sun_time_pct: 50, longest_dark_h: 1 })).toContain('a longest night of 1 hour.');
    expect(sent({ sun_time_pct: 50, longest_dark_h: 0.3 })).toContain('a longest night of less than an hour');
    expect(sent({ sun_time_pct: 50, longest_dark_h: 60 })).toContain('a longest night of 3 days');
  });
  it('Earth in view from the start', () => {
    expect(sent({ earth_vis_pct: 33 }, { earth: [[0, 10 * D]] })).toContain('Earth is in view for the first 10 days.');
  });
  it('Earth rises later, singular day and hours', () => {
    expect(sent({ earth_vis_pct: 4 }, { earth: [[5 * D, 6 * D]] })).toContain('Earth comes into view on day 5 and stays for 1 day.');
    expect(sent({ earth_vis_pct: 1 }, { earth: [[5 * D, 5 * D + 6 * H]] })).toContain('on day 5 and stays for 6 hours.');
  });
  it('Earth with no windows uses the percentage', () => {
    expect(sent({ earth_vis_pct: 40 }, { earth: [] })).toBe('No sunlight at all. Earth is in view about 40% of the time.');
  });
  it('mentions that Earth comes back', () => {
    const s = sent({ earth_vis_pct: 50 }, { earth: [[0, 5 * D], [10 * D, 12 * D]] });
    expect(s.endsWith('Earth is in view for the first 5 days. It comes back later.')).toBe(true);
  });
  it('words short and single-unit opening windows naturally', () => {
    const H = 3_600_000;
    expect(sent({ earth_vis_pct: 1 }, { earth: [[0, 0.5 * H]] })).toContain('Earth is in view for less than an hour at the start.');
    expect(sent({ earth_vis_pct: 1 }, { earth: [[0, H]] })).toContain('Earth is in view for the first hour.');
    expect(sent({ earth_vis_pct: 4 }, { earth: [[0, D]] })).toContain('Earth is in view for the first day.');
  });
  it('never produces ungrammatical or broken text over a grid', () => {
    const bad = /\b0 (days|hours)\b|\b1 (days|hours)\b|first (less|1 )|NaN|undefined/;
    for (const sun of [0, 0.4, 5, 30, 50, 75, 95, 99.6, 100])
      for (const dark of [0, 0.3, 1, 30, 47.6, 48, 600])
        for (const len of [0.02, 1 / 24, 0.2, 1, 1.4, 10])
          for (const start of [0, 3.5])
            for (const earth of [0.4, 20, 100]) {
              const s = sent({ sun_time_pct: sun, longest_dark_h: dark, earth_vis_pct: earth }, { earth: [[start * D, (start + len) * D]] });
              expect(s).not.toMatch(bad);
            }
  });
});
