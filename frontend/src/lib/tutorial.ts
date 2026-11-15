import type { View } from './urlState';

export type TaskId = 'pick-site' | 'earth-rise' | 'open-terrain' | 'add-crater' | 'land-later' | 'read-timeline' | 'open-numbers' | 'share';
export type TutorialTask = { id: TaskId; title: string; instruction: string; lesson: string; target: string };

export const TASKS: TutorialTask[] = [
  { id: 'pick-site', title: 'Pick a site', target: 'chips',
    instruction: 'Two sites are loaded: Connecting Ridge near the south pole, and Apollo 11 near the equator. Click the Apollo 11 chip to look at it.',
    lesson: 'At the equator the Sun climbs high overhead. At the pole it never rises more than about 2° above the horizon, so it skims around the skyline.' },
  { id: 'earth-rise', title: 'Watch Earth rise', target: 'timebar',
    instruction: 'Click Connecting Ridge again, then drag the time slider (or press Play) until Earth comes into view.',
    lesson: 'Earth hangs almost still in the lunar sky, but a monthly wobble called libration lifts it above the ridges and hides it again. That opens and closes the radio link.' },
  { id: 'open-terrain', title: 'See the terrain', target: 'tab-terrain',
    instruction: 'Open the 3D terrain tab and drag to look around.',
    lesson: 'With the Sun this low, a distant ridge a few hundred metres taller than you can cast a shadow for days. Terrain decides where there is power.' },
  { id: 'add-crater', title: 'Add a dark crater', target: 'add-site',
    instruction: 'Add the site "Shackleton crater floor".',
    lesson: 'Shackleton’s rim is one of the sunniest places on the Moon. Its floor, about 4 km below, has not seen the Sun in billions of years. A few kilometres change everything.' },
  { id: 'land-later', title: 'Land a month later', target: 'chip-menu',
    instruction: 'Open the menu on the Connecting Ridge chip and choose "Land a month later".',
    lesson: 'Launches slip. The same spot can be sunlit all month in one season and dark half the time in another, so every date change needs a fresh look.' },
  { id: 'read-timeline', title: 'Read the timeline', target: 'tab-timeline',
    instruction: 'Open the Timeline tab and click anywhere on it to jump to that moment.',
    lesson: 'A radio link needs both ends: Earth must be above the terrain, and an antenna in California, Spain or Australia must be able to see the Moon.' },
  { id: 'open-numbers', title: 'Check the numbers', target: 'tab-numbers',
    instruction: 'Open the All numbers tab.',
    lesson: 'Everything here comes from NASA terrain data and the JPL ephemeris. Hover a row name to see what it means, or download the data as CSV.' },
  { id: 'share', title: 'Share your comparison', target: 'share',
    instruction: 'Press Share to copy a link to exactly what you see.',
    lesson: 'That’s the tour. Help has a glossary and a page on methods and data.' },
];

export type Snapshot = {
  activeId: string | null; view: View; offsetMs: number; events: Record<string, number>;
  scenarios: { id: string; siteId: string | null; start: string; earthVisibleNow: boolean | null }[];
};

const count = (s: Snapshot, k: string) => s.events[k] ?? 0;

/** Tasks that the change from `prev` to `next` has just completed (never ones already completed). */
export function newlyCompleted(prev: Snapshot, next: Snapshot, completed: readonly string[]): TaskId[] {
  const done: TaskId[] = [];
  const add = (id: TaskId, ok: boolean) => { if (ok && !completed.includes(id)) done.push(id); };
  add('pick-site', prev.activeId !== null && next.activeId !== null && prev.activeId !== next.activeId);
  const act = next.scenarios.find((x) => x.id === next.activeId);
  const before = prev.scenarios.find((x) => x.id === next.activeId);
  add('earth-rise', !!act && act.siteId === 'connecting-ridge' && next.offsetMs > 0 && act.earthVisibleNow === true
    && (before?.earthVisibleNow !== true || prev.offsetMs !== next.offsetMs || prev.activeId !== next.activeId));
  add('open-terrain', next.view === 'terrain' && prev.view !== 'terrain');
  add('add-crater', next.scenarios.some((x) => x.siteId === 'shackleton-floor') && !prev.scenarios.some((x) => x.siteId === 'shackleton-floor'));
  add('land-later', next.scenarios.length > prev.scenarios.length
    && next.scenarios.some((a, i) => next.scenarios.some((b, j) => i !== j && a.siteId !== null && a.siteId === b.siteId && a.start !== b.start)));
  add('read-timeline', next.view === 'timeline' && count(next, 'timeline-seek') > count(prev, 'timeline-seek'));
  add('open-numbers', next.view === 'numbers' && prev.view !== 'numbers');
  add('share', count(next, 'link-copied') > count(prev, 'link-copied'));
  return done;
}
