import { useEffect } from 'react';
import { formatDuration, HOUR_MS } from '../lib/time';
import { activeScenario, maxDurationMs, useStore } from '../store';

const SPEEDS = [1, 6, 24, 72];

export function TimeScrubber() {
  const offsetMs = useStore((s) => s.offsetMs);
  const playing = useStore((s) => s.playing);
  const speedHoursPerSec = useStore((s) => s.speedHoursPerSec);
  const setOffset = useStore((s) => s.setOffset);
  const setPlaying = useStore((s) => s.setPlaying);
  const setSpeed = useStore((s) => s.setSpeed);
  const maxMs = useStore(maxDurationMs);
  const sc = useStore(activeScenario);

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

  const utc = sc?.result ? new Date(sc.result.samples.t[0] + offsetMs).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '';
  return (
    <footer className="scrubber">
      <button className="primary" onClick={() => { if (offsetMs >= maxMs) setOffset(0); setPlaying(!playing); }}>{playing ? 'Pause' : 'Play'}</button>
      <select value={speedHoursPerSec} onChange={(e) => setSpeed(Number(e.target.value))}>
        {SPEEDS.map((s) => <option key={s} value={s}>{s} h/s</option>)}
      </select>
      <input type="range" min={0} max={maxMs} step={10 * 60_000} value={offsetMs} onChange={(e) => setOffset(Number(e.target.value))} aria-label="Mission elapsed time" />
      <span className="mono">T+{formatDuration(offsetMs)}</span>
      <span className="mono muted">{utc}</span>
    </footer>
  );
}
