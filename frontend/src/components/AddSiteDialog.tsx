import { useEffect, useId, useRef, useState } from 'react';
import { customLabel } from '../lib/format';
import { latLonToXY } from '../lib/projection';
import { useTerrainMeta } from '../lib/terrain';
import { addDaysIso } from '../lib/time';
import { validateNewScenario } from '../lib/validate';
import { activeScenario, DEFAULT_START, MAX_SCENARIOS, SYNODIC_DAYS, useStore } from '../store';
import type { Site } from '../types';
import { SouthPoleMap } from './SouthPoleMap';

const CUSTOM = 'custom';
const num = (v: string) => (v.trim() === '' ? NaN : Number(v));

type Props = { open: boolean; onClose: () => void };

/** Native modal dialog: the browser traps focus and closes it on Escape. */
export function AddSiteDialog({ open, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const downOnBackdrop = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // Start on the chosen site rather than the close button.
      d.querySelector<HTMLElement>('input[name=site]:checked')?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} className="add-dialog" aria-labelledby={titleId} onClose={onClose}
            onPointerDown={(e) => { downOnBackdrop.current = e.target === e.currentTarget; }}
            onClick={(e) => { if (downOnBackdrop.current && e.target === e.currentTarget) onClose(); }}>
      {open && <AddSiteForm titleId={titleId} onDone={onClose} />}
    </dialog>
  );
}

function SiteRow({ site, checked, onChoose }: { site: Site; checked: boolean; onChoose: (id: string) => void }) {
  return (
    <label className={`site-row ${checked ? 'checked' : ''}`}>
      <input type="radio" name="site" value={site.id} checked={checked} onChange={() => onChoose(site.id)} />
      <span>
        <span className="site-name">{site.name}</span>
        <span className="site-desc">{site.description}</span>
      </span>
    </label>
  );
}

function AddSiteForm({ titleId, onDone }: { titleId: string; onDone: () => void }) {
  const sites = useStore((s) => s.sites);
  const count = useStore((s) => s.scenarios.length);
  const activeStart = useStore((s) => activeScenario(s)?.start) ?? DEFAULT_START;
  const activeDays = useStore((s) => activeScenario(s)?.days) ?? 30;
  const addScenario = useStore((s) => s.addScenario);
  const setActive = useStore((s) => s.setActive);
  const meta = useTerrainMeta();

  const firstUnused = () => {
    const used = new Set(useStore.getState().scenarios.map((x) => x.siteId));
    return sites.find((s) => !used.has(s.id)) ?? sites[0];
  };
  const [initial] = useState(firstUnused);
  const [choice, setChoice] = useState<string>(initial?.id ?? CUSTOM);
  const [lat, setLat] = useState(String(initial?.lat ?? -89));
  const [lon, setLon] = useState(String(initial?.lon ?? 0));
  const [date, setDate] = useState(activeStart.slice(0, 10));
  const [time, setTime] = useState(activeStart.slice(11, 16));
  const [days, setDays] = useState(String(activeDays));

  const site = sites.find((s) => s.id === choice);
  const nLat = num(lat);
  const nLon = num(lon);
  const nDays = num(days);
  const invalid = validateNewScenario({ date, time, lat: nLat, lon: nLon, days: nDays });
  const full = count >= MAX_SCENARIOS;
  const coordsOk = Number.isFinite(nLat) && Number.isFinite(nLon);

  const choose = (id: string) => {
    setChoice(id);
    const s = sites.find((x) => x.id === id);
    if (s) { setLat(String(s.lat)); setLon(String(s.lon)); }
  };
  const pick = (la: number, lo: number) => { setChoice(CUSTOM); setLat(String(la)); setLon(String(lo)); };
  const setDateTime = (iso: string) => { setDate(iso.slice(0, 10)); setTime(iso.slice(11, 16)); };

  let terrain = '';
  if (site) {
    terrain = site.category === 'south-pole'
      ? 'Horizon from real terrain (LOLA, 80 m grid).'
      : 'Smooth horizon: this site is outside the south pole terrain model.';
  } else if (coordsOk && meta) {
    const [x, y] = latLonToXY(nLat, nLon);
    const inside = nLat <= -80 && Math.abs(x) <= meta.extent_m / 2 && Math.abs(y) <= meta.extent_m / 2;
    terrain = inside ? 'Horizon from real terrain (LOLA, 240 m grid).' : 'Smooth horizon: this spot is outside the south pole terrain model.';
  }

  const add = () => {
    if (invalid || full) return;
    addScenario({
      label: site ? site.name : customLabel(nLat, nLon),
      siteId: site?.id ?? null, lat: nLat, lon: nLon, start: `${date}T${time}:00Z`, days: nDays,
    });
    const added = useStore.getState().scenarios.at(-1);
    if (added) setActive(added.id);
    onDone();
  };

  const group = (category: Site['category']) => sites.filter((s) => s.category === category).map((s) => (
    <SiteRow key={s.id} site={s} checked={choice === s.id} onChoose={choose} />
  ));

  return (
    <form className="dialog-form" onSubmit={(e) => { e.preventDefault(); add(); }}>
      <header className="dialog-head">
        <h2 id={titleId}>Add a site</h2>
        <button type="button" className="ghost close" aria-label="Close" onClick={onDone}>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" /></svg>
        </button>
      </header>

      <div className="dialog-body">
        <fieldset className="site-list">
          <legend className="sr-only">Site</legend>
          <p className="group-title">South pole (real terrain)</p>
          {group('south-pole')}
          <p className="group-title">Elsewhere on the Moon (smooth horizon)</p>
          {group('contrast')}
          <label className={`site-row ${choice === CUSTOM ? 'checked' : ''}`}>
            <input type="radio" name="site" value={CUSTOM} checked={choice === CUSTOM} onChange={() => setChoice(CUSTOM)} />
            <span>
              <span className="site-name">Pick a spot on the map</span>
              <span className="site-desc">Tap the map or type coordinates. Inside the map the horizon comes from real terrain.</span>
            </span>
          </label>
        </fieldset>

        <div className="map-col">
          <SouthPoleMap picked={choice === CUSTOM && coordsOk ? [nLat, nLon] : null} selectedId={site?.id ?? null}
                        onPick={pick} onPickSite={choose} />
          <div className="field-row">
            <label>Latitude (°)
              <input type="number" step="0.0001" inputMode="decimal" value={lat}
                     onChange={(e) => { setChoice(CUSTOM); setLat(e.target.value); }} />
            </label>
            <label>Longitude (°E)
              <input type="number" step="0.001" inputMode="decimal" value={lon}
                     onChange={(e) => { setChoice(CUSTOM); setLon(e.target.value); }} />
            </label>
          </div>
          {terrain && <p className="muted small">{terrain}</p>}
        </div>
      </div>

      <footer className="dialog-foot">
        <div className="when">
          <div className="field-row">
            <label>Landing date (UTC)<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <label>Time<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
            <label className="days">Days<input type="number" min={1} max={60} value={days} onChange={(e) => setDays(e.target.value)} /></label>
          </div>
          <div className="presets" role="group" aria-label="Date presets">
            <button type="button" onClick={() => setDate(new Date().toISOString().slice(0, 10))}>Today</button>
            <button type="button" onClick={() => setDateTime(addDaysIso(activeStart, SYNODIC_DAYS))}>One month later</button>
            <button type="button" onClick={() => { setDate('2030-01-01'); setTime('00:00'); }}>January 2030</button>
          </div>
        </div>
        {invalid && <p className="error small" role="alert">{invalid}</p>}
        <div className="dialog-actions">
          <button type="button" onClick={onDone}>Cancel</button>
          <button type="submit" className="primary" disabled={!!invalid || full || sites.length === 0}>Add site</button>
        </div>
      </footer>
    </form>
  );
}
