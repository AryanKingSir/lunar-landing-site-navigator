import type { CSSProperties } from 'react';
import { dateLabel } from '../lib/format';
import { SYNODIC_DAYS, useStore } from '../store';

export function ScenarioList() {
  const scenarios = useStore((s) => s.scenarios);
  const activeId = useStore((s) => s.activeId);
  const setActive = useStore((s) => s.setActive);
  const removeScenario = useStore((s) => s.removeScenario);
  const duplicateShifted = useStore((s) => s.duplicateShifted);
  const runScenario = useStore((s) => s.runScenario);
  if (scenarios.length === 0) return <p className="muted">No scenarios yet. Add a site below.</p>;
  return (
    <ul className="cards">
      {scenarios.map((s) => (
        <li key={s.id} className={`card ${s.id === activeId ? 'active' : ''}`}
            style={{ '--c': s.color } as CSSProperties} onClick={() => setActive(s.id)}
            tabIndex={0} role="button" aria-pressed={s.id === activeId}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === 'Enter' || e.key === ' ') {
                if (e.key === ' ') e.preventDefault();
                setActive(s.id);
              }
            }}>
          <div className="card-head">
            <span className="tag">{s.tag}</span>
            <b>{s.label}</b>
            <button className="ghost" title="Same site, landing one lunation later" aria-label={`Slip ${s.label} +1 lunation`}
                    onClick={(e) => { e.stopPropagation(); duplicateShifted(s.id, SYNODIC_DAYS); }}>
              Slip +1 lunation
            </button>
            <button className="ghost" title="Remove" aria-label={`Remove ${s.label}`} onClick={(e) => { e.stopPropagation(); removeScenario(s.id); }}>×</button>
          </div>
          <div className="meta">
            Lands {dateLabel(s.start)}, {s.start.slice(11, 16)} UTC, for {s.days} {s.days === 1 ? 'day' : 'days'}
          </div>
          <div className="meta">
            {s.lat.toFixed(3)}°, {s.lon.toFixed(3)}°
            {s.result && <span className={`badge ${s.result.terrain_source.startsWith('LOLA') ? 'terrain' : ''}`}>
              . Terrain from {s.result.terrain_source}{s.result.terrain_partial ? ', far field partly covered' : ''}
            </span>}
          </div>
          {s.loading && <div className="meta">Computing… (the first request can take up to a minute while the server wakes)</div>}
          {s.error && (
            <div className="error">
              {s.error}{' '}
              <button onClick={(e) => { e.stopPropagation(); void runScenario(s.id); }}>Try again</button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
