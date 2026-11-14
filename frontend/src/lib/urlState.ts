import type { Site } from '../types';

export type View = 'sky' | 'terrain' | 'timeline' | 'numbers';
export type SharedScenario = { siteId: string | null; lat: number; lon: number; start: string; days: number };
export type SharedState = { scenarios: SharedScenario[]; offsetMs: number; view: View; active: number };

const VIEWS: View[] = ['sky', 'terrain', 'timeline', 'numbers'];
const MAX_SCENARIOS = 4;
const HOUR_MS = 3_600_000;

export function encodeState(s: SharedState): string {
  const items = s.scenarios.map((sc) => {
    const who = sc.siteId ?? `c_${sc.lat}_${sc.lon}`;
    return `${who}@${sc.start.replace(/:00Z$/, '')}~${sc.days}`;
  });
  const p = new URLSearchParams();
  p.set('s', items.join(';'));
  p.set('t', (s.offsetMs / HOUR_MS).toFixed(2));
  p.set('v', s.view);
  p.set('a', String(s.active));
  return p.toString();
}

export function decodeState(search: string, sites: Site[]): SharedState | null {
  const p = new URLSearchParams(search);
  const raw = p.get('s');
  if (!raw) return null;
  const scenarios: SharedScenario[] = [];
  for (const item of raw.split(';').slice(0, MAX_SCENARIOS)) {
    const m = /^(.+)@(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})~(\d+(?:\.\d+)?)$/.exec(item);
    if (!m) continue;
    const ms = Date.parse(`${m[2]}:00Z`);
    if (Number.isNaN(ms)) continue;
    const days = Math.min(60, Math.max(1, Math.round(Number(m[3]))));
    const start = `${m[2]}:00Z`;
    const c = /^c_(-?\d+(?:\.\d+)?)_(-?\d+(?:\.\d+)?)$/.exec(m[1]);
    if (c) {
      scenarios.push({ siteId: null, lat: Number(c[1]), lon: Number(c[2]), start, days });
      continue;
    }
    const site = sites.find((x) => x.id === m[1]);
    if (site) scenarios.push({ siteId: site.id, lat: site.lat, lon: site.lon, start, days });
  }
  if (scenarios.length === 0) return null;
  const v = p.get('v') as View | null;
  const a = Number(p.get('a'));
  const t = Number(p.get('t'));
  return {
    scenarios,
    offsetMs: Number.isFinite(t) && t > 0 ? Math.round(t * HOUR_MS) : 0,
    view: v && VIEWS.includes(v) ? v : 'sky',
    active: Number.isInteger(a) && a >= 0 && a < scenarios.length ? a : 0,
  };
}
