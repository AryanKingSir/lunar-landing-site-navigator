import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { placeName } from '../lib/format';
import { nextSunrise } from '../lib/nextSunrise';
import { rangeEndOf } from '../lib/time';
import { validateNewScenario } from '../lib/validate';
import { MAX_SCENARIOS, SYNODIC_DAYS, useStore, type Scenario } from '../store';

type Props = { sc: Scenario; anchor: RefObject<HTMLButtonElement | null>; onClose: (refocus: boolean) => void };

const isoFromMs = (ms: number) => new Date(ms).toISOString().replace('.000Z', 'Z');

/** Why "Start at the next sunrise" cannot be used, or null when it can. */
function sunriseReason(sc: Scenario, sunrise: number | null): string | null {
  if (sunrise !== null) return null;
  if (!sc.result) return sc.error ? 'Results for this site failed to load' : 'Waiting for this site’s results';
  const sun = sc.result.windows.sun;
  if (sun.length === 0) return 'The Sun never rises here in this period';
  const start = Date.parse(sc.start);
  if (sun.length === 1 && sun[0][0] <= start && sun[0][1] >= rangeEndOf(sc.result.samples.t)) return 'The Sun is up the whole time';
  return 'The Sun does not rise again in this period';
}

export function ChipMenu({ sc, anchor, onClose }: Props) {
  const count = useStore((s) => s.scenarios.length);
  const duplicateShifted = useStore((s) => s.duplicateShifted);
  const updateScenario = useStore((s) => s.updateScenario);
  const removeScenario = useStore((s) => s.removeScenario);
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(sc.start.slice(0, 10));
  const [time, setTime] = useState(sc.start.slice(11, 16));
  const [days, setDays] = useState(String(sc.days));
  const pop = useRef<HTMLDivElement>(null);

  const full = count >= MAX_SCENARIOS;
  const sunrise = sc.result ? nextSunrise(sc.result.windows.sun, Date.parse(sc.start)) : null;
  const noSunrise = sunriseReason(sc, sunrise);
  const name = placeName(sc.label);
  const nDays = days.trim() === '' ? NaN : Number(days);
  const invalid = validateNewScenario({ date, time, lat: sc.lat, lon: sc.lon, days: nDays });

  // Focus the first usable item on open and whenever the view inside the pop-up changes.
  useEffect(() => {
    pop.current?.querySelector<HTMLElement>(editing ? 'input' : '[role=menuitem]:not(:disabled)')?.focus();
  }, [editing]);

  // A press outside closes without stealing focus back.
  useEffect(() => {
    const onDown = (e: globalThis.PointerEvent) => {
      const t = e.target as Node;
      if (pop.current?.contains(t) || anchor.current?.contains(t)) return;
      onClose(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [anchor, onClose]);

  const keys = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(true); return; }
    if (editing || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const items = [...(pop.current?.querySelectorAll<HTMLElement>('[role=menuitem]:not(:disabled)') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1
      : (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  };

  const act = (f: () => void) => () => { f(); onClose(true); };
  const apply = () => {
    if (invalid) return;
    const unchanged = date === sc.start.slice(0, 10) && time === sc.start.slice(11, 16);
    updateScenario(sc.id, { start: unchanged ? sc.start : `${date}T${time}:00Z`, days: nDays });
    onClose(true);
  };

  return (
    <div className="chip-pop" ref={pop} onKeyDown={keys}>
      {editing ? (
        <form className="date-form" aria-label={`Change landing date for ${sc.tag}, ${name}`}
              onSubmit={(e) => { e.preventDefault(); apply(); }}>
          <p className="pop-title">Change landing date</p>
          <div className="field-row">
            <label>Date (UTC)<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <label>Time<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
            <label className="days">Days<input type="number" min={1} max={60} value={days} onChange={(e) => setDays(e.target.value)} /></label>
          </div>
          {invalid && <p className="error small">{invalid}</p>}
          <div className="pop-actions">
            <button type="button" className="ghost" onClick={() => setEditing(false)}>Back</button>
            <button type="submit" className="primary" disabled={!!invalid}>Apply</button>
          </div>
        </form>
      ) : (
        <div role="menu" aria-label={`${sc.tag}, ${name}`}>
          <button role="menuitem" className="menu-item" onClick={() => setEditing(true)}>Change landing date</button>
          <button role="menuitem" className="menu-item" disabled={full}
                  onClick={act(() => duplicateShifted(sc.id, SYNODIC_DAYS))}>
            Land a month later
            {full && <span className="menu-reason">4 sites is the most you can compare</span>}
          </button>
          <button role="menuitem" className="menu-item" disabled={sunrise === null}
                  onClick={act(() => { if (sunrise !== null) updateScenario(sc.id, { start: isoFromMs(sunrise) }); })}>
            Start at the next sunrise
            {noSunrise && <span className="menu-reason">{noSunrise}</span>}
          </button>
          <hr />
          <button role="menuitem" className="menu-item danger" onClick={act(() => removeScenario(sc.id))}>Remove</button>
        </div>
      )}
    </div>
  );
}
