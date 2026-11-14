import { describe, expect, it } from 'vitest';
import { decodeState, encodeState } from './urlState';

const sites = [{ id: 'connecting-ridge', name: 'CR', lat: -89.4667, lon: -136.667 }] as never;

describe('urlState', () => {
  it('round-trips curated and custom scenarios', () => {
    const st = { scenarios: [
      { siteId: 'connecting-ridge', lat: -89.4667, lon: -136.667, start: '2026-12-01T00:00:00Z', days: 30 },
      { siteId: null, lat: -87.5, lon: 45, start: '2027-03-15T06:00:00Z', days: 60 } ],
      offsetMs: 12.5 * 3_600_000, view: 'timeline' as const, active: 1 };
    expect(decodeState('?' + encodeState(st), sites)).toEqual(st);
  });
  it('returns null for missing or broken input', () => {
    expect(decodeState('', sites)).toBeNull();
    expect(decodeState('?s=nope@x~1', sites)).toBeNull();
  });
  it('drops unknown site ids and clamps bad values', () => {
    const d = decodeState('?s=ghost@2026-12-01T00:00~30;connecting-ridge@2026-12-01T00:00~999&v=zzz&a=9&t=-5', sites)!;
    expect(d.scenarios).toHaveLength(1); expect(d.scenarios[0].days).toBe(60);
    expect(d.view).toBe('sky'); expect(d.active).toBe(0); expect(d.offsetMs).toBe(0);
  });
});
