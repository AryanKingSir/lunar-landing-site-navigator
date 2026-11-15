import type { Win } from '../types';

/** Start of the first Sun window that begins after `startMs`; a window already open then does not count. */
export function nextSunrise(sunWindows: Win[], startMs: number): number | null {
  for (const [s] of sunWindows) if (s > startMs) return s;
  return null;
}
