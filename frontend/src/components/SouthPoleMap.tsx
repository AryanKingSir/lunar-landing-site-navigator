import { useEffect, useState, type MouseEvent } from 'react';
import { latLonToXY, xyToLatLon } from '../lib/projection';
import { loadTerrainMeta, type TerrainMeta } from '../lib/terrain';
import { useStore } from '../store';

type Props = { onPick: (lat: number, lon: number) => void; picked: [number, number] | null };

export function SouthPoleMap({ onPick, picked }: Props) {
  const sites = useStore((s) => s.sites);
  const [meta, setMeta] = useState<TerrainMeta | null>(null);
  useEffect(() => {
    let alive = true;
    loadTerrainMeta()
      .then((m) => { if (alive) setMeta(m); })
      .catch((e) => console.error('Failed to load terrain meta', e));
    return () => { alive = false; };
  }, []);
  if (!meta) return null;
  const E = meta.extent_m;
  const toUV = (lat: number, lon: number) => {
    const [x, y] = latLonToXY(lat, lon);
    return [(x + E / 2) / E, (E / 2 - y) / E];
  };
  const click = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const u = (e.clientX - r.left) / r.width;
    const v = (e.clientY - r.top) / r.height;
    const [lat, lon] = xyToLatLon(u * E - E / 2, E / 2 - v * E);
    onPick(Number(lat.toFixed(4)), Number(lon.toFixed(3)));
  };
  return (
    <div className="map" onClick={click} title="Click to pick custom coordinates (LOLA terrain)">
      <img src="/terrain/hillshade.png" alt="LOLA shaded relief of the lunar south pole" />
      <svg viewBox="0 0 1 1" preserveAspectRatio="none">
        {sites.filter((s) => s.lat <= -80).map((s) => {
          const [u, v] = toUV(s.lat, s.lon);
          return <circle key={s.id} cx={u} cy={v} r={0.008} fill="var(--sun)" stroke="#000" strokeWidth={0.002}><title>{s.name}</title></circle>;
        })}
        {picked && (() => { const [u, v] = toUV(...picked); return <circle cx={u} cy={v} r={0.012} fill="none" stroke="var(--earth)" strokeWidth={0.004} />; })()}
      </svg>
    </div>
  );
}
