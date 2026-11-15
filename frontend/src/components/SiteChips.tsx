import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { dateLabel, placeName } from '../lib/format';
import { MAX_SCENARIOS, useStore, type Scenario } from '../store';
import { AddSiteDialog } from './AddSiteDialog';
import { ChipMenu } from './ChipMenu';

const ADD = 'add-site';

type ChipProps = {
  sc: Scenario; first: boolean; active: boolean; showDate: boolean; menuOpen: boolean;
  onToggleMenu: (id: string) => void; onCloseMenu: (refocus: boolean) => void;
};

function Chip({ sc, first, active, showDate, menuOpen, onToggleMenu, onCloseMenu }: ChipProps) {
  const setActive = useStore((s) => s.setActive);
  const runScenario = useStore((s) => s.runScenario);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const name = placeName(sc.label);
  const failed = !!sc.error && !sc.loading;
  return (
    <li className={`chip ${active ? 'active' : ''}`} style={{ '--c': sc.color } as CSSProperties}>
      <button className="chip-main" aria-pressed={active} title={sc.label} onClick={() => setActive(sc.id)}>
        <span className="tag">{sc.tag}</span>
        <span className="chip-text">
          <span className="chip-name">{name}</span>
          {(showDate || sc.loading || failed) && (
            <span className="chip-sub">
              {showDate && <span className="num">{dateLabel(sc.start)}</span>}
              {sc.loading && <span className="chip-busy"><span className="spinner" aria-hidden="true" />Computing</span>}
              {failed && <span className="chip-failed">Failed</span>}
            </span>
          )}
        </span>
      </button>
      {failed && (
        <button className="chip-retry" title={sc.error} onClick={() => void runScenario(sc.id)}>Try again</button>
      )}
      <button ref={menuBtn} className="chip-menu-btn" data-menu-for={sc.id} data-tour={first ? 'chip-menu' : undefined}
              aria-haspopup="menu" aria-expanded={menuOpen} aria-label={`Options for ${sc.tag}, ${name}`}
              onClick={() => onToggleMenu(sc.id)}>
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {menuOpen && <ChipMenu sc={sc} anchor={menuBtn} onClose={onCloseMenu} />}
    </li>
  );
}

/** One compact chip per site, plus the button that opens the Add site dialog. */
export function SiteChips() {
  const scenarios = useStore((s) => s.scenarios);
  const activeId = useStore((s) => s.activeId);
  const sitesLoaded = useStore((s) => s.sites.length > 0);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const addBtn = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<string | null>(null);

  // After a menu or the dialog closes, return focus: to the menu's button, else Add site, else the last chip.
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    const menuBtn = id === ADD ? null : document.querySelector<HTMLElement>(`[data-menu-for="${id}"]`);
    const add = addBtn.current && !addBtn.current.disabled ? addBtn.current : null;
    (menuBtn ?? add ?? document.querySelector<HTMLElement>('.chip:last-child .chip-main'))?.focus();
  });

  const toggleMenu = useCallback((id: string) => setMenuFor((cur) => (cur === id ? null : id)), []);
  const closeMenu = useCallback((refocus: boolean) => {
    setMenuFor((cur) => {
      if (refocus) pendingFocus.current = cur;
      return null;
    });
  }, []);
  const closeDialog = useCallback(() => {
    pendingFocus.current = ADD;
    setAdding(false);
  }, []);

  const full = scenarios.length >= MAX_SCENARIOS;
  const showDates = new Set(scenarios.map((s) => dateLabel(s.start))).size > 1;

  return (
    <section className="sites" aria-label="Your sites">
      {scenarios.length > 0 ? (
        <ul className="chips" data-tour="chips">
          {scenarios.map((sc, i) => (
            <Chip key={sc.id} sc={sc} first={i === 0} active={sc.id === activeId} showDate={showDates}
                  menuOpen={menuFor === sc.id} onToggleMenu={toggleMenu} onCloseMenu={closeMenu} />
          ))}
        </ul>
      ) : (
        sitesLoaded && <p className="muted" data-tour="chips">No sites yet. Add one to see its sky.</p>
      )}
      <button ref={addBtn} className="add-site-btn" data-tour="add-site" disabled={full || !sitesLoaded}
              onClick={() => setAdding(true)}>
        {full ? '4 sites is the most you can compare' : 'Add site'}
      </button>
      <AddSiteDialog open={adding} onClose={closeDialog} />
    </section>
  );
}
