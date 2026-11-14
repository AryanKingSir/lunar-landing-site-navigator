import type { CSSProperties } from 'react';
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
            <b>{s.label}</b>
            <button title="Remove" aria-label={`Remove ${s.label}`} onClick={(e) => { e.stopPropagation(); removeScenario(s.id); }}>×</button>
          </div>
          <div className="muted mono">
            {s.lat.toFixed(3)}°, {s.lon.toFixed(3)}° · {s.start.slice(0, 16).replace('T', ' ')} UTC · {s.days} d
          </div>
          {s.loading && <div className="muted">Computing… (the first request can take up to a minute while the server wakes)</div>}
          {s.error && (
            <div className="error">
              {s.error}{' '}
              <button onClick={(e) => { e.stopPropagation(); void runScenario(s.id); }}>Try again</button>
            </div>
          )}
          {s.result && (
            <span className={`badge ${s.result.terrain_source.startsWith('LOLA') ? 'terrain' : ''}`}>
              {s.result.terrain_source}{s.result.terrain_partial ? ' · partial far-field' : ''}
            </span>
          )}
          <div style={{ marginTop: 6 }}>
            <button title="Same site, landing one lunation later" aria-label={`Slip ${s.label} +1 lunation`}
                    onClick={(e) => { e.stopPropagation(); duplicateShifted(s.id, SYNODIC_DAYS); }}>
              Slip +1 lunation
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
