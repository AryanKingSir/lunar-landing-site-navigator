import { useMemo } from 'react';
import type { MouseEvent } from 'react';
import { linear } from '../lib/scale';
import { DAY_MS } from '../lib/time';
import { maxDurationMs, useStore } from '../store';
import type { Win } from '../types';

const W = 1000, LABEL = 170, ROW = 12, GAP = 3, GROUP_GAP = 12, TOP = 18;
const LANES: { key: 'sun' | 'earth' | 'dte'; label: string; color: string }[] = [
  { key: 'sun', label: 'Sun', color: 'var(--sun)' },
  { key: 'earth', label: 'Earth', color: 'var(--earth)' },
  { key: 'dte', label: 'DTE', color: 'var(--dte)' },
];

function shortLabel(label: string) {
  const base = label.split(' (')[0];
  return base.length > 20 ? `${base.slice(0, 19)}…` : base;
}

export function TimelineGantt() {
  const allScenarios = useStore((s) => s.scenarios);
  const offsetMs = useStore((s) => s.offsetMs);
  const setOffset = useStore((s) => s.setOffset);
  const maxMs = useStore(maxDurationMs);

  const geo = useMemo(() => {
    const scenarios = allScenarios.filter((s) => s.result);
    if (scenarios.length === 0 || maxMs === 0) return null;
    const x = linear(0, maxMs, LABEL, W);
    const groupH = LANES.length * (ROW + GAP) + GROUP_GAP;
    const H = TOP + scenarios.length * groupH;
    const days = maxMs / DAY_MS;
    const tick = days <= 15 ? 1 : days <= 31 ? 2 : 5;
    const ticks = Array.from({ length: Math.floor(days / tick) + 1 }, (_, k) => k * tick);

    const grid = ticks.map((d) => (
      <g key={d}><line x1={x(d * DAY_MS)} x2={x(d * DAY_MS)} y1={TOP - 4} y2={H} stroke="#141c27" />
        <text x={x(d * DAY_MS)} y={11} textAnchor={d === ticks[ticks.length - 1] ? 'end' : 'middle'}>{d}d</text></g>
    ));
    const lanes = scenarios.map((s, gi) => {
      const t0 = s.result!.samples.t[0];
      return LANES.map((lane, li) => {
        const yy = TOP + gi * groupH + li * (ROW + GAP);
        const wins: Win[] = s.result!.windows[lane.key];
        return (
          <g key={`${s.id}-${lane.key}`}>
            <text x={4} y={yy + ROW - 2} style={{ fill: li === 0 ? s.color : undefined }}>
              <title>{s.label}</title>
              {li === 0 ? `${shortLabel(s.label)} · ${lane.label}` : lane.label}
            </text>
            <rect x={LABEL} y={yy} width={x(s.days * DAY_MS) - LABEL} height={ROW} fill="#0a0e14" />
            {wins.map(([a, b], k) => (
              <rect key={k} x={x(a - t0)} y={yy} width={Math.max(0.5, x(b - t0) - x(a - t0))} height={ROW} fill={lane.color} opacity={0.85} />
            ))}
          </g>
        );
      });
    });
    return { x, H, grid, lanes };
  }, [allScenarios, maxMs]);

  if (!geo) return null;
  const { x, H, grid, lanes } = geo;

  const click = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    if (vx >= LABEL) setOffset(((vx - LABEL) / (W - LABEL)) * maxMs);
  };

  return (
    <section className="panel">
      <h2>Timeline · mission elapsed time from each scenario’s start</h2>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" onClick={click} style={{ cursor: 'pointer' }}>
        {grid}
        {lanes}
        <line x1={x(offsetMs)} x2={x(offsetMs)} y1={TOP - 6} y2={H} stroke="#fff" strokeWidth={1.5} />
      </svg>
    </section>
  );
}
