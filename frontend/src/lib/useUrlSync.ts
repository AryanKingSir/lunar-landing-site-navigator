import { useEffect } from 'react';
import { useStore } from '../store';
import { encodeState } from './urlState';

export const URL_THROTTLE_MS = 500;

/** Writes the current state to the address bar as it changes (throttled, not while playing). */
export function useUrlSync(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let last = 0;
    const write = () => {
      timer = null;
      const s = useStore.getState();
      if (s.playing || s.scenarios.length === 0) return;
      last = Date.now();
      const qs = encodeState({
        scenarios: s.scenarios.map((x) => ({ siteId: x.siteId, lat: x.lat, lon: x.lon, start: x.start, days: x.days })),
        offsetMs: s.offsetMs, view: s.view,
        active: Math.max(0, s.scenarios.findIndex((x) => x.id === s.activeId)),
      });
      history.replaceState(null, '', `${location.pathname}?${qs}${location.hash}`);
    };
    const schedule = () => {
      if (timer) return;
      timer = setTimeout(write, Math.max(0, URL_THROTTLE_MS - (Date.now() - last)));
    };
    const unsub = useStore.subscribe(schedule);
    schedule();
    return () => { unsub(); if (timer) clearTimeout(timer); };
  }, []);
}
