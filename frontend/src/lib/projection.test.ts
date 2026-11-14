import { describe, expect, it } from 'vitest';
import { latLonToXY, R_MOON_M, toScene, xyToLatLon } from './projection';

describe('projection', () => {
  it('pole maps to origin and 90E is +x', () => {
    expect(latLonToXY(-90, 0).map((v) => Math.abs(v) < 1e-6)).toEqual([true, true]);
    const [x, y] = latLonToXY(-89, 90);
    expect(x).toBeCloseTo(2 * R_MOON_M * Math.tan((0.5 * Math.PI) / 180), 3);
    expect(Math.abs(y)).toBeLessThan(1e-6);
  });

  it('round-trips', () => {
    const [lat, lon] = xyToLatLon(...latLonToXY(-85.3, -120.4));
    expect(lat).toBeCloseTo(-85.3, 9);
    expect(lon).toBeCloseTo(-120.4, 9);
  });

  it('toScene maps Moon ME (x,y,z) to pole frame (y,x,-z)', () => {
    expect(toScene([1, 2, 3])).toEqual([2, 1, -3]);
  });
});
