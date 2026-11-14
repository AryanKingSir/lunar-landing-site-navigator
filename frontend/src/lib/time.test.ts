import { describe, expect, it } from 'vitest';
import { addDaysIso, DAY_MS, formatDuration, indexAt, windowStatus } from './time';

describe('time utils', () => {
  it('indexAt finds the nearest sample and clamps', () => {
    const t = [0, 10, 20, 30];
    expect(indexAt(t, 14)).toBe(1);
    expect(indexAt(t, 16)).toBe(2);
    expect(indexAt(t, -5)).toBe(0);
    expect(indexAt(t, 99)).toBe(3);
  });

  it('windowStatus reports time to set / rise and open-ended windows', () => {
    const w: [number, number][] = [[10, 20], [40, 100]];
    expect(windowStatus(w, 15, 100)).toEqual({ inWindow: true, msUntilChange: 5, openEnded: false });
    expect(windowStatus(w, 25, 100)).toEqual({ inWindow: false, msUntilChange: 15, openEnded: false });
    expect(windowStatus(w, 50, 100)).toEqual({ inWindow: true, msUntilChange: 50, openEnded: true });
    expect(windowStatus([[10, 20]], 30, 100)).toEqual({ inWindow: false, msUntilChange: null, openEnded: true });
  });

  it('formatDuration', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(0)).toBe('<1m');
    expect(formatDuration(5 * 60_000)).toBe('5m');
    expect(formatDuration(90 * 60_000)).toBe('1h 30m');
    expect(formatDuration(2 * DAY_MS + 3 * 3_600_000 + 15 * 60_000)).toBe('2d 03h');
  });

  it('addDaysIso', () => {
    expect(addDaysIso('2026-12-01T00:00:00Z', 1.5)).toBe('2026-12-02T12:00:00Z');
  });
});
