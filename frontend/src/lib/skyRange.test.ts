import { describe, expect, it } from 'vitest';
import { gridStep, skyRange } from './skyRange';

describe('skyRange', () => {
  it('frames a polar ridge tightly around the low Sun and Earth paths', () => {
    const [lo, hi] = skyRange('fit', true, [-2.4, 1.3, 0.2], [0.7, 2.0], [-6, 6.3]);
    expect(lo).toBe(-6);
    expect(hi).toBe(8);
    expect(hi).toBeGreaterThan(6.3);
  });
  it('keeps a high crater wall inside the frame', () => {
    const [lo, hi] = skyRange('fit', true, [18, 23.6, 20], [0.5, 1.7], [-3, 2]);
    expect(lo).toBe(-4);
    expect(hi).toBe(25);
  });
  it('shows the whole sky away from the poles and when asked', () => {
    expect(skyRange('fit', false, [-0.1], [80], [70])).toEqual([-5, 90]);
    expect(skyRange('full', true, [0], [1], [1])).toEqual([-5, 90]);
    expect(skyRange('horizon', false, [0], [80], [70])).toEqual([-3, 12]);
  });
  it('never cuts off a track inside the plot', () => {
    const [, hi] = skyRange('fit', true, [0], [11.2], [3]);
    expect(hi).toBeGreaterThanOrEqual(12);
  });
});

describe('gridStep', () => {
  it('gives a handful of lines', () => {
    expect(gridStep(-4, 8)).toBe(2);
    expect(gridStep(-5, 90)).toBe(15);
    expect(gridStep(-6, 25)).toBe(5);
  });
});
