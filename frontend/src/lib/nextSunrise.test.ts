import { describe, expect, it } from 'vitest';
import { nextSunrise } from './nextSunrise';

describe('nextSunrise', () => {
  it('skips a window already open at the start and returns the next one', () => {
    expect(nextSunrise([[0, 50], [80, 120]], 0)).toBe(80);
    expect(nextSunrise([[-10, 50], [80, 120]], 20)).toBe(80);
  });
  it('returns the first window start when the Sun is down at the start', () => {
    expect(nextSunrise([[30, 50], [80, 120]], 0)).toBe(30);
  });
  it('returns null for a single window from the start', () => {
    expect(nextSunrise([[0, 120]], 0)).toBeNull();
  });
  it('returns null with no windows', () => {
    expect(nextSunrise([], 0)).toBeNull();
  });
});
