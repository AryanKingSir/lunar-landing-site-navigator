import { useStore } from '../store';

export function Header() {
  // Help opens the explain panel until the guided tour replaces it (Task 14).
  const explain = useStore((s) => s.explain);
  const toggleExplain = useStore((s) => s.toggleExplain);
  return (
    <header className="header">
      <div className="brand">
        <h1>Lunar Landing Site Navigator</h1>
        <p>Compare landing sites and dates by when they get sunlight and can see Earth.</p>
      </div>
      <span className="spacer" />
      <button className="ghost" data-tour="share" disabled title="Sharing arrives soon">Share</button>
      <button className="ghost" data-tour="help" aria-pressed={explain} onClick={toggleExplain}>Help</button>
    </header>
  );
}
