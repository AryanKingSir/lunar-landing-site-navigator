import type { CSSProperties } from 'react';
import { downloadText, scenarioCsv } from '../lib/csv';
import { dayLabel, placeName } from '../lib/format';
import { DAY_MS, HOUR_MS, indexAt, rangeEndOf, windowStatus } from '../lib/time';
import { useStore, type Scenario } from '../store';
import type { Metrics, PanelMode, Win } from '../types';
import { StageSkeleton } from './Skeleton';

type Row = { key: keyof Metrics; label: string; fmt: (v: number) => string; better: 'high' | 'low' | null; mark?: string; tip: string };

/** "3 days 4 hours", "5 hours 20 minutes", "less than a minute". */
export function spell(ms: number): string {
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  if (ms < 60_000) return 'less than a minute';
  const d = Math.floor(ms / DAY_MS), h = Math.floor((ms % DAY_MS) / HOUR_MS), m = Math.floor((ms % HOUR_MS) / 60_000);
  if (d > 0) return h > 0 ? `${plural(d, 'day')} ${plural(h, 'hour')}` : plural(d, 'day');
  if (h > 0) return m > 0 ? `${plural(h, 'hour')} ${plural(m, 'minute')}` : plural(h, 'hour');
  return plural(m, 'minute');
}

const PERIOD_ROWS: Row[] = [
  { key: 'illumination_pct', label: 'Sunlight (average share of the Sun’s disk in view)', fmt: (v) => `${v.toFixed(1)}%`, better: 'high',
    tip: 'Average share of the Sun’s disk above the local terrain over the period. This is what drives solar power.' },
  { key: 'sun_time_pct', label: 'Time with any Sun', fmt: (v) => `${v.toFixed(1)}%`, better: 'high',
    tip: 'Share of the period when at least a sliver of the Sun is above the terrain.' },
  { key: 'longest_dark_h', label: 'Longest night', fmt: (v) => spell(v * HOUR_MS), better: 'low', mark: 'shortest',
    tip: 'Longest stretch without any Sun. Batteries and heaters have to last this long.' },
  { key: 'earth_vis_pct', label: 'Earth in view', fmt: (v) => `${v.toFixed(1)}%`, better: 'high',
    tip: 'Share of the period when at least half of Earth’s disk is above the terrain.' },
  { key: 'dte_pct', label: 'Radio link to Earth', fmt: (v) => `${v.toFixed(1)}%`, better: 'high',
    tip: 'Direct-to-Earth (DTE): Earth is in view and a Deep Space Network antenna (Goldstone, Madrid or Canberra) sees the Moon at least 10° up.' },
  { key: 'mean_power_w', label: 'Average power over the period', fmt: (v) => `${v.toFixed(0)} W`, better: 'high',
    tip: 'Average output of the solar panel chosen above. There is no air, so sunlight is about 1,361 W/m²; only the Sun’s angle and the terrain reduce it.' },
  { key: 'energy_wh', label: 'Energy over the period', fmt: (v) => `${(v / 1000).toFixed(1)} kWh`, better: 'high',
    tip: 'Total output of the panel over the whole period.' },
  { key: 'max_sun_el', label: 'Highest Sun', fmt: (v) => `${v.toFixed(2)}°`, better: null,
    tip: 'Highest the Sun gets above the level horizon. At the pole it is never more than about 2°.' },
];

function bestIndexValue(values: number[], better: Row['better']): number | null {
  if (!better || values.length < 2) return null;
  const b = better === 'high' ? Math.max(...values) : Math.min(...values);
  return values.every((v) => v === b) ? null : b;
}

type Words = { on: string; onEnds: (d: string) => string; off: (d: string) => string; never: string };
const SUN: Words = { on: 'Up for the rest of the period', onEnds: (d) => `Sets in ${d}`, off: (d) => `Rises in ${d}`, never: 'Does not rise again in this period' };
const EARTH: Words = { on: 'In view for the rest of the period', onEnds: (d) => `Goes out of view in ${d}`, off: (d) => `Comes into view in ${d}`, never: 'Does not come into view again in this period' };
const LINK: Words = { on: 'Linked for the rest of the period', onEnds: (d) => `Link ends in ${d}`, off: (d) => `Next link in ${d}`, never: 'No link in the rest of this period' };

function status(sc: Scenario, offsetMs: number, windows: Win[], w: Words): string {
  const t = sc.result!.samples.t;
  const st = windowStatus(windows, t[0] + offsetMs, rangeEndOf(t));
  if (st.inWindow) return st.openEnded ? w.on : w.onEnds(spell(st.msUntilChange ?? 0));
  return st.msUntilChange === null ? w.never : w.off(spell(st.msUntilChange));
}

function sunNow(el: number, frac: number): string {
  const pos = el >= 0 ? `${el.toFixed(1)}° up` : `${Math.abs(el).toFixed(1)}° below the level horizon`;
  if (frac >= 0.995) return `${pos}, fully visible`;
  if (frac <= 0) return el >= 0 ? `${pos}, hidden by terrain` : pos;
  return `${pos}, ${Math.round(frac * 100)}% of its disk visible`;
}

function earthNow(el: number, vis: boolean): string {
  const pos = el >= 0 ? `${el.toFixed(1)}° up` : `${Math.abs(el).toFixed(1)}° below the level horizon`;
  return vis ? `${pos}, in view` : el >= 0 ? `${pos}, hidden by terrain` : pos;
}

function fileName(sc: Scenario): string {
  const id = sc.siteId ?? `custom_${sc.lat.toFixed(3)}_${sc.lon.toFixed(3)}`;
  return `${id}_${sc.start.slice(0, 10)}_${sc.days}d.csv`;
}

function PanelSetting() {
  const panelMode = useStore((s) => s.panelMode);
  const setPanelMode = useStore((s) => s.setPanelMode);
  return (
    <div className="numbers-controls">
      <label>Solar panel
        <select value={panelMode} onChange={(e) => setPanelMode(e.target.value as PanelMode)}>
          <option value="vertical-tracking">Upright, turns to face the Sun</option>
          <option value="horizontal">Flat on the deck</option>
          <option value="fixed-vertical">Upright, fixed facing north</option>
        </select>
      </label>
      <span className="muted small">1 m², 30% efficient. Changes the power and energy rows.</span>
    </div>
  );
}

export function ComparisonGrid() {
  const scenarios = useStore((s) => s.scenarios);
  const offsetMs = useStore((s) => s.offsetMs);
  const ready = scenarios.filter((s) => s.result);
  if (ready.length === 0) {
    const anyLoading = scenarios.some((s) => s.loading);
    return <section className="panel"><h2>All numbers</h2>{anyLoading
      ? <StageSkeleton label="Working out the numbers for your sites." />
      : <p className="muted" role="status">No results to show. Use Try again on a site chip.</p>}</section>;
  }
  const dup = new Set(ready.map((s) => placeName(s.label))).size < ready.length;
  const cols = ready.length + 1;
  return (
    <section className="panel numbers">
      <h2>All numbers</h2>
      <PanelSetting />
      <div className="table-scroll">
        <table className="compare">
          <thead>
            <tr><th scope="col"><span className="sr-only">Measure</span></th>{ready.map((s) => (
              <th key={s.id} scope="col">
                <span className="col-head"><span className="tag" style={{ '--c': s.color } as CSSProperties}>{s.tag}</span>{placeName(s.label)}</span>
                <span className="cell-sub">{dup ? `Landing ${s.start.slice(0, 10)}. ` : ''}Terrain: {s.result!.terrain_source}
                  {s.result!.site_height_m !== null ? `, site at ${Math.round(s.result!.site_height_m).toLocaleString('en-GB')} m` : ''}</span>
                <button className="ghost csv" onClick={() => downloadText(fileName(s), scenarioCsv(s.result!))}>Download CSV</button>
              </th>
            ))}</tr>
          </thead>
          <tbody>
            <tr className="group"><th colSpan={cols} scope="colgroup">Right now ({dayLabel(offsetMs)})</th></tr>
            <tr><th scope="row"><span className="swatch" style={{ '--c': 'var(--sun)' } as CSSProperties} />Sun</th>{ready.map((s) => {
              const S = s.result!.samples; const i = indexAt(S.t, S.t[0] + offsetMs);
              return <td key={s.id}>{sunNow(S.sun_el[i], S.sun_frac[i])}<span className="cell-sub">{status(s, offsetMs, s.result!.windows.sun, SUN)}</span></td>;
            })}</tr>
            <tr><th scope="row"><span className="swatch" style={{ '--c': 'var(--earth)' } as CSSProperties} />Earth</th>{ready.map((s) => {
              const S = s.result!.samples; const i = indexAt(S.t, S.t[0] + offsetMs);
              return <td key={s.id}>{earthNow(S.earth_el[i], !!S.earth_vis[i])}<span className="cell-sub">{status(s, offsetMs, s.result!.windows.earth, EARTH)}</span></td>;
            })}</tr>
            <tr><th scope="row"><span className="swatch" style={{ '--c': 'var(--link)' } as CSSProperties} /><abbr title="Direct-to-Earth (DTE)">Radio link to Earth</abbr></th>{ready.map((s) => {
              const S = s.result!.samples; const i = indexAt(S.t, S.t[0] + offsetMs);
              return <td key={s.id}>{S.dte[i] ? 'Linked' : 'No link'}<span className="cell-sub">{status(s, offsetMs, s.result!.windows.dte, LINK)}</span></td>;
            })}</tr>
            <tr className="group"><th colSpan={cols} scope="colgroup">Over the whole period</th></tr>
            {PERIOD_ROWS.map((r) => {
              const vals = ready.map((s) => s.result!.metrics[r.key]);
              const b = bestIndexValue(vals, r.better);
              return (
                <tr key={r.key}>
                  <th scope="row"><abbr title={r.tip}>{r.label}</abbr></th>
                  {ready.map((s, i) => (
                    <td key={s.id} className="num">{r.fmt(vals[i])}
                      {b !== null && vals[i] === b && <span className="most">{r.mark ?? 'most'}</span>}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
