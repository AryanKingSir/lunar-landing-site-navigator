import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({ fetchScenario: vi.fn(), fetchSites: vi.fn(), pingHealth: vi.fn() }));

import { fetchScenario, fetchSites, pingHealth } from './api';
import { DAY_MS } from './lib/time';
import { useStore } from './store';
import { applyShareLink } from './lib/shareLink';
import type { Site } from './types';
import type { ScenarioResult } from './types';

const mockFetch = vi.mocked(fetchScenario);
const mockSites = vi.mocked(fetchSites);
const mockPing = vi.mocked(pingHealth);

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

const res = (tag: string) => ({ tag }) as unknown as ScenarioResult;
const base = { label: 'x', siteId: null, lat: -89, lon: 0, start: '2026-12-01T00:00:00Z' };
const sc = (id: string, days: number) => ({ ...base, id, days, tag: 'A' as const, color: '#fff', loading: false });

beforeEach(() => {
  mockFetch.mockReset();
  mockSites.mockReset();
  mockPing.mockReset();
  useStore.setState({ scenarios: [], activeId: null, offsetMs: 0, playing: false, server: 'checking', sitesError: null });
});

describe('runScenario', () => {
  it('ignores a stale response that resolves after a newer one', async () => {
    const first = deferred<ScenarioResult>();
    const second = deferred<ScenarioResult>();
    mockFetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    useStore.setState({ scenarios: [sc('s1', 10)] });

    const p1 = useStore.getState().runScenario('s1');
    const p2 = useStore.getState().runScenario('s1');
    second.resolve(res('B'));
    await p2;
    first.resolve(res('A'));
    await p1;

    expect(useStore.getState().scenarios[0].result).toEqual(res('B'));
    expect(useStore.getState().scenarios[0].loading).toBe(false);
  });
});

describe('removeScenario', () => {
  it('re-clamps offset and stops playback when the longest scenario is removed', () => {
    useStore.setState({ scenarios: [sc('a', 30), sc('b', 10)], activeId: 'a' });
    useStore.getState().setOffset(20 * DAY_MS);
    useStore.setState({ playing: true });
    useStore.getState().removeScenario('a');
    expect(useStore.getState().offsetMs).toBe(10 * DAY_MS);
    expect(useStore.getState().playing).toBe(false);
  });

  it('sets offset to 0 when the last scenario is removed', () => {
    useStore.setState({ scenarios: [sc('a', 30)], activeId: 'a' });
    useStore.getState().setOffset(5 * DAY_MS);
    useStore.getState().removeScenario('a');
    expect(useStore.getState().offsetMs).toBe(0);
  });
});

describe('loadSites', () => {
  it('sets sitesError on failure and clears it on success', async () => {
    mockSites.mockRejectedValueOnce(new Error('boom'));
    await useStore.getState().loadSites();
    expect(useStore.getState().sitesError).toBe('boom');
    expect(useStore.getState().sites).toEqual([]);
    mockSites.mockResolvedValueOnce([{ id: 'a' }] as never);
    await useStore.getState().loadSites();
    expect(useStore.getState().sitesError).toBeNull();
    expect(useStore.getState().sites).toHaveLength(1);
  });
});

describe('wakeServer', () => {
  afterEach(() => vi.useRealTimers());

  it("sets 'ok' when the first ping succeeds", async () => {
    mockPing.mockResolvedValueOnce(true);
    await useStore.getState().wakeServer();
    expect(useStore.getState().server).toBe('ok');
  });

  it("goes 'waking' then 'ok' when pings fail then succeed", async () => {
    vi.useFakeTimers();
    mockPing.mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const p = useStore.getState().wakeServer();
    await vi.advanceTimersByTimeAsync(0);
    expect(useStore.getState().server).toBe('waking');
    await vi.advanceTimersByTimeAsync(5000);
    expect(useStore.getState().server).toBe('waking');
    await vi.advanceTimersByTimeAsync(5000);
    await p;
    expect(useStore.getState().server).toBe('ok');
  });

  it("goes 'down' after 90 seconds of failures", async () => {
    vi.useFakeTimers();
    mockPing.mockResolvedValue(false);
    const p = useStore.getState().wakeServer();
    await vi.advanceTimersByTimeAsync(90_000);
    await p;
    expect(useStore.getState().server).toBe('down');
  });

  it('runs only one wake loop at a time', async () => {
    mockPing.mockResolvedValue(true);
    await Promise.all([useStore.getState().wakeServer(), useStore.getState().wakeServer()]);
    expect(mockPing).toHaveBeenCalledTimes(1);
  });
});

describe('retryAll', () => {
  it('re-runs only scenarios that have an error', async () => {
    mockPing.mockResolvedValue(true);
    mockSites.mockResolvedValue([]);
    mockFetch.mockResolvedValue(res('ok'));
    useStore.setState({ scenarios: [{ ...sc('good', 10), result: res('keep') }, { ...sc('bad', 10), error: 'x' }] });
    await useStore.getState().retryAll();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [good, bad] = useStore.getState().scenarios;
    expect(good.result).toEqual(res('keep'));
    expect(bad.result).toEqual(res('ok'));
    expect(bad.error).toBeUndefined();
  });
});

describe('start and seedDefaults', () => {
  afterEach(() => vi.useRealTimers());
  const sites = [{ id: 'connecting-ridge', name: 'Connecting Ridge', lat: -89.4, lon: 222 }, { id: 'apollo11', name: 'Apollo 11', lat: 0.67, lon: 23.47 }];
  const ids = () => useStore.getState().scenarios.map((x) => x.siteId);

  beforeEach(() => {
    useStore.setState({ sites: [] });
    mockFetch.mockResolvedValue(res('ok'));
  });

  it('start() seeds the two default scenarios when ping and sites succeed', async () => {
    mockPing.mockResolvedValue(true);
    mockSites.mockResolvedValue(sites as never);
    await useStore.getState().start();
    expect(ids()).toEqual(['connecting-ridge', 'apollo11']);
  });

  it('start() while the server wakes loads sites and seeds without retryAll', async () => {
    vi.useFakeTimers();
    mockPing.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mockSites.mockResolvedValue(sites as never);
    const p = useStore.getState().start();
    await vi.advanceTimersByTimeAsync(5000);
    await p;
    expect(useStore.getState().server).toBe('ok');
    expect(ids()).toEqual(['connecting-ridge', 'apollo11']);
  });

  it("goes 'down' with no scenarios after 90 s, then retryAll recovers fully", async () => {
    vi.useFakeTimers();
    mockPing.mockResolvedValue(false);
    const p = useStore.getState().start();
    await vi.advanceTimersByTimeAsync(95_000);
    await p;
    expect(useStore.getState().server).toBe('down');
    expect(useStore.getState().scenarios).toHaveLength(0);
    mockPing.mockResolvedValue(true);
    mockSites.mockResolvedValue(sites as never);
    await useStore.getState().retryAll();
    expect(useStore.getState().sitesError).toBeNull();
    expect(useStore.getState().sites).toHaveLength(2);
    expect(ids()).toEqual(['connecting-ridge', 'apollo11']);
  });

  it('seedDefaults() twice still gives exactly two scenarios', () => {
    useStore.setState({ sites: sites as never });
    useStore.getState().seedDefaults();
    useStore.getState().seedDefaults();
    expect(useStore.getState().scenarios).toHaveLength(2);
  });

  it("slow pings (4 s each) still end 'down' at about 90 s", async () => {
    vi.useFakeTimers();
    mockPing.mockImplementation(() => new Promise((r) => setTimeout(() => r(false), 4000)));
    let done = false;
    const p = useStore.getState().wakeServer().then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(100_000);
    await p;
    expect(done).toBe(true);
    expect(useStore.getState().server).toBe('down');
  });
});

const seedOf = (): Parameters<typeof applyShareLink>[2] => {
  const g = useStore.getState();
  return { addScenario: g.addScenario, getIds: () => useStore.getState().scenarios.map((x) => x.id),
    setView: g.setView, setActive: g.setActive, setOffset: g.setOffset };
};
const site = (id: string, name: string, lat: number, lon: number) => ({ id, name, lat, lon }) as unknown as Site;
const SITES = [site('connecting-ridge', 'Connecting Ridge', -89.4, 222), site('apollo11', 'Apollo 11', 0.67, 23.47), site('shackleton-floor', 'Shackleton floor', -89.9, 0)];

describe('tags, view, events, tutorial', () => {
  beforeEach(() => { mockFetch.mockResolvedValue(res('r')); useStore.setState({ view: 'sky', events: {} }); });
  const add = (l: string) => useStore.getState().addScenario({ ...base, label: l, days: 10 });
  it('assigns A-D with colours and reuses the first free tag', () => {
    ['a', 'b', 'c'].forEach(add);
    const sc = useStore.getState().scenarios;
    expect(sc.map((x) => x.tag)).toEqual(['A', 'B', 'C']);
    expect(sc.map((x) => x.color)).toEqual(['#6a4c93', '#a8443a', '#a8457f']);
    useStore.getState().removeScenario(sc[1].id);
    add('d');
    const after = useStore.getState().scenarios;
    expect(after.map((x) => x.tag)).toEqual(['A', 'C', 'B']);
    expect(after[2].color).toBe('#a8443a');
  });
  it('setView and noteEvent', () => {
    useStore.getState().setView('timeline');
    expect(useStore.getState().view).toBe('timeline');
    useStore.getState().noteEvent('link-copied');
    useStore.getState().noteEvent('link-copied');
    expect(useStore.getState().events['link-copied']).toBe(2);
  });
  it('tutorial actions', () => {
    const g = useStore.getState();
    g.openTutorial(); g.completeTask('share'); g.completeTask('share');
    expect(useStore.getState().tutorial).toMatchObject({ open: true, completed: ['share'] });
    g.closeTutorial();
    expect(useStore.getState().tutorial).toMatchObject({ open: false, dismissed: true });
    g.resetTutorial();
    expect(useStore.getState().tutorial).toMatchObject({ completed: [], dismissed: false });
  });
  it('startTutorial resets to the two example sites, the sky view and day 0', () => {
    useStore.setState({ sites: SITES });
    useStore.getState().addScenario({ ...base, label: 'Apollo 11', siteId: 'apollo11', days: 10 });
    useStore.setState({ view: 'numbers', offsetMs: 5e8 });
    useStore.getState().startTutorial();
    const st = useStore.getState();
    expect(st.tutorial).toMatchObject({ open: true, completed: [] });
    expect(st.view).toBe('sky');
    expect(st.offsetMs).toBe(0);
    expect(st.scenarios.map((x) => x.siteId)).toEqual(SITES.filter((x) => ['connecting-ridge', 'apollo11'].includes(x.id)).map((x) => x.id).sort((a, b) => (a === 'connecting-ridge' ? -1 : b === 'connecting-ridge' ? 1 : 0)));
  });
  it('duplicateShifted keeps the place name as the label and moves the start', () => {
    useStore.setState({ sites: SITES });
    useStore.getState().addScenario({ ...base, label: 'Apollo 11', siteId: 'apollo11', days: 10 });
    useStore.getState().duplicateShifted(useStore.getState().scenarios[0].id, 30);
    expect(useStore.getState().scenarios[1].label).toBe('Apollo 11');
    expect(useStore.getState().scenarios[1].start).toBe('2026-12-31T00:00:00Z');
  });
  it('duplicating a custom spot twice does not pile dates into the label', () => {
    useStore.getState().addScenario({ ...base, label: 'Custom -87.5°, 45°', days: 10 });
    useStore.getState().duplicateShifted(useStore.getState().scenarios[0].id, 30);
    useStore.getState().duplicateShifted(useStore.getState().scenarios[1].id, 30);
    expect(useStore.getState().scenarios.map((x) => x.label)).toEqual(['Custom -87.5°, 45°', 'Custom -87.5°, 45°', 'Custom -87.5°, 45°']);
  });
  it('updateScenario clears the old result, re-runs and re-clamps the offset', async () => {
    add('a');
    await vi.waitFor(() => expect(useStore.getState().scenarios[0].result).toBeDefined());
    const id = useStore.getState().scenarios[0].id;
    useStore.getState().setOffset(9 * DAY_MS);
    const d = deferred<ScenarioResult>();
    mockFetch.mockReturnValueOnce(d.promise);
    useStore.getState().updateScenario(id, { days: 3, start: '2027-01-01T00:00:00Z' });
    const s = useStore.getState().scenarios[0];
    expect(s.result).toBeUndefined();
    expect(s.loading).toBe(true);
    expect([s.days, s.start]).toEqual([3, '2027-01-01T00:00:00Z']);
    expect(useStore.getState().offsetMs).toBe(3 * DAY_MS);
    expect(mockFetch).toHaveBeenLastCalledWith(expect.objectContaining({ start: '2027-01-01T00:00:00Z', end: '2027-01-04T00:00:00Z' }));
    d.resolve(res('new'));
    await vi.waitFor(() => expect(useStore.getState().scenarios[0].result).toEqual(res('new')));
  });
});

describe('share link restore', () => {
  beforeEach(() => { mockFetch.mockReturnValue(new Promise(() => {})); useStore.setState({ view: 'sky', sites: SITES }); });
  const q = '?s=shackleton-floor@2027-03-15T00:00~10;c_-87.5_45@2027-03-15T00:00~10&v=timeline&a=1&t=48';
  it('applies scenarios, view, active and time before any result arrives', () => {
    expect(applyShareLink(q, SITES, seedOf())).toBe(true);
    const s = useStore.getState();
    expect(s.scenarios.map((x) => x.label)).toEqual(['Shackleton floor', 'Custom -87.5°, 45°']);
    expect(s.scenarios.every((x) => !x.result)).toBe(true);
    expect(s.view).toBe('timeline');
    expect(s.activeId).toBe(s.scenarios[1].id);
    expect(s.offsetMs).toBe(2 * DAY_MS);
  });
  it('clamps a time beyond the requested days', () => {
    applyShareLink('?s=apollo11@2027-03-15T00:00~3&t=500', SITES, seedOf());
    expect(useStore.getState().offsetMs).toBe(3 * DAY_MS);
  });
  it('returns false and changes nothing for a broken link', () => {
    expect(applyShareLink('?s=nonsense', SITES, seedOf())).toBe(false);
    expect(useStore.getState().scenarios).toEqual([]);
  });
  it('seedDefaults falls back to the two defaults without a location', () => {
    useStore.getState().seedDefaults();
    expect(useStore.getState().scenarios.map((x) => x.siteId)).toEqual(['connecting-ridge', 'apollo11']);
  });
});
