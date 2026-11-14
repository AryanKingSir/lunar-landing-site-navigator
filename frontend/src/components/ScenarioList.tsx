import type { CSSProperties } from 'react';
import { SYNODIC_DAYS, useStore } from '../store';

export function ScenarioList() {
  const { scenarios, activeId, setActive, removeScenario, duplicateShifted } = useStore();
  if (scenarios.length === 0) return <p className="muted">No scenarios yet. Add a site below.</p>;
  return (
    <ul className="cards">
      {scenarios.map((s) => (
        <li key={s.id} className={`card ${s.id === activeId ? 'active' : ''}`}
            style={{ '--c': s.color } as CSSProperties} onClick={() => setActive(s.id)}>
          <div className="card-head">
            <b>{s.label}</b>
            <button title="Remove" onClick={(e) => { e.stopPropagation(); removeScenario(s.id); }}>×</button>
          </div>
          <div className="muted mono">
            {s.lat.toFixed(3)}°, {s.lon.toFixed(3)}° · {s.start.slice(0, 16).replace('T', ' ')} UTC · {s.days} d
          </div>
          {s.loading && <div className="muted">Computing… (the first request can take up to a minute while the server wakes)</div>}
          {s.error && <div className="error">{s.error}</div>}
          {s.result && (
            <span className={`badge ${s.result.terrain_source.startsWith('LOLA') ? 'terrain' : ''}`}>
              {s.result.terrain_source}{s.result.terrain_partial ? ' · partial far-field' : ''}
            </span>
          )}
          <div style={{ marginTop: 6 }}>
            <button title="Same site, landing one lunation later"
                    onClick={(e) => { e.stopPropagation(); duplicateShifted(s.id, SYNODIC_DAYS); }}>
              Slip +1 lunation
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
