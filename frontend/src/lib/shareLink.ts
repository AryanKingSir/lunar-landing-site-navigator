import { decodeState, type View } from './urlState';
import type { NewScenario } from '../store';
import type { Site } from '../types';

export type ShareActions = {
  addScenario: (s: NewScenario) => void;
  getIds: () => string[];
  setView: (v: View) => void;
  setActive: (id: string) => void;
  setOffset: (ms: number) => void;
};

const num = (v: number) => String(Number(v.toFixed(4)));

/** Decode a share link and apply it. Returns false when there is nothing valid to apply. */
export function applyShareLink(search: string, sites: Site[], a: ShareActions): boolean {
  const state = decodeState(search, sites);
  if (!state) return false;
  for (const sc of state.scenarios) {
    const site = sc.siteId ? sites.find((x) => x.id === sc.siteId) : undefined;
    a.addScenario({
      label: site ? site.name : `Custom ${num(sc.lat)}°, ${num(sc.lon)}°`,
      siteId: sc.siteId, lat: sc.lat, lon: sc.lon, start: sc.start, days: sc.days,
    });
  }
  a.setView(state.view);
  const id = a.getIds()[state.active];
  if (id) a.setActive(id);
  // setOffset clamps to each scenario's requested days (not loaded results), so this
  // is safe before any result arrives.
  a.setOffset(state.offsetMs);
  return true;
}
