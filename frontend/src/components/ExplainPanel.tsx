import { useState } from 'react';
import { DEFAULT_START, SYNODIC_DAYS, useStore } from '../store';

function showSites(ids: string[]) {
  const st = useStore.getState();
  st.scenarios.forEach((s) => st.removeScenario(s.id));
  for (const id of ids) {
    const s = st.sites.find((x) => x.id === id);
    if (s) useStore.getState().addScenario({ label: s.name, siteId: s.id, lat: s.lat, lon: s.lon, start: DEFAULT_START, days: 30 });
  }
}

const STEPS: { title: string; body: string; action?: { label: string; run: () => void } }[] = [
  { title: 'The Sun skims the horizon',
    body: 'At the south pole the Sun circles the whole sky only about 1.5° up. A ridge 50 km away that is a few hundred metres taller than you can block it for days. That is why terrain decides power here.',
    action: { label: 'Show Connecting Ridge vs Apollo 11', run: () => showSites(['connecting-ridge', 'apollo11']) } },
  { title: 'Same neighbourhood, opposite fates',
    body: 'Shackleton’s rim is one of the sunniest places on the Moon. Its floor, 4 km below, has not seen the Sun in billions of years. Moving a few kilometres changes everything.',
    action: { label: 'Compare Chang’e-7 rim target vs Shackleton floor', run: () => showSites(['change7-target', 'shackleton-floor']) } },
  { title: 'Earth bobs on the horizon',
    body: 'Earth hangs almost fixed in the lunar sky, but libration makes it wobble by about ±7° each month. At the pole that wobble lifts Earth above the ridges or hides it, opening and closing direct-to-Earth radio windows.' },
  { title: 'A link needs both ends',
    body: 'Even with Earth in view, a Deep Space Network antenna in California, Spain or Australia must also see the Moon. DTE windows in the timeline show both conditions together.' },
  { title: 'What if the launch slips?',
    body: 'Use “Slip +1 lunation” on a scenario card to land 29.5 days later at the same site. Lighting at the pole also changes with the lunar seasons, so the same site can look very different a month later.',
    action: { label: 'Slip the first scenario by one lunation', run: () => { const s = useStore.getState().scenarios[0]; if (s) useStore.getState().duplicateShifted(s.id, SYNODIC_DAYS); } } },
];

export function ExplainPanel() {
  const [k, setK] = useState(0);
  const toggleExplain = useStore((s) => s.toggleExplain);
  const step = STEPS[k];
  return (
    <section className="panel explain">
      <h2>Why the south pole is hard · {k + 1}/{STEPS.length}</h2>
      <h3 style={{ margin: '0 0 4px' }}>{step.title}</h3>
      <p style={{ margin: '0 0 8px' }}>{step.body}</p>
      <div className="steps">
        <button disabled={k === 0} onClick={() => setK(k - 1)}>Back</button>
        <button disabled={k === STEPS.length - 1} onClick={() => setK(k + 1)}>Next</button>
        {step.action && <button className="primary" onClick={step.action.run}>{step.action.label}</button>}
        <span style={{ flex: 1 }} />
        <button onClick={toggleExplain}>Close</button>
      </div>
    </section>
  );
}
