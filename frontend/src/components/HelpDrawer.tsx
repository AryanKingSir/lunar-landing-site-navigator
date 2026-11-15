import { useEffect, useRef } from 'react';
import { GLOSSARY } from '../content/glossary';
import { METHODS, SOURCES } from '../content/methods';
import { useStore } from '../store';

type Props = { open: boolean; onClose: () => void };

export function HelpDrawer({ open, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const startTutorial = useStore((s) => s.startTutorial);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} className="drawer" aria-labelledby="help-title" onClose={onClose}
            onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="drawer-inner">
        <div className="drawer-head">
          <h2 id="help-title">Help</h2>
          <button className="ghost close" aria-label="Close help" onClick={onClose}>×</button>
        </div>

        <section>
          <h3>Take the tutorial</h3>
          <p>Eight short tasks that show how the tool works, about two minutes. It starts again with the two example sites.</p>
          <button className="primary" onClick={() => { onClose(); startTutorial(); }}>Start the tutorial</button>
        </section>

        <section>
          <h3>Words used here</h3>
          <dl className="glossary">
            {GLOSSARY.map((g) => (<div key={g.term}><dt>{g.term}</dt><dd>{g.text}</dd></div>))}
          </dl>
        </section>

        <section>
          <h3>Methods and data</h3>
          {METHODS.map((m) => (<div key={m.heading} className="method"><h4>{m.heading}</h4><p>{m.text}</p></div>))}
          <h4>Sources</h4>
          <ul className="sources">
            {SOURCES.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>)}
          </ul>
        </section>
      </div>
    </dialog>
  );
}
