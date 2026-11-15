/** Vertical range (degrees) for the sky view. */
export type SkyZoom = 'fit' | 'horizon' | 'full';

function maxOf(a: number[]): number {
  let m = -Infinity;
  for (const v of a) if (v > m) m = v;
  return m;
}
function minOf(a: number[]): number {
  let m = Infinity;
  for (const v of a) if (v < m) m = v;
  return m;
}

/**
 * 'fit' frames the terrain and the Sun/Earth paths: from just below the lowest of skyline, paths and the
 * level horizon (never below -6°) to just above the highest of terrain, Sun and Earth (at least 8°, at most 90°).
 * Non-polar sites, where the Sun climbs high, get the whole sky.
 */
export function skyRange(zoom: SkyZoom, polar: boolean, mask: number[], sunEl: number[], earthEl: number[]): [number, number] {
  if (zoom === 'full') return [-5, 90];
  if (zoom === 'horizon') return [-3, 12];
  if (!polar) return [-5, 90];
  const low = Math.min(minOf(mask), minOf(sunEl), minOf(earthEl), 0);
  const lo = Math.max(-6, Math.floor(low - 1));
  const top = Math.max(maxOf(mask), maxOf(sunEl), maxOf(earthEl));
  const hi = Math.min(90, Math.max(8, Math.ceil(top + 1)));
  return [lo, hi];
}

/** Grid step giving roughly 5–8 lines over the range. */
export function gridStep(lo: number, hi: number): number {
  const span = hi - lo;
  for (const s of [1, 2, 5, 10, 15, 30]) if (span / s <= 8) return s;
  return 30;
}
