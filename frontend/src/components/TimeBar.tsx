import { useEffect, type CSSProperties } from 'react';
import { dayLabel, utcLabel } from '../lib/format';
import { HOUR_MS } from '../lib/time';
import { activeScenario, maxDurationMs, useStore } from '../store';

const SPEEDS: { value: number; label: string }[] = [
  { value: 1, label: 'Slow' }, { value: 6, label: 'Normal' }, { value: 24, label: 'Fast' }, { value: 72, label: 'Very fast' },
];

export function TimeBar() {
  const offsetMs = useStore((s) => s.offsetMs);
  const playing = useStore((s) => s.playing);
  const speedHoursPerSec = useStore((s) => s.speedHoursPerSec);
  const setOffset = useStore((s) => s.setOffset);
  const setPlaying = useStore((s) => s.setPlaying);
  const setSpeed = useStore((s) => s.setSpeed);
  const maxMs = useStore(maxDurationMs);
  const t0 = useStore((s) => activeScenario(s)?.result?.samples.t[0]);

  useEffect(() => {
    if (!playing) return;
    let last: number | null = null;
    let raf = 0;
    const loop = (now: number) => {
      const st = useStore.getState();
      if (!st.playing) return;
      if (last === null) last = now;
      const end = maxDurationMs(st);
      const next = st.offsetMs + (Math.min(now - last, 500) / 1000) * st.speedHoursPerSec * HOUR_MS;
      last = now;
      if (next >= end) { st.setOffset(end); st.setPlaying(false); return; }
      st.setOffset(next);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const progress = maxMs > 0 ? (offsetMs / maxMs) * 100 : 0;
  return (
    <footer className="timebar" data-tour="timebar">
      <div className="timebar-inner">
        <button className="primary play" onClick={() => { if (offsetMs >= maxMs) setOffset(0); setPlaying(!playing); }}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <select value={speedHoursPerSec} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Playback speed">
          {SPEEDS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <input type="range" min={0} max={maxMs} step={10 * 60_000} value={offsetMs}
               style={{ '--p': `${progress}%` } as CSSProperties}
               onChange={(e) => setOffset(Number(e.target.value))} aria-label="Mission time" aria-valuetext={dayLabel(offsetMs)} />
        <div className="when" aria-live="off">
          <b>{dayLabel(offsetMs)}</b>
          {t0 !== undefined && <span>{utcLabel(t0 + offsetMs)}</span>}
        </div>
      </div>
    </footer>
  );
}
