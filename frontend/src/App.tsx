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
            {view === 'numbers' && <ComparisonGrid />}
            <TimeBar />
          </div>
        </div>
      </div>
      <Tutorial />
    </div>
  );
}
