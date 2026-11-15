import { useState } from 'react';
import { currentQuery } from '../lib/useUrlSync';
import { useStore } from '../store';
import { HelpDrawer } from './HelpDrawer';

export function Header() {
  const hasSites = useStore((s) => s.scenarios.length > 0);
  const noteEvent = useStore((s) => s.noteEvent);
  const [copied, setCopied] = useState<'idle' | 'done' | 'manual'>('idle');
  const [link, setLink] = useState('');
  const [help, setHelp] = useState(false);

  const share = async () => {
    const url = `${location.origin}${location.pathname}?${currentQuery()}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied('done');
      setTimeout(() => setCopied('idle'), 2000);
    } catch {
      setLink(url);
      setCopied('manual');
    }
    noteEvent('link-copied');
  };

  return (
    <header className="header">
      <div className="brand">
        <h1>Lunar Landing Site Navigator</h1>
        <p>Compare landing sites and dates by when they get sunlight and can see Earth.</p>
      </div>
      <span className="spacer" />
      <span className="share-wrap">
        <button className="ghost" data-tour="share" disabled={!hasSites} onClick={share}>
          {copied === 'done' ? 'Link copied' : 'Share'}
        </button>
        <span className="sr-only" role="status">{copied === 'done' ? 'Link to this comparison copied' : ''}</span>
        {copied === 'manual' && (
          <input className="share-field" readOnly value={link} aria-label="Link to this comparison"
                 ref={(el) => el?.select()} onBlur={() => setCopied('idle')} />
        )}
      </span>
      <button className="ghost" data-tour="help" onClick={() => setHelp(true)}>Help</button>
      <HelpDrawer open={help} onClose={() => setHelp(false)} />
    </header>
  );
}
