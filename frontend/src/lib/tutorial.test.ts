import { describe, expect, it } from 'vitest';
import { newlyCompleted, TASKS, type Snapshot } from './tutorial';

const CR = { id: 'a', siteId: 'connecting-ridge', start: '2026-12-01T00:00:00Z', earthVisibleNow: false };
const AP = { id: 'b', siteId: 'apollo11', start: '2026-12-01T00:00:00Z', earthVisibleNow: true };
const base: Snapshot = { activeId: 'a', view: 'sky', offsetMs: 0, events: {}, scenarios: [CR, AP] };
const run = (next: Partial<Snapshot>, prev: Snapshot = base, done: string[] = []) => newlyCompleted(prev, { ...prev, ...next }, done);

describe('newlyCompleted', () => {
  it('pick-site', () => {
    expect(run({ activeId: 'b' })).toContain('pick-site');
    expect(run({ view: 'terrain' })).not.toContain('pick-site');
  });
  it('earth-rise only at Connecting Ridge once Earth is visible after moving time', () => {
    expect(run({ offsetMs: 15e8, scenarios: [{ ...CR, earthVisibleNow: true }, AP] })).toContain('earth-rise');
    expect(run({ offsetMs: 15e8 })).not.toContain('earth-rise');
    expect(run({ activeId: 'b', offsetMs: 15e8 })).not.toContain('earth-rise');
  });
  it('open-terrain and open-numbers on entering the tab', () => {
    expect(run({ view: 'terrain' })).toContain('open-terrain');
    expect(run({ view: 'terrain' }, { ...base, view: 'terrain' })).not.toContain('open-terrain');
    expect(run({ view: 'numbers' })).toContain('open-numbers');
    expect(run({ view: 'timeline' })).not.toContain('open-numbers');
  });
  it('add-crater', () => {
    const SH = { id: 'c', siteId: 'shackleton-floor', start: CR.start, earthVisibleNow: false };
    expect(run({ scenarios: [CR, AP, SH] })).toContain('add-crater');
    expect(run({ scenarios: [CR, AP, { ...SH, siteId: 'malapert-massif' }] })).not.toContain('add-crater');
  });
  it('land-later needs the same site on a different date', () => {
    expect(run({ scenarios: [CR, AP, { ...CR, id: 'c', start: '2026-12-30T12:43:00Z' }] })).toContain('land-later');
    expect(run({ scenarios: [CR, AP, { ...CR, id: 'c' }] })).not.toContain('land-later');
  });
  it('read-timeline needs a click on the timeline tab', () => {
    expect(run({ view: 'timeline', events: { 'timeline-seek': 1 } })).toContain('read-timeline');
    expect(run({ view: 'timeline' })).not.toContain('read-timeline');
  });
  it('share', () => {
    expect(run({ events: { 'link-copied': 1 } })).toContain('share');
    expect(run({})).not.toContain('share');
  });
  it('never repeats a completed task', () => {
    expect(run({ activeId: 'b' }, base, ['pick-site'])).not.toContain('pick-site');
  });
});

describe('TASKS', () => {
  it('has 8 tasks with unique ids, text and known anchors', () => {
    const anchors = ['chips', 'add-site', 'chip-menu', 'summary', 'tabs', 'tab-terrain', 'tab-timeline', 'tab-numbers', 'stage', 'timebar', 'share', 'help'];
    expect(TASKS).toHaveLength(8);
    expect(new Set(TASKS.map((t) => t.id)).size).toBe(8);
    for (const t of TASKS) {
      expect(t.title && t.instruction && t.lesson).toBeTruthy();
      expect(anchors).toContain(t.target);
    }
  });
});
