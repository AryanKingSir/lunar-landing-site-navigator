import { useEffect } from 'react';
import { AddScenario } from './components/AddScenario';
import { ComparisonGrid } from './components/ComparisonGrid';
import { ExplainPanel } from './components/ExplainPanel';
import { Header } from './components/Header';
import { StatusBanner } from './components/StatusBanner';
import { HorizonPanorama } from './components/HorizonPanorama';
import { ScenarioList } from './components/ScenarioList';
import { Terrain3D } from './components/Terrain3D';
import { TimeScrubber } from './components/TimeScrubber';
import { TimelineGantt } from './components/TimelineGantt';
import { DEFAULT_START, useStore } from './store';

export default function App() {
  const loadSites = useStore((s) => s.loadSites);
  const wakeServer = useStore((s) => s.wakeServer);
  const explain = useStore((s) => s.explain);

  useEffect(() => {
    void wakeServer();
    void loadSites().then(() => {
      const { sites, scenarios, addScenario } = useStore.getState();
      if (scenarios.length > 0) return;
      for (const id of ['connecting-ridge', 'apollo11']) {
        const s = sites.find((x) => x.id === id);
        if (s) addScenario({ label: s.name, siteId: s.id, lat: s.lat, lon: s.lon, start: DEFAULT_START, days: 30 });
      }
    });
  }, [loadSites, wakeServer]);

  return (
    <div className="app">
      <StatusBanner />
      <Header />
      <aside className="sidebar">
        <ScenarioList />
        <AddScenario />
      </aside>
      <main className="main">
        {explain && <ExplainPanel />}
        <ComparisonGrid />
        <div className="views"><HorizonPanorama /><Terrain3D /></div>
        <TimelineGantt />
      </main>
      <TimeScrubber />
    </div>
  );
}
