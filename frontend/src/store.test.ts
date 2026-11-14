import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({ fetchScenario: vi.fn(), fetchSites: vi.fn() }));

import { fetchScenario } from './api';
import { DAY_MS } from './lib/time';
import { useStore } from './store';
import type { ScenarioResult } from './types';

const mockFetch = vi.mocked(fetchScenario);

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
  useStore.setState({ scenarios: [], activeId: null, offsetMs: 0, playing: false });
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
