import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { HOME, MAX_ZOOM, MIN_ZOOM, panBy, screenToMap, zoomAt, type MapView } from '../lib/mapView';
import { latLonToXY, xyToLatLon } from '../lib/projection';
import { useTerrainMeta } from '../lib/terrain';
import { useStore } from '../store';

type Props = {
  picked: [number, number] | null;
  selectedId: string | null;
  onPick: (lat: number, lon: number) => void;
  onPickSite: (id: string) => void;
};

const RINGS = [-89, -88, -87, -86, -85];
const SPOKES: [number, string][] = [[0, '0°'], [90, '90°E'], [180, '180°'], [-90, '90°W']];
const DRAG_PX = 5;

type Gesture = { moved: boolean; siteId: string | null; x0: number; y0: number };

/** Shaded relief of the south pole. Wheel or pinch to zoom, drag to pan, tap to drop a pin. */
export function SouthPoleMap({ picked, selectedId, onPick, onPickSite }: Props) {
  const sites = useStore((s) => s.sites);
  const meta = useTerrainMeta();
  const [view, setView] = useState<MapView>(HOME);
  const box = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);

  // React's wheel listener is passive, so attach one that can stop the dialog scrolling.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      setView((cur) => {
        const [u, v] = screenToMap(e.clientX - r.left, e.clientY - r.top, r.width, r.height, cur);
        return zoomAt(cur, cur.zoom * Math.exp(-e.deltaY * 0.002), u, v);
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [meta]);

  if (!meta) return <div className="map-wrap"><div className="map-box map-loading" /></div>;
  const E = meta.extent_m;
  const toUV = (lat: number, lon: number): [number, number] => {
    const [x, y] = latLonToXY(lat, lon);
    return [(x + E / 2) / E, (E / 2 - y) / E];
  };
  // Screen position (in % of the box) of a map point under the current view; null when outside the box less `inset`.
  const place = (u: number, v: number, inset = -0.02): CSSProperties | null => {
    const sx = (u - view.x) * view.zoom;
    const sy = (v - view.y) * view.zoom;
    if (sx < inset || sx > 1 - inset || sy < inset || sy > 1 - inset) return null;
    return { left: `${sx * 100}%`, top: `${sy * 100}%` };
  };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      const pin = (e.target as Element).closest('[data-site]');
      gesture.current = { moved: false, siteId: pin?.getAttribute('data-site') ?? null, x0: e.clientX, y0: e.clientY };
    } else if (gesture.current) {
      gesture.current.moved = true; // a second finger means pinch, never a tap
    }
  };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId);
    const g = gesture.current;
    if (!prev || !g) return;
    const r = e.currentTarget.getBoundingClientRect();
    const others = [...pointers.current.entries()].filter(([id]) => id !== e.pointerId).map(([, p]) => p);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (others.length === 0) {
      if (!g.moved && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < DRAG_PX) return;
      g.moved = true;
      const dx = (e.clientX - prev.x) / r.width;
      const dy = (e.clientY - prev.y) / r.height;
      setView((cur) => panBy(cur, dx, dy));
      return;
    }
    // Pinch: scale by the change in finger distance about the midpoint, and follow the midpoint.
    const o = others[0];
    const d0 = Math.hypot(prev.x - o.x, prev.y - o.y);
    const d1 = Math.hypot(e.clientX - o.x, e.clientY - o.y);
    if (d0 < 1) return;
    const m0 = [(prev.x + o.x) / 2 - r.left, (prev.y + o.y) / 2 - r.top];
    const m1 = [(e.clientX + o.x) / 2 - r.left, (e.clientY + o.y) / 2 - r.top];
    setView((cur) => {
      const [u, v] = screenToMap(m0[0], m0[1], r.width, r.height, cur);
      return panBy(zoomAt(cur, cur.zoom * (d1 / d0), u, v), (m1[0] - m0[0]) / r.width, (m1[1] - m0[1]) / r.height);
    });
  };

  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(e.pointerId)) return;
    const g = gesture.current;
    if (pointers.current.size > 0) return;
    gesture.current = null;
    if (!g || g.moved) return;
    if (g.siteId) { onPickSite(g.siteId); return; }
    const r = e.currentTarget.getBoundingClientRect();
    const [u, v] = screenToMap(e.clientX - r.left, e.clientY - r.top, r.width, r.height, view);
    const [lat, lon] = xyToLatLon(u * E - E / 2, E / 2 - v * E);
    onPick(Number(lat.toFixed(4)), Number(lon.toFixed(3)));
  };

  const cancel = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) gesture.current = null;
  };

  const zoomBy = (f: number) => setView((cur) => zoomAt(cur, cur.zoom * f, cur.x + 0.5 / cur.zoom, cur.y + 0.5 / cur.zoom));
  const centre = toUV(-90, 0);
  const pickedAt = picked ? place(...toUV(...picked)) : null;

  return (
    <div className="map-wrap">
      <div ref={box} className="map-box" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}
           role="img" aria-label="Shaded relief map of the lunar south pole. Tap to drop a pin; the site list offers the same places by keyboard.">
        <img src="/terrain/hillshade.png" alt="" draggable={false}
             style={{ width: `${view.zoom * 100}%`, transform: `translate(${-view.x * 100}%, ${-view.y * 100}%)` }} />
        <svg viewBox={`${view.x} ${view.y} ${1 / view.zoom} ${1 / view.zoom}`} preserveAspectRatio="none" aria-hidden="true">
          {RINGS.map((lat) => (
            <circle key={lat} cx={centre[0]} cy={centre[1]} r={Math.hypot(...latLonToXY(lat, 0)) / E}
                    className="graticule" vectorEffect="non-scaling-stroke" />
          ))}
          {SPOKES.map(([lon]) => {
            const [u, v] = toUV(-84.2, lon);
            return <line key={lon} x1={centre[0]} y1={centre[1]} x2={u} y2={v} className="graticule" vectorEffect="non-scaling-stroke" />;
          })}
        </svg>
        {RINGS.map((lat) => {
          // Skip rings drawn too small to label without crowding the pole.
          if ((Math.hypot(...latLonToXY(lat, 0)) / E) * view.zoom < 0.12) return null;
          const [u, v] = toUV(lat, 135);
          const at = place(u, v, 0.05);
          return at && <span key={lat} className="map-label" style={at}>{-lat}°S</span>;
        })}
        {SPOKES.map(([lon, text]) => {
          const [u, v] = toUV(-84.75, lon);
          const at = place(u, v, 0.03);
          return at && <span key={lon} className="map-label spoke" style={at}>{text}</span>;
        })}
        {sites.filter((s) => s.category === 'south-pole').map((s) => {
          const at = place(...toUV(s.lat, s.lon));
          return at && (
            <span key={s.id} data-site={s.id} className={`pin ${s.id === selectedId ? 'selected' : ''}`} style={at} title={s.name}>
              <span className="pin-dot" />
            </span>
          );
        })}
        {pickedAt && <span className="picked" style={pickedAt} aria-hidden="true" />}
      </div>
      <div className="map-tools">
        <button type="button" aria-label="Zoom in" onClick={() => zoomBy(2)} disabled={view.zoom >= MAX_ZOOM}>+</button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomBy(0.5)} disabled={view.zoom <= MIN_ZOOM}>−</button>
        <button type="button" onClick={() => setView(HOME)} disabled={view.zoom === 1}>Reset</button>
      </div>
      <p className="map-hint">Scroll or pinch to zoom, drag to pan, tap to drop a pin.</p>
    </div>
  );
}
