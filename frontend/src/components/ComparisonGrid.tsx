import { StageSkeleton } from './Skeleton';
import type { CSSProperties } from 'react';
import { dayLabel } from '../lib/format';
import { formatDuration, HOUR_MS, indexAt, rangeEndOf, windowStatus } from '../lib/time';
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
  { key: 'earth_vis_pct', label: 'Earth in view', fmt: (v) => `${v.toFixed(1)}%`, better: 'high',
    tip: 'Share of time Earth’s disk centre is above the terrain. Required for direct-to-Earth radio.' },
  { key: 'dte_pct', label: 'Radio link to Earth', fmt: (v) => `${v.toFixed(1)}%`, better: 'high',
    tip: 'Direct-to-Earth (DTE): Earth is visible and a Deep Space Network antenna (Goldstone, Madrid or Canberra) sees the Moon at least 10° up.' },
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
  const st = windowStatus(windows, t[0] + offsetMs, rangeEndOf(t));
  const when = `${st.openEnded && st.inWindow ? '≥ ' : ''}${formatDuration(st.msUntilChange)}`;
  return st.inWindow ? `${up}, ends in ${when}` : st.msUntilChange === null ? `${down}, none in this period` : `${down}, starts in ${when}`;
}

export function ComparisonGrid() {
  const scenarios = useStore((s) => s.scenarios);
  const offsetMs = useStore((s) => s.offsetMs);
  const explain = useStore((s) => s.explain);
  const ready = scenarios.filter((s) => s.result);
  if (ready.length === 0) return <section className="panel"><h2>All numbers</h2><StageSkeleton label="Working out the numbers for your sites." /></section>;
  return (
    <section className="panel">
      <h2>All numbers at {dayLabel(offsetMs)}</h2>
      <div className="table-scroll">
      <table className="compare">
        <thead>
          <tr><th />{ready.map((s) => <th key={s.id}><span className="tag" style={{ '--c': s.color } as CSSProperties}>{s.tag}</span>{s.label}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td><span className="swatch" style={{ '--c': 'var(--sun)' } as CSSProperties} />Sunlight now</td>{ready.map((s) => {
            const i = indexAt(s.result!.samples.t, s.result!.samples.t[0] + offsetMs);
            return <td key={s.id}>
              {s.result!.samples.sun_el[i].toFixed(2)}° high, {(s.result!.samples.sun_frac[i] * 100).toFixed(0)}% of the disk
              <span className="cell-sub">{status(s, offsetMs, s.result!.windows.sun, 'Up', 'Down')}</span></td>;
          })}</tr>
          <tr><td><span className="swatch" style={{ '--c': 'var(--earth)' } as CSSProperties} />Earth in view now</td>{ready.map((s) => {
            const i = indexAt(s.result!.samples.t, s.result!.samples.t[0] + offsetMs);
            return <td key={s.id}>
              {s.result!.samples.earth_el[i].toFixed(2)}° high<span className="cell-sub">{status(s, offsetMs, s.result!.windows.earth, 'In view', 'Hidden')}</span></td>;
          })}</tr>
          <tr><td title="Direct-to-Earth (DTE)"><span className="swatch" style={{ '--c': 'var(--link)' } as CSSProperties} />Radio link to Earth now</td>{ready.map((s) => (
            <td key={s.id}>{status(s, offsetMs, s.result!.windows.dte, 'Linked', 'No link')}</td>
          ))}</tr>
          {ROWS.map((r) => {
            const vals = ready.map((s) => s.result!.metrics[r.key]);
            const b = best(vals, r.better);
            return (
              <tr key={r.key} title={r.tip}>
                <td>{r.label}{explain && <span className="explain-note">{r.tip}</span>}</td>
                {ready.map((s, i) => <td key={s.id} className={b !== null && vals[i] === b ? 'best' : undefined}>{r.fmt(vals[i])}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </section>
  );
}
