import { useEffect } from 'react';
import { AddScenario } from './components/AddScenario';
import { Header } from './components/Header';
import { ScenarioList } from './components/ScenarioList';
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
        {/* Task 10: <ComparisonGrid /> */}
        {/* Task 11/13: <div className="views"> <HorizonPanorama /> <Terrain3D /> </div> */}
        {/* Task 12: <TimelineGantt /> */}
      </main>
      {/* Task 12: <TimeScrubber /> */}
    </div>
  );
}
