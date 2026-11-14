import { useState } from 'react';
import { DEFAULT_START, MAX_SCENARIOS, useStore } from '../store';
import { validateNewScenario } from '../lib/validate';
import { SouthPoleMap } from './SouthPoleMap';

export function AddScenario() {
  const sites = useStore((s) => s.sites);
  const scenarioCount = useStore((s) => s.scenarios.length);
  const addScenario = useStore((s) => s.addScenario);
  const [siteId, setSiteId] = useState('connecting-ridge');
  const [lat, setLat] = useState('-89');
  const [lon, setLon] = useState('0');
  const [date, setDate] = useState(DEFAULT_START.slice(0, 10));
  const [time, setTime] = useState('00:00');
  const [days, setDays] = useState('30');
  const full = scenarioCount >= MAX_SCENARIOS;
  const site = sites.find((s) => s.id === siteId);

  const useLat = site ? site.lat : lat.trim() === '' ? NaN : Number(lat);
  const useLon = site ? site.lon : lon.trim() === '' ? NaN : Number(lon);
  const useDays = days.trim() === '' ? NaN : Number(days);
  const invalid = validateNewScenario({ date, time, lat: useLat, lon: useLon, days: useDays });

  const add = () => {
    if (invalid) return;
    addScenario({
      label: site ? site.name : `Custom ${useLat.toFixed(3)}°, ${useLon.toFixed(3)}°`,
      siteId: site?.id ?? null, lat: useLat, lon: useLon, start: `${date}T${time}:00Z`, days: useDays,
    });
  };

  return (
    <section className="panel">
      <h2>Add scenario</h2>
      <div className="form">
        <label>Site
          <select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            <optgroup label="South pole (LOLA terrain)">
              {sites.filter((s) => s.category === 'south-pole').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </optgroup>
            <optgroup label="Elsewhere (smooth horizon)">
              {sites.filter((s) => s.category === 'contrast').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </optgroup>
            <option value="custom">Custom coordinates…</option>
          </select>
        </label>
        {site && <span className="muted" style={{ fontSize: 12 }}>{site.mission}. {site.description}</span>}
        {!site && (
          <div className="row">
            <label>Lat (°)<input type="number" step="0.001" value={lat} onChange={(e) => setLat(e.target.value)} /></label>
            <label>Lon (°E)<input type="number" step="0.001" value={lon} onChange={(e) => setLon(e.target.value)} /></label>
          </div>
        )}
        <SouthPoleMap picked={Number.isFinite(useLat) && Number.isFinite(useLon) ? [useLat, useLon] : null}
                      onPick={(la, lo) => { setSiteId('custom'); setLat(String(la)); setLon(String(lo)); }} />
        <div className="row">
          <label>Start date (UTC)<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label>Time<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
          <label>Days<input type="number" min={1} max={60} value={days} onChange={(e) => setDays(e.target.value)} /></label>
        </div>
        {invalid && <div className="error">{invalid}</div>}
        <button className="primary" disabled={full || !!invalid || sites.length === 0} onClick={add}>{full ? `Max ${MAX_SCENARIOS} scenarios` : 'Add scenario'}</button>
      </div>
    </section>
  );
}
