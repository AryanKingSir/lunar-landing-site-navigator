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
});
