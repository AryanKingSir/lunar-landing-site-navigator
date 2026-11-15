import { useEffect, useState } from 'react';
import { ComparisonGrid } from './components/ComparisonGrid';
import { Header } from './components/Header';
import { HorizonPanorama } from './components/HorizonPanorama';
import { StatusBanner } from './components/StatusBanner';
import { SiteChips } from './components/SiteChips';
import { SummaryStrip } from './components/SummaryStrip';
import { panelId, tabId, Tabs } from './components/Tabs';
import { Terrain3D } from './components/Terrain3D';
import { TimeBar } from './components/TimeBar';
import { TimelineGantt } from './components/TimelineGantt';
import { Tutorial } from './components/Tutorial';
import { useUrlSync } from './lib/useUrlSync';
import { useStore } from './store';
import type { PanelMode } from './types';

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
  const tourOpen = useStore((s) => s.tutorial.open);
  const view = useStore((s) => s.view);
  // Keep the 3D view mounted after its first show so WebGL is created once.
  const [terrainSeen, setTerrainSeen] = useState(view === 'terrain');
  if (view === 'terrain' && !terrainSeen) setTerrainSeen(true);

  useUrlSync();

  useEffect(() => {
    void start();
  }, [start]);

  return (
    <div className={`app ${tourOpen ? 'with-tour' : ''}`}>
      <div className="page">
        <Header />
        <StatusBanner />
        <SiteChips />
        <SummaryStrip />
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
      <Tutorial />
    </div>
  );
}
