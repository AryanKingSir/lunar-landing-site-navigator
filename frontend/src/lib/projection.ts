// south polar stereographic, same as backend/app/terrain.py
export const R_MOON_M = 1_737_400;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export function latLonToXY(lat: number, lon: number): [number, number] {
  const r = 2 * R_MOON_M * Math.tan(rad(90 + lat) / 2);
  return [r * Math.sin(rad(lon)), r * Math.cos(rad(lon))];
}

export function xyToLatLon(x: number, y: number): [number, number] {
  const r = Math.hypot(x, y);
  return [-90 + deg(2 * Math.atan((0.5 * r) / R_MOON_M)), deg(Math.atan2(x, y))];
}

/** Moon mean-Earth frame vector -> scene frame (x = projected X, y = projected Y, z = up at south pole). */
export function toScene(v: number[]): [number, number, number] {
  return [v[1], v[0], -v[2]];
}
