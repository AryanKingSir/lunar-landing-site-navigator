/**
 * Zoom and pan of a square map in unit coordinates (0..1 across the full map).
 * `x`, `y` are the map coordinates of the top-left corner of what is visible; the visible width is 1 / zoom.
 */
export type MapView = { zoom: number; x: number; y: number };

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;
export const HOME: MapView = { zoom: 1, x: 0, y: 0 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function clampView({ zoom, x, y }: MapView): MapView {
  const z = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  const max = 1 - 1 / z;
  return { zoom: z, x: clamp(x, 0, max), y: clamp(y, 0, max) };
}

/** Screen point (px inside a box of `width` x `height`) to map coordinates under the current view. */
export function screenToMap(px: number, py: number, width: number, height: number, v: MapView): [number, number] {
  return [v.x + px / width / v.zoom, v.y + py / height / v.zoom];
}

/** Change zoom while keeping map point (u, v) at the same place on screen. */
export function zoomAt(view: MapView, zoom: number, u: number, v: number): MapView {
  const z = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  const fx = (u - view.x) * view.zoom;
  const fy = (v - view.y) * view.zoom;
  return clampView({ zoom: z, x: u - fx / z, y: v - fy / z });
}

/** Drag by a fraction of the box size; the map follows the pointer. */
export function panBy(view: MapView, dxFrac: number, dyFrac: number): MapView {
  return clampView({ zoom: view.zoom, x: view.x - dxFrac / view.zoom, y: view.y - dyFrac / view.zoom });
}
