import { useStore } from '../store';
import type { PanelMode } from '../types';

export function Header() {
  const explain = useStore((s) => s.explain);
  const toggleExplain = useStore((s) => s.toggleExplain);
  const panelMode = useStore((s) => s.panelMode);
  const setPanelMode = useStore((s) => s.setPanelMode);
  return (
    <header className="header">
      <h1>Lunar Landing Site Navigator</h1>
      <span className="muted">Sun · Earth · horizon: compare landing sites and dates</span>
      <span className="spacer" />
      <label className="muted">Solar array{' '}
        <select value={panelMode} onChange={(e) => setPanelMode(e.target.value as PanelMode)}>
          <option value="vertical-tracking">Vertical, Sun-tracking</option>
          <option value="horizontal">Horizontal (deck-mounted)</option>
          <option value="fixed-vertical">Vertical, fixed facing north</option>
        </select>
      </label>
      <button className={explain ? 'primary' : ''} onClick={toggleExplain}>{explain ? 'Explain: on' : 'Explain'}</button>
    </header>
  );
}
