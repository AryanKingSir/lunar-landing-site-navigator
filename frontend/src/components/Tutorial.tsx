import { useEffect, useState } from 'react';
import { indexAt } from '../lib/time';
import { newlyCompleted, TASKS, type Snapshot } from '../lib/tutorial';
import { useStore } from '../store';

type St = ReturnType<typeof useStore.getState>;

function snapshot(s: St): Snapshot {
  return {
    activeId: s.activeId, view: s.view, offsetMs: s.offsetMs, events: s.events,
    scenarios: s.scenarios.map((x) => {
      const S = x.result?.samples;
      const earthVisibleNow = S ? !!S.earth_vis[indexAt(S.t, S.t[0] + s.offsetMs)] : null;
      return { id: x.id, siteId: x.siteId, start: x.start, earthVisibleNow };
    }),
  };
}

/** Highlights the element with the given data-tour anchor for a few seconds. */
export function spotlight(target: string) {
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  el.classList.remove('tour-spot');
  void el.offsetWidth; // restart the animation
  el.classList.add('tour-spot');
  setTimeout(() => el.classList.remove('tour-spot'), 3200);
}

export function Tutorial() {
  const open = useStore((s) => s.tutorial.open);
  const completed = useStore((s) => s.tutorial.completed);
  const close = useStore((s) => s.closeTutorial);
  const complete = useStore((s) => s.completeTask);
  const [minimised, setMinimised] = useState(false);
  const [announce, setAnnounce] = useState('');

  // Watch the store outside React and tick off tasks as the user does them.
  useEffect(() => {
    if (!open) return;
    let prev = snapshot(useStore.getState());
    return useStore.subscribe((s) => {
      const next = snapshot(s);
      const done = newlyCompleted(prev, next, s.tutorial.completed);
      prev = next;
      for (const id of done) {
        complete(id);
        const t = TASKS.find((x) => x.id === id);
        if (t) setAnnounce(`Done: ${t.title}. ${t.lesson}`);
      }
    });
  }, [open, complete]);

  // Keep the current step in view as tasks are completed.
  useEffect(() => {
    if (open) document.querySelector('.tour-list li.current')?.scrollIntoView({ block: 'nearest' });
  }, [open, completed]);

  if (!open) return null;
  const doneCount = TASKS.filter((t) => completed.includes(t.id)).length;
  const current = TASKS.find((t) => !completed.includes(t.id));

  return (
    <aside className={`tour ${minimised ? 'min' : ''}`} aria-labelledby="tour-title">
      <div className="tour-head">
        <h2 id="tour-title">Get started</h2>
        <span className="tour-count num">{doneCount} of {TASKS.length}</span>
        <button className="ghost tour-min" aria-expanded={!minimised} onClick={() => setMinimised(!minimised)}>
          {minimised ? 'Show' : 'Hide'}
        </button>
      </div>
      <div className="tour-bar" aria-hidden="true"><span style={{ width: `${(doneCount / TASKS.length) * 100}%` }} /></div>
      <p className="sr-only" aria-live="polite">{announce}</p>
      {!minimised && (
        <ol className="tour-list">
          {TASKS.map((t) => {
            const done = completed.includes(t.id);
            const isCurrent = t === current;
            return (
              <li key={t.id} className={done ? 'done' : isCurrent ? 'current' : ''}>
                <span className="tour-mark" aria-hidden="true">{done ? '✓' : ''}</span>
                <div>
                  <h3>{t.title}<span className="sr-only">{done ? ' (done)' : isCurrent ? ' (current step)' : ''}</span></h3>
                  {isCurrent && (
                    <>
                      <p>{t.instruction}</p>
                      <div className="tour-actions">
                        <button className="primary" onClick={() => spotlight(t.target)}>Show me</button>
                        <button className="ghost" onClick={() => complete(t.id)}>Skip this step</button>
                      </div>
                    </>
                  )}
                  {done && <p className="tour-lesson">{t.lesson}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {!minimised && (
        <div className="tour-foot">
          {current ? <button className="ghost" onClick={close}>Close the tutorial</button>
            : <button className="primary" onClick={close}>Finish</button>}
          <span className="muted small">You can restart it from Help.</span>
        </div>
      )}
    </aside>
  );
}
