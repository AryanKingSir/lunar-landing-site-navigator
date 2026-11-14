import type { CSSProperties } from 'react';
import { formatDuration, HOUR_MS, indexAt, windowStatus } from '../lib/time';
import { useStore, type Scenario } from '../store';
import type { Metrics, Win } from '../types';

type Row = { key: keyof Metrics; label: string; fmt: (v: number) => string; better: 'high' | 'low' | null; tip: string };

const ROWS: Row[] = [
  { key: 'illumination_pct', label: 'Illumination (avg. solar disk visible)', fmt: (v) => `${v.toFixed(1)}%`, better: 'high',
    tip: 'Average fraction of the Sun’s disk above the local terrain horizon. Drives solar power.' },
  { key: 'sun_time_pct', label: 'Time with any Sun', fmt: (v) => `${v.toFixed(1)}%`, better: 'high',
    tip: 'Share of the period when at least a sliver of the Sun is above the horizon.' },
  { key: 'longest_dark_h', label: 'Longest night', fmt: (v) => formatDuration(v * HOUR_MS), better: 'low',
    tip: 'Longest continuous stretch without Sun: sets battery and heater sizing.' },
  { key: 'earth_vis_pct', label: 'Earth above horizon', fmt: (v) => `${v.toFixed(1)}%`, better: 'high',
    tip: 'Share of time Earth’s disk centre is above the terrain. Required for direct-to-Earth radio.' },
  { key: 'dte_pct', label: 'DTE window (Earth + DSN)', fmt: (v) => `${v.toFixed(1)}%`, better: 'high',
    tip: 'Earth visible AND a Deep Space Network antenna (Goldstone/Madrid/Canberra) sees the Moon ≥10°.' },
  { key: 'mean_power_w', label: 'Mean array power (1 m², 30%)', fmt: (v) => `${v.toFixed(0)} W`, better: 'high',
    tip: 'No atmosphere: flux is ~1361 W/m², limited only by Sun angle and terrain.' },
  { key: 'energy_wh', label: 'Energy over period', fmt: (v) => `${(v / 1000).toFixed(1)} kWh`, better: 'high',
    tip: 'Total array output over the selected period.' },
  { key: 'max_sun_el', label: 'Max Sun elevation', fmt: (v) => `${v.toFixed(2)}°`, better: null,
    tip: 'At the pole the Sun never climbs more than ~1.6° above a flat horizon.' },
];

function best(values: number[], better: Row['better']): number | null {
  if (!better || values.length < 2) return null;
  return better === 'high' ? Math.max(...values) : Math.min(...values);
}

function status(sc: Scenario, offsetMs: number, windows: Win[], up: string, down: string) {
  const t = sc.result!.samples.t;
  const st = windowStatus(windows, t[0] + offsetMs, t[t.length - 1]);
  const when = `${st.openEnded && st.inWindow ? '≥ ' : ''}${formatDuration(st.msUntilChange)}`;
  return st.inWindow ? `${up} · ends in ${when}` : st.msUntilChange === null ? `${down} · none in period` : `${down} · starts in ${when}`;
}

export function ComparisonGrid() {
  const scenarios = useStore((s) => s.scenarios);
  const offsetMs = useStore((s) => s.offsetMs);
  const explain = useStore((s) => s.explain);
  const ready = scenarios.filter((s) => s.result);
  if (ready.length === 0) return <section className="panel"><h2>Comparison</h2><p className="muted">Waiting for results…</p></section>;
  return (
    <section className="panel">
      <h2>Comparison <span className="muted">· at T+{formatDuration(offsetMs)}</span></h2>
      <table className="compare">
        <thead>
          <tr><th />{ready.map((s) => <th key={s.id} style={{ color: s.color } as CSSProperties}>{s.label}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td>Sun now</td>{ready.map((s) => {
            const i = indexAt(s.result!.samples.t, s.result!.samples.t[0] + offsetMs);
            return <td key={s.id} className="mono" style={{ color: 'var(--sun)' }}>
              {s.result!.samples.sun_el[i].toFixed(2)}° · {(s.result!.samples.sun_frac[i] * 100).toFixed(0)}% disk<br />
              {status(s, offsetMs, s.result!.windows.sun, 'up', 'down')}</td>;
          })}</tr>
          <tr><td>Earth now</td>{ready.map((s) => {
            const i = indexAt(s.result!.samples.t, s.result!.samples.t[0] + offsetMs);
            return <td key={s.id} className="mono" style={{ color: 'var(--earth)' }}>
              {s.result!.samples.earth_el[i].toFixed(2)}°<br />{status(s, offsetMs, s.result!.windows.earth, 'visible', 'hidden')}</td>;
          })}</tr>
          <tr><td>DTE link now</td>{ready.map((s) => (
            <td key={s.id} className="mono" style={{ color: 'var(--dte)' }}>{status(s, offsetMs, s.result!.windows.dte, 'link', 'no link')}</td>
          ))}</tr>
          {ROWS.map((r) => {
            const vals = ready.map((s) => s.result!.metrics[r.key]);
            const b = best(vals, r.better);
            return (
              <tr key={r.key} title={r.tip}>
                <td>{r.label}{explain && <span className="explain-note">{r.tip}</span>}</td>
                {ready.map((s, i) => <td key={s.id} className={`mono ${b !== null && vals[i] === b ? 'best' : ''}`}>{r.fmt(vals[i])}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
