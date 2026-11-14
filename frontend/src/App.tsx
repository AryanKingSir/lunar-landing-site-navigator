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
import { useUrlSync } from './lib/useUrlSync';
import { useStore } from './store';

export default function App() {
  const start = useStore((s) => s.start);
  const explain = useStore((s) => s.explain);

  useUrlSync();

  useEffect(() => {
    void start();
  }, [start]);

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
