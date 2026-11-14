export type NewScenarioInput = { date: string; time: string; lat: number; lon: number; days: number };

/** Returns an error message, or null when the input is valid. */
export function validateNewScenario({ date, time, lat, lon, days }: NewScenarioInput): string | null {
  if (!date || !time) return 'Enter a start date and time.';
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return 'Latitude must be between -90 and 90.';
  if (!Number.isFinite(lon) || lon < -180 || lon > 360) return 'Longitude must be between -180 and 360.';
  if (!Number.isInteger(days) || days < 1 || days > 60) return 'Days must be a whole number from 1 to 60.';
  return null;
}
