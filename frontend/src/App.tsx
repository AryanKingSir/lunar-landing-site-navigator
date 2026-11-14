import { useEffect } from 'react';
import { AddScenario } from './components/AddScenario';
import { ComparisonGrid } from './components/ComparisonGrid';
import { Header } from './components/Header';
import { HorizonPanorama } from './components/HorizonPanorama';
import { ScenarioList } from './components/ScenarioList';
import { TimeScrubber } from './components/TimeScrubber';
import { TimelineGantt } from './components/TimelineGantt';
import { DEFAULT_START, useStore } from './store';

export default function App() {
  const loadSites = useStore((s) => s.loadSites);

  useEffect(() => {
    void loadSites().then(() => {
      const { sites, scenarios, addScenario } = useStore.getState();
      if (scenarios.length > 0) return;
      for (const id of ['connecting-ridge', 'apollo11']) {
        const s = sites.find((x) => x.id === id);
        if (s) addScenario({ label: s.name, siteId: s.id, lat: s.lat, lon: s.lon, start: DEFAULT_START, days: 30 });
      }
    });
  }, [loadSites]);

  return (
    <div className="app">
      <Header />
      <aside className="sidebar">
        <ScenarioList />
        <AddScenario />
      </aside>
      <main className="main">
        <ComparisonGrid />
        <div className="views"><HorizonPanorama /></div>
        <TimelineGantt />
      </main>
      <TimeScrubber />
    </div>
  );
}
