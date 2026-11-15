import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { dayLabel, placeName } from '../lib/format';
import { linear } from '../lib/scale';
import { gridStep, skyRange, type SkyZoom } from '../lib/skyRange';
import { indexAt } from '../lib/time';
import { activeScenario, useStore } from '../store';
import { StageSkeleton } from './Skeleton';

const PL = 40, PB = 26, PT = 8;
const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
const MIN_H = 280, MAX_H = 520, BELOW = 200; // BELOW: legend + caption + time bar under the chart

function track(az: number[], el: number[], x: (v: number) => number, y: (v: number) => number): string {
  let d = '';
  for (let i = 0; i < az.length; i++) {
    const cmd = i === 0 || Math.abs(az[i] - az[i - 1]) > 180 ? 'M' : 'L';
    d += `${cmd}${x(az[i]).toFixed(1)},${y(el[i]).toFixed(1)}`;
  }
  return d;
}

/** Width from the element, height from the space left above the pinned time bar. */
function useWindowSize(scenarioCount: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1000, h: 380 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      const h = Math.round(Math.min(MAX_H, Math.max(MIN_H, window.innerHeight - top - BELOW)));
      setSize({ w: Math.round(el.clientWidth), h });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [scenarioCount]);
  return { ref, ...size };
}

function sunWords(el: number, frac: number): string {
  const up = `${Math.abs(el).toFixed(1)}°`;
  if (el < 0 && frac <= 0) return `the Sun is ${up} below the level horizon`;
  if (frac <= 0) return `the Sun is ${up} up but hidden behind the terrain`;
  if (frac < 0.995) return `the Sun is ${up} up and partly visible (${Math.round(frac * 100)}% of its disk)`;
  return `the Sun is ${up} ${el < 0 ? 'below the level horizon but' : 'up and'} fully visible`;
}

function earthWords(el: number, vis: boolean): string {
  const up = `${Math.abs(el).toFixed(1)}°`;
  if (vis) return `Earth is ${up} ${el < 0 ? 'below the level horizon but in view' : 'up and in view'}.`;
  if (el < 0) return `Earth is ${up} below the level horizon.`;
  return `Earth is ${up} up but hidden behind the terrain.`;
}

export function HorizonPanorama() {
  const sc = useStore(activeScenario);
  const count = useStore((s) => s.scenarios.length);
  const offsetMs = useStore((s) => s.offsetMs);
  const [zoom, setZoom] = useState<SkyZoom>('fit');
  const clipId = useId();
  const glowId = useId();
  const { ref, w: W, h: H } = useWindowSize(count);
  const S = sc?.result?.samples;
  const horizon = sc?.result?.horizon;
  const lat = sc?.lat;

  // Re-measure once results arrive (the stage skeleton has a different height).
  const ready = !!S;
  useEffect(() => { window.dispatchEvent(new Event('resize')); }, [ready]);

  const geo = useMemo(() => {
    if (!S || !horizon || lat === undefined) return null;
    const polar = lat <= -75 || lat >= 75;
    const [y0, y1] = skyRange(zoom, polar, horizon.el, S.sun_el, S.earth_el);
    const x = linear(0, 360, PL, W);
    const y = linear(y0, y1, H - PB, PT);
    const clampY = (v: number) => y(Math.max(y0, Math.min(y1, v)));
    const sky = horizon.az.map((a, k) => `L${x(a).toFixed(1)},${clampY(horizon.el[k]).toFixed(1)}`).join(' ')
      + ` L${x(360)},${clampY(horizon.el[0]).toFixed(1)}`;
    const terrain = `M${x(0)},${H - PB} ${sky} L${x(360)},${H - PB} Z`;
    const skyline = `M${x(0)},${clampY(horizon.el[0]).toFixed(1)} ${sky}`;
    const step = gridStep(y0, y1);
    const grid: number[] = [];
    for (let e = Math.ceil(y0 / step) * step; e <= y1; e += step) grid.push(e);
    return { x, y, terrain, skyline, grid, sunPath: track(S.sun_az, S.sun_el, x, y), earthPath: track(S.earth_az, S.earth_el, x, y) };
  }, [S, horizon, lat, zoom, W, H]);

  const heading = sc ? (
    <h2>
      <span className="tag" style={{ '--c': sc.color } as CSSProperties}>{sc.tag}</span>Sky from {placeName(sc.label)}
      <span className="spacer" />
      <label className="sky-zoom"><span className="sr-only">Sky range</span>
        <select value={zoom} onChange={(e) => setZoom(e.target.value as SkyZoom)}>
          <option value="fit">Fit</option><option value="horizon">Near the horizon</option><option value="full">Whole sky</option>
        </select>
      </label>
    </h2>
  ) : <h2>Sky view</h2>;

  if (!sc?.result || !geo || !S) {
    return (
      <section className="panel">{heading}
        <div ref={ref}>
          {sc && !sc.error ? <StageSkeleton label="Working out the sky for this site." />
            : <p className="muted">{sc?.error ? 'The sky for this site could not be worked out.' : 'Pick a site to see its sky.'}</p>}
        </div>
      </section>
    );
  }

  const r = sc.result;
  const i = indexAt(S.t, S.t[0] + offsetMs);
  const { x, y, terrain, skyline, grid, sunPath, earthPath } = geo;
  const sunVis = S.sun_frac[i] > 0;
  const earthVis = !!S.earth_vis[i];
  const sx = x(S.sun_az[i]), sy = y(S.sun_el[i]);
  const ex = x(S.earth_az[i]), ey = y(S.earth_el[i]);
  const flip = (px: number) => px > W - 170;

  return (
    <section className="panel">
      {heading}
      <div className="sky-window pano" ref={ref} style={{ height: H }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
             aria-label={`Skyline all around ${placeName(sc.label)}, with the paths of the Sun and Earth`}>
          <defs>
            <clipPath id={clipId}><rect x={PL} y={0} width={W - PL} height={H - PB} /></clipPath>
            <radialGradient id={glowId}>
              <stop offset="0" stopColor="var(--sun)" stopOpacity="0.75" />
              <stop offset="0.35" stopColor="var(--sun)" stopOpacity="0.28" />
              <stop offset="1" stopColor="var(--sun)" stopOpacity="0" />
            </radialGradient>
          </defs>
          {grid.map((e) => (
            <g key={e}>
              <line x1={PL} x2={W} y1={y(e)} y2={y(e)} className={e === 0 ? 'grid zero' : 'grid'} />
              <text x={PL - 6} y={Math.max(14, y(e) + 4)} textAnchor="end" className="axis">{e}°</text>
            </g>
          ))}
          <g clipPath={`url(#${clipId})`}>
            <path d={sunPath} className="path sun" />
            <path d={earthPath} className="path earth" />
          </g>
          <path d={terrain} className="terrain" />
          <path d={skyline} className="skyline" />
          <g clipPath={`url(#${clipId})`}>
            <g className={`body earth ${earthVis ? '' : 'hidden'}`}>
              <circle cx={ex} cy={ey} r={15} className="halo" />
              <circle cx={ex} cy={ey} r={9} className="dot" />
              <text x={flip(ex) ? ex - 16 : ex + 16} y={ey + 4} textAnchor={flip(ex) ? 'end' : 'start'} className="label">
                Earth{earthVis ? '' : ' (behind terrain)'}
              </text>
            </g>
            <g className={`body sun ${sunVis ? '' : 'hidden'}`}>
              {sunVis && <circle cx={sx} cy={sy} r={34} fill={`url(#${glowId})`} className="glow" />}
              <circle cx={sx} cy={sy} r={9} className="dot" />
              <text x={flip(sx) ? sx - 20 : sx + 20} y={sy - 8} textAnchor={flip(sx) ? 'end' : 'start'} className="label">
                Sun{sunVis ? '' : ' (hidden)'}
              </text>
            </g>
          </g>
          {DIRS.map((d, k) => <text key={k} x={x(k * 45)} y={H - 8} textAnchor={k === 0 ? 'start' : k === 8 ? 'end' : 'middle'} className="compass">{d}</text>)}
        </svg>
      </div>
      <ul className="sky-legend" aria-label="Legend">
        <li><span className="key dot sun" />Sun now</li>
        <li><span className="key dot earth" />Earth now</li>
        <li><span className="key line" />Their paths over the whole period</li>
        <li><span className="key terrain" />Terrain</li>
      </ul>
      <p className="sky-caption num">
        At {dayLabel(offsetMs)}, {sunWords(S.sun_el[i], S.sun_frac[i])}. {earthWords(S.earth_el[i], earthVis)}
      </p>
      <p className="sky-source">
        Power from a 1 m² panel right now: <span className="num">{S.power_w[i].toFixed(0)} W</span>. Terrain from {r.terrain_source}.
      </p>
    </section>
  );
}
