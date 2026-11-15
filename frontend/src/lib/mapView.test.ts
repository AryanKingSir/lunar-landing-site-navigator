import { describe, expect, it } from 'vitest';
import { clampView, panBy, screenToMap, zoomAt, type MapView } from './mapView';

const close = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 9));

describe('map view maths', () => {
  it('screenToMap at zoom 1 is the plain fraction of the box', () => {
    const v: MapView = { zoom: 1, x: 0, y: 0 };
    close(screenToMap(0, 0, 400, 400, v), [0, 0]);
    close(screenToMap(200, 200, 400, 400, v), [0.5, 0.5]);
    close(screenToMap(300, 100, 400, 400, v), [0.75, 0.25]);
  });

  it('screenToMap at zoom 4 with an offset maps into the visible quarter', () => {
    const v: MapView = { zoom: 4, x: 0.5, y: 0.25 };
    close(screenToMap(0, 0, 400, 400, v), [0.5, 0.25]);
    close(screenToMap(400, 400, 400, 400, v), [0.75, 0.5]);
    close(screenToMap(200, 100, 400, 400, v), [0.625, 0.3125]);
  });

  it('zoomAt keeps the point under the cursor fixed', () => {
    const v0: MapView = { zoom: 1, x: 0, y: 0 };
    const before = screenToMap(300, 100, 400, 400, v0);
    const v1 = zoomAt(v0, 4, before[0], before[1]);
    expect(v1.zoom).toBe(4);
    close(screenToMap(300, 100, 400, 400, v1), before);
  });

  it('zoomAt about the centre twice keeps the centre', () => {
    let v: MapView = { zoom: 1, x: 0, y: 0 };
    v = zoomAt(v, 2, 0.5, 0.5);
    v = zoomAt(v, 4, 0.5, 0.5);
    expect(v).toEqual({ zoom: 4, x: 0.375, y: 0.375 });
    close(screenToMap(300, 200, 400, 400, v), [0.5625, 0.5]);
  });

  it('clamps zoom to 1..8 and keeps the view inside the map', () => {
    expect(clampView({ zoom: 20, x: 0.99, y: -1 })).toEqual({ zoom: 8, x: 0.875, y: 0 });
    expect(clampView({ zoom: 0.5, x: 0.3, y: 0.3 })).toEqual({ zoom: 1, x: 0, y: 0 });
  });

  it('panBy moves by a screen fraction scaled by zoom, opposite to the drag', () => {
    const v = panBy({ zoom: 4, x: 0.5, y: 0.5 }, 0.4, -0.2);
    close([v.x, v.y], [0.4, 0.55]);
  });
});
