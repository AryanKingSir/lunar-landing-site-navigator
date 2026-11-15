import { useEffect, useState } from 'react';
import { AddScenario } from './components/AddScenario';
import { ComparisonGrid } from './components/ComparisonGrid';
import { ExplainPanel } from './components/ExplainPanel';
import { Header } from './components/Header';
import { HorizonPanorama } from './components/HorizonPanorama';
import { ScenarioList } from './components/ScenarioList';
import { StatusBanner } from './components/StatusBanner';
import { panelId, tabId, Tabs } from './components/Tabs';
import { Terrain3D } from './components/Terrain3D';
import { TimeBar } from './components/TimeBar';
import { TimelineGantt } from './components/TimelineGantt';
import { summarize } from './lib/summary';
import { useUrlSync } from './lib/useUrlSync';
import { activeScenario, useStore } from './store';
import type { PanelMode } from './types';

/** Placeholder until Task 9: the active site's plain-words summary. */
function Summary() {
  const result = useStore((s) => activeScenario(s)?.result);
  const days = useStore((s) => activeScenario(s)?.days);
  const label = useStore((s) => activeScenario(s)?.label);
  if (!result || days === undefined) return <p className="summary muted" data-tour="summary">Working out the Sun and Earth for your sites.</p>;
  return <p className="summary" data-tour="summary"><b>{label}.</b> {summarize(result, days).sentence}</p>;
}

/** Temporary home of the solar-array choice until All numbers is redesigned (Task 12). */
function SolarArraySelect() {
  const panelMode = useStore((s) => s.panelMode);
  const setPanelMode = useStore((s) => s.setPanelMode);
  return (
    <div className="numbers-controls">
      <label>Solar array
        <select value={panelMode} onChange={(e) => setPanelMode(e.target.value as PanelMode)}>
          <option value="vertical-tracking">Vertical, Sun-tracking</option>
          <option value="horizontal">Horizontal (deck-mounted)</option>
          <option value="fixed-vertical">Vertical, fixed facing north</option>
        </select>
      </label>
    </div>
  );
}

export default function App() {
  const start = useStore((s) => s.start);
  const explain = useStore((s) => s.explain);
  const view = useStore((s) => s.view);
  // Keep the 3D view mounted after its first show so WebGL is created once.
  const [terrainSeen, setTerrainSeen] = useState(view === 'terrain');
  if (view === 'terrain' && !terrainSeen) setTerrainSeen(true);

  useUrlSync();

  useEffect(() => {
    void start();
  }, [start]);

  return (
    <div className="app">
      <div className="page">
        <Header />
        <StatusBanner />
        <section className="sites" aria-label="Your sites">
          <ScenarioList />
          <details className="add-site">
            <summary>Add a site</summary>
            <AddScenario />
          </details>
        </section>
        <Summary />
        {explain && <ExplainPanel />}
        <div>
          <Tabs />
          <div className="stage" id={panelId} role="tabpanel" aria-labelledby={tabId(view)} data-tour="stage">
            {view === 'sky' && <HorizonPanorama />}
            {terrainSeen && (
              <div style={view === 'terrain' ? undefined : { display: 'none' }}>
                <Terrain3D active={view === 'terrain'} />
              </div>
            )}
            {view === 'timeline' && <TimelineGantt />}
            {view === 'numbers' && <><SolarArraySelect /><ComparisonGrid /></>}
          </div>
        </div>
      </div>
      <TimeBar />
    </div>
  );
}
