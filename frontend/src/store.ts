import { create } from 'zustand';
import { fetchScenario, fetchSites } from './api';
import { addDaysIso, DAY_MS } from './lib/time';
import type { PanelMode, ScenarioResult, Site } from './types';

export const SYNODIC_DAYS = 29.53;
export const MAX_SCENARIOS = 4;
export const DEFAULT_START = '2026-12-01T00:00:00Z';
const COLORS = ['#c77dff', '#2ec4b6', '#ff6b6b', '#e9ecef'];

export type Scenario = {
  id: string; label: string; siteId: string | null; lat: number; lon: number;
  start: string; days: number; color: string; loading: boolean; error?: string; result?: ScenarioResult;
};
export type NewScenario = Pick<Scenario, 'label' | 'siteId' | 'lat' | 'lon' | 'start' | 'days'>;

type State = {
  sites: Site[]; scenarios: Scenario[]; activeId: string | null; offsetMs: number;
  playing: boolean; speedHoursPerSec: number; explain: boolean; panelMode: PanelMode; exaggeration: number;
  loadSites: () => Promise<void>;
  addScenario: (s: NewScenario) => void;
  duplicateShifted: (id: string, days: number) => void;
  removeScenario: (id: string) => void;
  setActive: (id: string) => void;
  setOffset: (ms: number) => void;
  setPlaying: (p: boolean) => void;
  setSpeed: (h: number) => void;
  toggleExplain: () => void;
  setPanelMode: (m: PanelMode) => void;
  setExaggeration: (x: number) => void;
  runScenario: (id: string) => Promise<void>;
};

let counter = 0;
const latestRequest = new Map<string, number>();

export const useStore = create<State>((set, get) => {
  const patch = (id: string, p: Partial<Scenario>) =>
    set((st) => ({ scenarios: st.scenarios.map((x) => (x.id === id ? { ...x, ...p } : x)) }));

  return {
    sites: [], scenarios: [], activeId: null, offsetMs: 0, playing: false,
    speedHoursPerSec: 6, explain: false, panelMode: 'vertical-tracking', exaggeration: 1,

    loadSites: async () => set({ sites: await fetchSites() }),

    addScenario: (s) => {
      if (get().scenarios.length >= MAX_SCENARIOS) return;
      const used = new Set(get().scenarios.map((x) => x.color));
      const color = COLORS.find((c) => !used.has(c)) ?? COLORS[0];
      const id = `sc${++counter}`;
      set((st) => ({ scenarios: [...st.scenarios, { ...s, id, color, loading: true }], activeId: st.activeId ?? id }));
      void get().runScenario(id);
    },

    duplicateShifted: (id, days) => {
      const sc = get().scenarios.find((x) => x.id === id);
      if (!sc) return;
      get().addScenario({
        label: `${sc.label} (+${days} d)`, siteId: sc.siteId, lat: sc.lat, lon: sc.lon,
        start: addDaysIso(sc.start, days), days: sc.days,
      });
    },

    removeScenario: (id) =>
      set((st) => {
        const scenarios = st.scenarios.filter((x) => x.id !== id);
        const offsetMs = Math.min(st.offsetMs, maxDurationMs({ scenarios }));
        return {
          scenarios,
          activeId: st.activeId === id ? (scenarios[0]?.id ?? null) : st.activeId,
          offsetMs,
          ...(offsetMs !== st.offsetMs ? { playing: false } : {}),
        };
      }),

    setActive: (id) => set({ activeId: id }),
    setOffset: (ms) => set({ offsetMs: Math.max(0, Math.min(ms, maxDurationMs(get()))) }),
    setPlaying: (p) => set({ playing: p }),
    setSpeed: (h) => set({ speedHoursPerSec: h }),
    toggleExplain: () => set((st) => ({ explain: !st.explain })),
    setPanelMode: (m) => {
      set({ panelMode: m });
      get().scenarios.forEach((s) => void get().runScenario(s.id));
    },
    setExaggeration: (x) => set({ exaggeration: x }),

    runScenario: async (id) => {
      const sc = get().scenarios.find((x) => x.id === id);
      if (!sc) return;
      const token = (latestRequest.get(id) ?? 0) + 1;
      latestRequest.set(id, token);
      patch(id, { loading: true, error: undefined });
      try {
        const result = await fetchScenario({
          lat: sc.lat, lon: sc.lon, start: sc.start, end: addDaysIso(sc.start, sc.days),
          step_min: sc.days > 30 ? 20 : 10, obs_h: 2, panel_mode: get().panelMode,
          panel_az: 0, area_m2: 1, efficiency: 0.3,
        });
        if (latestRequest.get(id) !== token) return;
        patch(id, { result, loading: false });
      } catch (e) {
        if (latestRequest.get(id) !== token) return;
        patch(id, { loading: false, error: (e as Error).message });
      }
    },
  };
});

export const activeScenario = (s: State) => s.scenarios.find((x) => x.id === s.activeId);
export const maxDurationMs = (s: Pick<State, 'scenarios'>) =>
  Math.max(0, ...s.scenarios.map((x) => x.days * DAY_MS));
