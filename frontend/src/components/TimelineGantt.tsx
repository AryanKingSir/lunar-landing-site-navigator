import { useMemo } from 'react';
import type { MouseEvent } from 'react';
import { dateLabel, placeName } from '../lib/format';
import { linear } from '../lib/scale';
import { DAY_MS } from '../lib/time';
import { maxDurationMs, useStore } from '../store';
import type { Win } from '../types';

const W = 1000, LABEL = 170, ROW = 14, GAP = 4, GROUP_GAP = 16, TOP = 22, HEAD = 22;
const LANES: { key: 'sun' | 'earth' | 'dte'; label: string; color: string; tip?: string }[] = [
  { key: 'sun', label: 'Sunlight', color: 'var(--sun)' },
  { key: 'earth', label: 'Earth in view', color: 'var(--earth)' },
  { key: 'dte', label: 'Radio link to Earth', color: 'var(--link)', tip: 'Direct-to-Earth (DTE)' },
];

export function TimelineGantt() {
  const allScenarios = useStore((s) => s.scenarios);
  const offsetMs = useStore((s) => s.offsetMs);
  const setOffset = useStore((s) => s.setOffset);
  const maxMs = useStore(maxDurationMs);
  const noteEvent = useStore((s) => s.noteEvent);

  const geo = useMemo(() => {
    const scenarios = allScenarios.filter((s) => s.result);
    const dup = new Set(allScenarios.map((s) => placeName(s.label))).size < allScenarios.length;
    if (scenarios.length === 0 || maxMs === 0) return null;
    const x = linear(0, maxMs, LABEL, W);
    const groupH = HEAD + LANES.length * (ROW + GAP) + GROUP_GAP;
    const H = TOP + scenarios.length * groupH;
    const days = maxMs / DAY_MS;
    const tick = days <= 15 ? 1 : days <= 31 ? 2 : 5;
    const ticks = Array.from({ length: Math.floor(days / tick) + 1 }, (_, k) => k * tick);

    const grid = ticks.map((d) => (
      <g key={d}><line x1={x(d * DAY_MS)} x2={x(d * DAY_MS)} y1={TOP - 4} y2={H} stroke="var(--hairline)" />
        <text x={x(d * DAY_MS)} y={13} textAnchor={d === 0 ? 'start' : d === ticks[ticks.length - 1] ? 'end' : 'middle'}>{d === 0 ? 'Day 0' : d}</text></g>
    ));
    // Site names run into the chart area, so they are drawn last (over the cursor) with a page-coloured halo.
    const heads = scenarios.map((s, gi) => {
      const gy = TOP + gi * groupH;
      return (
        <g key={`${s.id}-head`}>
          <rect x={0} y={gy + 2} width={16} height={16} rx={3} fill={s.color} />
          <text x={8} y={gy + 14} textAnchor="middle" style={{ fill: '#fff', fontWeight: 700, fontSize: 11 }}>{s.tag}</text>
          <text x={24} y={gy + 15} className="halo" style={{ fill: 'var(--ink)', fontWeight: 600 }}>{placeName(s.label)}{dup ? `, landing ${dateLabel(s.start)}` : ''}</text>
        </g>
      );
    });
    const lanes = scenarios.map((s, gi) => {
      const t0 = s.result!.samples.t[0];
      const gy = TOP + gi * groupH;
      return LANES.map((lane, li) => {
        const yy = gy + HEAD + li * (ROW + GAP);
        const wins: Win[] = s.result!.windows[lane.key];
        return (
          <g key={`${s.id}-${lane.key}`}>
            <text x={24} y={yy + ROW - 3}>
              {lane.tip && <title>{lane.tip}</title>}
              {lane.label}
            </text>
            <rect x={LABEL} y={yy} width={x(s.days * DAY_MS) - LABEL} height={ROW} fill="var(--surface)" />
            {wins.map(([a, b], k) => (
              <rect key={k} x={x(a - t0)} y={yy} width={Math.max(0.5, x(b - t0) - x(a - t0))} height={ROW} fill={lane.color} />
            ))}
          </g>
        );
      });
    });
    return { x, H, grid, lanes, heads };
  }, [allScenarios, maxMs]);

  if (!geo) return null;
  const { x, H, grid, lanes, heads } = geo;

  const click = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    if (vx >= LABEL) { setOffset(((vx - LABEL) / (W - LABEL)) * maxMs); noteEvent('timeline-seek'); }
  };

  return (
    <section className="panel">
      <h2>Timeline</h2>
      <p className="view-note">Days since each site’s landing date. Click anywhere on the bars to jump to that moment.</p>
      <ul className="tl-legend" aria-label="Legend">
        {LANES.map((l) => <li key={l.key}><span className="key" style={{ background: l.color }} />{l.label}</li>)}
        <li><span className="key cursor" />The moment shown in the other views</li>
      </ul>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" onClick={click} style={{ cursor: 'pointer' }}>
        {grid}
        {lanes}
        <line x1={x(offsetMs)} x2={x(offsetMs)} y1={TOP - 6} y2={H} stroke="var(--ink)" strokeWidth={2} />
        {heads}
      </svg>
    </section>
  );
}
