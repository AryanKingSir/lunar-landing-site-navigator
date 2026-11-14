import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({ fetchScenario: vi.fn(), fetchSites: vi.fn(), pingHealth: vi.fn() }));

import { fetchScenario, fetchSites, pingHealth } from './api';
import { DAY_MS } from './lib/time';
import { useStore } from './store';
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
const sc = (id: string, days: number) => ({ ...base, id, days, color: '#fff', loading: false });

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
