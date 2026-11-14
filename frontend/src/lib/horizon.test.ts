import { describe, expect, it } from 'vitest';
import { maskAt } from './horizon';

describe('horizon', () => {
  it('interpolates periodically', () => {
    const el = [0, 1, 2, 3]; // 90-degree bins
    expect(maskAt(el, 45)).toBeCloseTo(0.5); expect(maskAt(el, 315)).toBeCloseTo(1.5);
    expect(maskAt(el, -45)).toBeCloseTo(1.5); expect(maskAt(el, 360)).toBeCloseTo(0);
  });
});
