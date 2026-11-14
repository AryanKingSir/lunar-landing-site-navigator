import { create } from 'zustand';
import { fetchScenario, fetchSites, pingHealth } from './api';
import { dateLabel } from './lib/format';
import { applyShareLink } from './lib/shareLink';
import { addDaysIso, DAY_MS } from './lib/time';
import type { View } from './lib/urlState';
import type { PanelMode, ScenarioResult, Site } from './types';

export const SYNODIC_DAYS = 29.53;
export const MAX_SCENARIOS = 4;
export const DEFAULT_START = '2026-12-01T00:00:00Z';
export type { View };
const TAGS = ['A', 'B', 'C', 'D'] as const;
const COLORS = ['#6a4c93', '#a8443a', '#a8457f', '#3f4750'];
export type Tag = (typeof TAGS)[number];

export type ServerStatus = 'checking' | 'waking' | 'ok' | 'down';
const WAKE_RETRY_MS = 5000;
const WAKE_WINDOW_MS = 90_000;

export type Scenario = {
  id: string; label: string; siteId: string | null; lat: number; lon: number;
  start: string; days: number; tag: Tag; color: string; loading: boolean; error?: string; result?: ScenarioResult;
};
export type Tutorial = { open: boolean; completed: string[] };
export type NewScenario = Pick<Scenario, 'label' | 'siteId' | 'lat' | 'lon' | 'start' | 'days'>;

type State = {
  sites: Site[]; scenarios: Scenario[]; activeId: string | null; offsetMs: number;
  playing: boolean; speedHoursPerSec: number; explain: boolean; panelMode: PanelMode; exaggeration: number;
  server: ServerStatus; sitesError: string | null;
  view: View; setView: (v: View) => void;
  updateScenario: (id: string, patch: Partial<Pick<Scenario, 'start' | 'days'>>) => void;
  events: Record<string, number>; noteEvent: (name: 'timeline-seek' | 'link-copied') => void;
  tutorial: Tutorial;
  openTutorial: () => void; closeTutorial: () => void; completeTask: (id: string) => void; resetTutorial: () => void;
  wakeServer: () => Promise<void>;
  start: () => Promise<void>;
  seedDefaults: () => void;
  retryAll: () => Promise<void>;
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
let wakeLoop: Promise<void> | null = null;
const latestRequest = new Map<string, number>();

export const useStore = create<State>((set, get) => {
  const patch = (id: string, p: Partial<Scenario>) =>
    set((st) => ({ scenarios: st.scenarios.map((x) => (x.id === id ? { ...x, ...p } : x)) }));

  return {
    sites: [], scenarios: [], activeId: null, offsetMs: 0, playing: false,
    speedHoursPerSec: 6, explain: false, panelMode: 'vertical-tracking', exaggeration: 1,

    server: 'checking', sitesError: null,
    view: 'sky', events: {}, tutorial: { open: false, completed: [] },
    setView: (v) => set({ view: v }),
    noteEvent: (name) => set((st) => ({ events: { ...st.events, [name]: (st.events[name] ?? 0) + 1 } })),
    openTutorial: () => set((st) => ({ tutorial: { ...st.tutorial, open: true } })),
    closeTutorial: () => set((st) => ({ tutorial: { ...st.tutorial, open: false } })),
    completeTask: (id) =>
      set((st) => (st.tutorial.completed.includes(id) ? st : { tutorial: { ...st.tutorial, completed: [...st.tutorial.completed, id] } })),
    resetTutorial: () => set({ tutorial: { open: false, completed: [] } }),

    wakeServer: () => {
      if (wakeLoop) return wakeLoop;
      wakeLoop = (async () => {
        try {
          set({ server: 'checking' });
          if (await pingHealth()) { set({ server: 'ok' }); return; }
          set({ server: 'waking' });
          const deadline = Date.now() + WAKE_WINDOW_MS;
          while (Date.now() < deadline) {
            await new Promise((r) => setTimeout(r, WAKE_RETRY_MS));
            if (await pingHealth()) { set({ server: 'ok' }); return; }
          }
          set({ server: 'down' });
        } finally {
          wakeLoop = null;
        }
      })();
      return wakeLoop;
    },

    start: async () => {
      await get().wakeServer();
      if (get().server !== 'ok') return;
      await get().loadSites();
      if (!get().sitesError) get().seedDefaults();
    },

    seedDefaults: () => {
      const { sites, scenarios, addScenario } = get();
      if (sites.length === 0 || scenarios.length > 0) return;
      const search = typeof location === 'undefined' ? '' : location.search;
      const restored = applyShareLink(search, sites, {
        addScenario, getIds: () => get().scenarios.map((x) => x.id),
        setView: get().setView, setActive: get().setActive, setOffset: get().setOffset,
      });
      if (restored) return;
      for (const id of ['connecting-ridge', 'apollo11']) {
        const s = sites.find((x) => x.id === id);
        if (s) addScenario({ label: s.name, siteId: s.id, lat: s.lat, lon: s.lon, start: DEFAULT_START, days: 30 });
      }
    },

    retryAll: async () => {
      await get().start();
      await Promise.all(get().scenarios.filter((x) => x.error).map((x) => get().runScenario(x.id)));
    },

    loadSites: async () => {
      try {
        set({ sites: await fetchSites(), sitesError: null });
      } catch (e) {
        set({ sitesError: (e as Error).message });
      }
    },

    addScenario: (s) => {
      if (get().scenarios.length >= MAX_SCENARIOS) return;
      const used = new Set(get().scenarios.map((x) => x.tag));
      const tag = TAGS.find((t) => !used.has(t)) ?? TAGS[0];
      const color = COLORS[TAGS.indexOf(tag)];
      const id = `sc${++counter}`;
      set((st) => ({ scenarios: [...st.scenarios, { ...s, id, tag, color, loading: true }], activeId: st.activeId ?? id }));
      void get().runScenario(id);
    },

    duplicateShifted: (id, days) => {
      const sc = get().scenarios.find((x) => x.id === id);
      if (!sc) return;
      get().addScenario({
        label: `${get().sites.find((x) => x.id === sc.siteId)?.name ?? sc.label}, ${dateLabel(addDaysIso(sc.start, days))}`, siteId: sc.siteId, lat: sc.lat, lon: sc.lon,
        start: addDaysIso(sc.start, days), days: sc.days,
      });
    },

    updateScenario: (id, p) => {
      if (!get().scenarios.some((x) => x.id === id)) return;
      set((st) => {
        const scenarios = st.scenarios.map((x) =>
          x.id === id ? { ...x, ...p, result: undefined, error: undefined, loading: true } : x);
        const offsetMs = Math.min(st.offsetMs, maxDurationMs({ scenarios }));
        return { scenarios, offsetMs, ...(offsetMs !== st.offsetMs ? { playing: false } : {}) };
      });
      void get().runScenario(id);
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
