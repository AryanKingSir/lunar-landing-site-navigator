import type { KeyboardEvent } from 'react';
import { useStore, type View } from '../store';

export const TABS: { view: View; label: string; tour?: string }[] = [
  { view: 'sky', label: 'Sky view' },
  { view: 'terrain', label: '3D terrain', tour: 'tab-terrain' },
  { view: 'timeline', label: 'Timeline', tour: 'tab-timeline' },
  { view: 'numbers', label: 'All numbers', tour: 'tab-numbers' },
];

export const tabId = (v: View) => `tab-${v}`;
export const panelId = 'stage-panel';

export function Tabs() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = TABS.findIndex((t) => t.view === view);
    const next = e.key === 'ArrowRight' ? (k + 1) % TABS.length
      : e.key === 'ArrowLeft' ? (k - 1 + TABS.length) % TABS.length
      : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    setView(TABS[next].view);
    document.getElementById(tabId(TABS[next].view))?.focus();
  };

  return (
    <div className="tabs" role="tablist" aria-label="Views" data-tour="tabs" onKeyDown={onKey}>
      {TABS.map((t) => (
        <button key={t.view} id={tabId(t.view)} className="tab" role="tab" type="button"
                aria-selected={view === t.view} aria-controls={panelId} tabIndex={view === t.view ? 0 : -1}
                data-tour={t.tour} onClick={() => setView(t.view)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
