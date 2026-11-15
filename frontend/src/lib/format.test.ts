import { describe, expect, it } from 'vitest';
import { dateLabel, dayLabel, pct, utcLabel } from './format';

describe('format', () => {
  it('dayLabel', () => {
    expect(dayLabel(0)).toBe('Day 0, 00:00');
    expect(dayLabel(12 * 86_400_000 + 14 * 3_600_000 + 5 * 60_000)).toBe('Day 12, 14:05');
  });
  it('dayLabel clamps negative offsets', () => { expect(dayLabel(-60000)).toBe('Day 0, 00:00'); });
  it('dateLabel', () => { expect(dateLabel('2026-12-01T00:00:00Z')).toBe('1 Dec 2026'); });
  it('dateLabel of garbage is empty', () => { expect(dateLabel('garbage')).toBe(''); });
  it('utcLabel', () => {
    expect(utcLabel(Date.parse('2026-12-13T14:05:00Z'))).toBe('13 Dec 2026, 14:05 UTC');
  });
  it('pct', () => {
    expect(pct(46.02)).toBe('46%'); expect(pct(0)).toBe('0%'); expect(pct(0.4)).toBe('<1%');
    expect(pct(99.6)).toBe('>99%'); expect(pct(100)).toBe('100%');
  });
});
