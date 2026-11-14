import { useId, useMemo, useState } from 'react';
import { linear } from '../lib/scale';
import { indexAt } from '../lib/time';
import { activeScenario, useStore } from '../store';

const W = 1000, H = 300, PL = 40, PB = 22;
const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];

function track(az: number[], el: number[], x: (v: number) => number, y: (v: number) => number): string {
  let d = '';
  for (let i = 0; i < az.length; i++) {
    const cmd = i === 0 || Math.abs(az[i] - az[i - 1]) > 180 ? 'M' : 'L';
    d += `${cmd}${x(az[i]).toFixed(1)},${y(el[i]).toFixed(1)}`;
  }
  return d;
}

export function HorizonPanorama() {
  const sc = useStore(activeScenario);
  const offsetMs = useStore((s) => s.offsetMs);
  const explain = useStore((s) => s.explain);
  const [zoom, setZoom] = useState<'auto' | 'horizon' | 'full'>('auto');
  const clipId = useId();
  const S = sc?.result?.samples;
  const horizon = sc?.result?.horizon;
  const lat = sc?.lat;

  const geo = useMemo(() => {
    if (!S || !horizon || lat === undefined) return null;
    const polar = lat <= -75 || lat >= 75;
    const [y0, y1] = zoom === 'full' || (zoom === 'auto' && !polar) ? [-5, 90] : [-3, 12];
    const x = linear(0, 360, PL, W);
    const y = linear(y0, y1, H - PB, 0);
    const clampY = (v: number) => y(Math.max(y0, Math.min(y1, v)));
    const sky = horizon.az.map((a, k) => `L${x(a).toFixed(1)},${clampY(horizon.el[k]).toFixed(1)}`).join(' ')
      + ` L${x(360)},${clampY(horizon.el[0]).toFixed(1)}`;
    const terrain = `M${x(0)},${H - PB} ${sky} L${x(360)},${H - PB} Z`;
    const skyline = `M${x(0)},${clampY(horizon.el[0]).toFixed(1)} ${sky}`;
    const step = y1 - y0 > 30 ? 15 : 2;
    const grid: number[] = [];
    for (let e = Math.ceil(y0 / step) * step; e <= y1; e += step) grid.push(e);
    return {
      x, y, terrain, skyline, grid,
      sunPath: track(S.sun_az, S.sun_el, x, y),
      earthPath: track(S.earth_az, S.earth_el, x, y),
    };
  }, [S, horizon, lat, zoom]);

  if (!sc?.result || !geo || !S) return <section className="panel"><h2>Horizon panorama</h2><p className="muted">Select a computed scenario.</p></section>;

  const r = sc.result;
  const i = indexAt(S.t, S.t[0] + offsetMs);
  const { x, y, terrain, skyline, grid, sunPath, earthPath } = geo;

  return (
    <section className="panel">
      <h2>Horizon panorama · <span style={{ color: sc.color }}>{sc.label}</span>
        <span className="spacer" style={{ flex: 1 }} />
        <select value={zoom} onChange={(e) => setZoom(e.target.value as typeof zoom)}>
          <option value="auto">Auto zoom</option><option value="horizon">Horizon (−3…12°)</option><option value="full">Full sky (−5…90°)</option>
        </select>
      </h2>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="360 degree horizon with Sun and Earth tracks">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#05070b" /><stop offset="1" stopColor="#0c1420" /></linearGradient>
          <clipPath id={clipId}><rect x={PL} y={0} width={W - PL} height={H - PB} /></clipPath>
        </defs>
        <rect x={PL} y={0} width={W - PL} height={H - PB} fill="url(#sky)" />
        {grid.map((e) => (
          <g key={e}><line x1={PL} x2={W} y1={y(e)} y2={y(e)} stroke={e === 0 ? '#3a4658' : '#141c27'} strokeDasharray={e === 0 ? '' : '2 4'} />
            <text x={PL - 4} y={Math.max(10, y(e) + 4)} textAnchor="end">{e}°</text></g>
        ))}
        <g clipPath={`url(#${clipId})`}>
          <path d={sunPath} fill="none" stroke="var(--sun)" strokeOpacity={0.35} strokeWidth={1} />
          <path d={earthPath} fill="none" stroke="var(--earth)" strokeOpacity={0.35} strokeWidth={1} />
        </g>
        <path d={terrain} fill="#1b1f25" />
        <path d={skyline} fill="none" stroke="#8a929e" strokeWidth={1} />
        <g clipPath={`url(#${clipId})`}>
          <circle cx={x(S.earth_az[i])} cy={y(S.earth_el[i])} r={7} fill="var(--earth)" stroke="#000" />
          <circle cx={x(S.sun_az[i])} cy={y(S.sun_el[i])} r={6} fill="var(--sun)" stroke="#000" />
        </g>
        {DIRS.map((d, k) => <text key={k} x={x(k * 45)} y={H - 6} textAnchor={k === 8 ? 'end' : 'middle'}>{d}</text>)}
      </svg>
      <div className="mono muted" style={{ fontSize: 12 }}>
        <span style={{ color: 'var(--sun)' }}>Sun</span> az {S.sun_az[i].toFixed(1)}° el {S.sun_el[i].toFixed(2)}° · {(S.sun_frac[i] * 100).toFixed(0)}% of disk visible · {S.power_w[i].toFixed(0)} W
        {'  ·  '}<span style={{ color: 'var(--earth)' }}>Earth</span> az {S.earth_az[i].toFixed(1)}° el {S.earth_el[i].toFixed(2)}°
        {'  ·  '}terrain: {r.terrain_source}
      </div>
      {explain && <p className="muted" style={{ fontSize: 12 }}>
        The grey silhouette is the real skyline computed from LOLA laser altimetry, including the curvature of the Moon. Faint lines are
        the full Sun and Earth tracks over the period. At the south pole the Sun circles the whole horizon only a degree or two up, so a
        distant ridge can cast a shadow for days. Earth wobbles up and down each month because of libration.
      </p>}
    </section>
  );
}
