# Fixes, Redesign and Tutorial Implementation Plan (round 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the bugs found in team testing, add sharing/export/methods features, and replace the dense dashboard with a simple tabbed, plain-language interface plus an 8-task learn-by-doing tutorial.

**Architecture:** The FastAPI backend keeps its validated maths and response keys; it only gains a start-up cache warm and tighter rounding. The React frontend keeps its store, pure libs and memoised drawing code, but gets a new shell: site chips, a summary strip, one tabbed stage, a pinned time bar, a Help drawer and a tutorial side panel. New behaviour lives in small pure modules (`lib/*.ts`) written test-first.

**Tech Stack:** unchanged (FastAPI, Skyfield, numpy; React 19, Vite, TypeScript, zustand, three/r3f/drei, vitest). No new npm or pip dependencies. Font: Atkinson Hyperlegible Next (Google Fonts).

Spec: `docs/superpowers/specs/2026-11-14-redesign-fixes-tutorial-design.md`

## Global Constraints

- Backend response keys of `POST /api/scenario` and `GET /api/sites` must not change.
- Per-field zustand selectors only (`useStore((s) => s.x)`); never whole-store destructuring. Selectors must not build new objects/arrays.
- Geometry that does not depend on `offsetMs` must be memoised; only markers/readouts may depend on `offsetMs`.
- All hooks run before any early return.
- Colour tokens (CSS custom properties, exact values):
  - `--page: #e4e4e1; --surface: #f3f3f1; --ink: #1e2125; --ink-soft: #5a5f66; --hairline: #c4c5c2; --sky: #0b0d12;`
  - On light page: `--sun: #b86e00; --earth: #1d6aa8; --link: #2c7556; --danger: #a3262f;`
  - Inside dark windows (class `.sky-window`): `--sun: #f0a52a; --earth: #62aee8; --link: #74c39c; --ink: #e6e8ec; --ink-soft: #9aa3ae; --hairline: #2a3038;`
  - Site tag colours, in order A–D: `#6a4c93`, `#a8443a`, `#a8457f`, `#3f4750`.
- Type: `'Atkinson Hyperlegible Next', 'Atkinson Hyperlegible', system-ui, sans-serif` for everything. Figures use `font-variant-numeric: tabular-nums`. No monospace. Body 15–16 px.
- Copy rules: sentence case everywhere; no all-caps labels; no "A · B · C" middle-dot strings (write sentences or use separate elements); no "→" in buttons.
- Wording: "Sunlight", "Earth in view", "Radio link to Earth" (tooltip: "Direct-to-Earth (DTE)"), "Day 12, 14:00" for mission time (Day 0 = landing day).
- Primary buttons are ink-coloured (`--ink` background, `--surface` text). Amber is reserved for the Sun.
- Interactive targets are at least 44×44 px (use padding or an invisible hit area).
- Only `.sky-window` elements (sky view, 3D view) are dark. Everything else is on the light page.
- Layout: single left-aligned column, max width 1180 px; sections separated by space and hairlines, not nested boxes.
- Each site has a letter tag A–D shown wherever its colour is used.
- Tour anchors (exact `data-tour` values): `chips`, `add-site`, `chip-menu`, `summary`, `tabs`, `tab-terrain`, `tab-timeline`, `tab-numbers`, `stage`, `timebar`, `share`, `help`.
- Max 4 scenarios. Max 5,000 samples per request (backend).
- `prefers-reduced-motion: reduce` disables CSS animations/transitions.
- Commit on `main` after every task. Do not push; the controller pushes.
- Dev servers on ports 8000 (uvicorn, no reload) and 5173 (vite) are run by the controller. Do not start or stop them.
- Visual checks use the controller's script: `cd /private/tmp/claude-501/-Users-aryan-Documents-lunar-landing-site-navigator/e56bc816-1fbc-4c28-9f55-293ad91e136e/scratchpad/pw && node shot.mjs <url> <out.png> <waitMs> <width> <height> "<optional JS>"` (prints console errors; view PNG with Read; save under `../shots/r2-*.png`).

## Shared interfaces (defined once; later tasks rely on these exact names)

```ts
// store.ts additions
export type View = 'sky' | 'terrain' | 'timeline' | 'numbers';
export type ServerStatus = 'checking' | 'waking' | 'ok' | 'down';
// Scenario gains: tag: 'A' | 'B' | 'C' | 'D'   (assigned like colour: first unused)
// State gains:
//   view: View; setView(v: View): void
//   server: ServerStatus; sitesError: string | null
//   wakeServer(): Promise<void>      // pings /api/health until ok (see Task 4)
//   retryAll(): Promise<void>        // wakeServer + loadSites + re-run failed scenarios
//   updateScenario(id: string, patch: Partial<Pick<Scenario, 'start' | 'days'>>): void  // re-runs it
//   tutorial: { open: boolean; completed: string[] }
//   openTutorial(): void; closeTutorial(): void; completeTask(id: string): void; resetTutorial(): void
//   events: Record<string, number>; noteEvent(name: 'timeline-seek' | 'link-copied'): void
// State loses (Task 15): explain, toggleExplain

// lib/time.ts
export function rangeEndOf(t: number[]): number;            // last sample + step
// lib/format.ts
export function dayLabel(offsetMs: number): string;          // "Day 12, 14:00"
export function dateLabel(iso: string): string;              // "1 Dec 2026"
export function pct(v: number): string;                      // "46%" (0 decimals; "<1%" for 0<v<1; ">99%" for 99<v<100)
// lib/horizon.ts
export function maskAt(el: number[], azDeg: number): number; // periodic linear interpolation
// lib/summary.ts
export type Summary = { sunPct: number; earthPct: number; linkPct: number; sentence: string };
export function summarize(result: ScenarioResult, days: number): Summary;
// lib/csv.ts
export function scenarioCsv(result: ScenarioResult): string;
export function downloadText(filename: string, text: string, mime?: string): void;
// lib/urlState.ts
export type SharedScenario = { siteId: string | null; lat: number; lon: number; start: string; days: number };
export type SharedState = { scenarios: SharedScenario[]; offsetMs: number; view: View; active: number };
export function encodeState(s: SharedState): string;                       // "s=...&t=...&v=...&a=..."
export function decodeState(search: string, sites: Site[]): SharedState | null;
// lib/tutorial.ts
export type TaskId = 'pick-site' | 'earth-rise' | 'open-terrain' | 'add-crater' | 'land-later' | 'read-timeline' | 'open-numbers' | 'share';
export type TutorialTask = { id: TaskId; title: string; instruction: string; lesson: string; target: string };
export const TASKS: TutorialTask[];
export type Snapshot = { activeId: string | null; view: View; offsetMs: number; events: Record<string, number>;
  scenarios: { id: string; siteId: string | null; start: string; earthVisibleNow: boolean | null }[] };
export function newlyCompleted(prev: Snapshot, next: Snapshot, completed: string[]): TaskId[];
```

---

# Stage 1: bug fixes and speed

### Task 1: End-of-period window bug

**Files:**
- Modify: `frontend/src/lib/time.ts`, `frontend/src/lib/time.test.ts`, `frontend/src/components/ComparisonGrid.tsx`

**Interfaces:**
- Produces: `rangeEndOf(t)`; `windowStatus(windows, time, rangeEnd)` now treats `time >= rangeEnd` as the last instant of the range.

**Problem:** with the slider at its maximum, `time` equals the end of the last window, `time < e` fails, and every row reads "down / hidden / none in period". `ComparisonGrid` also passes the last sample time instead of the true range end.

- [ ] **Step 1: Add failing tests to `frontend/src/lib/time.test.ts`**

```ts
import { rangeEndOf } from './time';

describe('windowStatus at the end of the range', () => {
  it('treats the range end as inside a window that runs to the end', () => {
    expect(windowStatus([[0, 100]], 100, 100)).toEqual({ inWindow: true, msUntilChange: 0, openEnded: true });
  });
  it('still reports not-in-window when the last window ended earlier', () => {
    expect(windowStatus([[0, 50]], 100, 100)).toEqual({ inWindow: false, msUntilChange: null, openEnded: true });
  });
  it('a window ending exactly at the last sample is not open-ended when rangeEnd is last + step', () => {
    expect(windowStatus([[0, 90]], 50, 100).openEnded).toBe(false);
  });
});

describe('rangeEndOf', () => {
  it('is last sample plus one step', () => {
    expect(rangeEndOf([0, 10, 20])).toBe(30);
    expect(rangeEndOf([5])).toBe(5);
    expect(rangeEndOf([])).toBe(0);
  });
});
```

- [ ] **Step 2:** Run `cd frontend && npx vitest run src/lib/time.test.ts`. Expected: the new tests FAIL (`rangeEndOf` missing; first case returns `inWindow: false`).

- [ ] **Step 3: Implement in `frontend/src/lib/time.ts`**

```ts
export function rangeEndOf(t: number[]): number {
  if (t.length === 0) return 0;
  if (t.length === 1) return t[0];
  return t[t.length - 1] + (t[1] - t[0]);
}

export function windowStatus(windows: Win[], time: number, rangeEnd: number) {
  const atEnd = time >= rangeEnd;
  for (const [s, e] of windows) {
    const inside = time >= s && (time < e || (atEnd && e >= rangeEnd));
    if (inside) return { inWindow: true, msUntilChange: Math.max(0, e - time), openEnded: e >= rangeEnd };
    if (s > time) return { inWindow: false, msUntilChange: s - time, openEnded: false };
  }
  return { inWindow: false, msUntilChange: null, openEnded: true };
}
```

- [ ] **Step 4:** In `ComparisonGrid.tsx`, replace the `t[t.length - 1]` range-end argument with `rangeEndOf(t)` (import it).

- [ ] **Step 5:** Run `npx vitest run && npm run build`. Expected: all pass, clean.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/time.ts frontend/src/lib/time.test.ts frontend/src/components/ComparisonGrid.tsx
git commit -m "fix(frontend): windows stay open at the last instant of the period"
```

---

### Task 2: Smooth playback and a readable 3D view

**Files:**
- Modify: `frontend/src/components/Terrain3D.tsx`, `frontend/src/components/TimeScrubber.tsx`

**Requirements:**
- [ ] `Canvas` uses `frameloop="demand"`. The scene must still update when: time changes, exaggeration changes, the active site changes, the user orbits (drei `OrbitControls` invalidates on change), and after the terrain loads. Use `invalidate()` from `useThree` where a change does not come through React props.
- [ ] Shadow map size 4096 → 2048. Re-check shadow quality in a screenshot; tune `shadow-bias`/`shadow-normalBias` only if artefacts appear.
- [ ] Add a low fill so grazing-lit ground is readable while shadowed craters stay clearly darker: start with `ambientLight` intensity 0.10 (was 0.03) and compare screenshots at T+0 and T+15 d for Connecting Ridge. The Shackleton interior must remain visibly darker than lit ground.
- [ ] The overlay legend names the site: "At Connecting Ridge: Sun visible, Earth hidden" (use the active scenario's label, shortened at " ("). No middle dots.
- [ ] When the active site is outside the polar model, the note reads: "Apollo 11 is far from the south pole, so this view shows the pole for context."
- [ ] `TimeScrubber` playback loop: take `last` from the first animation frame's timestamp (not `performance.now()`), and cap each step's elapsed time at 100 ms so a background tab does not cause a jump.
- [ ] Verify: `npx vitest run && npm run build` clean. Screenshots `r2-t2-t0.png`, `r2-t2-t15.png` (1440×1000, waitMs 10000). Measure playback: with the page open and playing at 6 h/s for 5 s, the offset must advance by 30 h ± 20% (read the time readout before/after with a small Playwright script).

- [ ] **Commit:** `git commit -m "perf(frontend): render 3D on demand, lighter shadows, readable lighting, steady playback"`

---

### Task 3: Backend warm-up and smaller responses

**Files:**
- Modify: `backend/app/main.py`, `backend/app/scenario.py`
- Test: `backend/tests/test_api.py`, new `backend/tests/test_warm.py`

**Interfaces:**
- Produces: `app.scenario.warm_default_scenarios() -> int` (number warmed); FastAPI lifespan starts it in a daemon thread unless env `WARM_CACHE=0`.

- [ ] **Step 1: Failing tests**

```python
# backend/tests/test_warm.py
from tests.markers import requires_kernels


@requires_kernels
def test_warm_default_scenarios_fills_cache():
    from app import scenario

    scenario._compute.cache_clear()
    assert scenario.warm_default_scenarios() == 2
    info = scenario._compute.cache_info()
    assert info.currsize == 2
    # the frontend's default request must be a cache hit
    req = scenario.ScenarioRequest(lat=-89.4667, lon=-136.667, start="2026-12-01T00:00:00Z",
                                   end="2026-12-31T00:00:00Z", step_min=10, obs_h=2,
                                   panel_mode="vertical-tracking", panel_az=0, area_m2=1, efficiency=0.3)
    scenario.compute_scenario(req)
    assert scenario._compute.cache_info().hits == info.hits + 1
```

```python
# add to backend/tests/test_api.py
import gzip
import json


@requires_kernels
def test_thirty_day_response_is_compact():
    c = _client()
    body = {"lat": -89.4667, "lon": -136.667, "start": "2026-12-01T00:00:00Z", "end": "2026-12-31T00:00:00Z"}
    d = c.post("/api/scenario", json=body).json()
    assert len(gzip.compress(json.dumps(d).encode())) < 100_000
    assert len(d["samples"]["sun_vec"][0]) == 3
```

- [ ] **Step 2:** Run `cd backend && .venv/bin/pytest tests/test_warm.py tests/test_api.py -q`. Expected: FAIL (`warm_default_scenarios` missing; size ≈ 123 KB).

- [ ] **Step 3: Implement**
  - In `scenario.py`: `DEFAULT_WARM = [("connecting-ridge", 30), ("apollo11", 30)]`, start `2026-12-01T00:00:00Z`. `warm_default_scenarios()` looks each site up with `app.sites.get_site`, builds the `ScenarioRequest` with the exact defaults the frontend sends (above), calls `compute_scenario`, returns the count. Wrap each in `try/except Exception` that logs and continues (a failed warm must never stop the server).
  - Rounding in `_compute`: azimuths and elevations 2 decimals; `sun_frac`/`earth_frac` 3; `power_w` 0 decimals (as floats); `sun_vec`/`earth_vec` 4; `horizon.el` 2. Keys unchanged.
  - In `main.py`: add a `lifespan` context manager that, unless `os.environ.get("WARM_CACHE") == "0"`, starts `threading.Thread(target=warm_default_scenarios, daemon=True)`.

- [ ] **Step 4:** Run the full suite `.venv/bin/pytest -q`. Expected: all pass, zero warnings. If an existing test asserted a value at 3-decimal precision, loosen only that assertion to 2 decimals and note it. Report the measured gzip size.

- [ ] **Step 5: Commit** `git commit -m "perf(backend): warm default scenarios at start-up; tighter rounding for smaller responses"`

---

### Task 4: Clear failures, server wake-up, share metadata

**Files:**
- Modify: `frontend/src/api.ts`, `frontend/src/store.ts`, `frontend/src/store.test.ts`, `frontend/src/App.tsx`, `frontend/src/components/ScenarioList.tsx`, `frontend/src/styles.css`, `frontend/index.html`
- Create: `frontend/src/components/StatusBanner.tsx`

**Interfaces:**
- Produces: `api.pingHealth(timeoutMs?: number): Promise<boolean>`; store `server`, `sitesError`, `wakeServer`, `retryAll` (see Shared interfaces).

**Requirements:**
- [ ] `pingHealth` fetches `${API_BASE}/api/health` with an `AbortController` timeout (default 4000 ms); resolves `true` on HTTP 200, `false` otherwise; never throws.
- [ ] `wakeServer`: set `server: 'checking'`; ping; on success `'ok'`. On failure set `'waking'` and retry every 5 s for up to 90 s, then `'down'`. Only one wake loop may run at a time.
- [ ] `loadSites` catches errors: sets `sitesError` to the message and leaves `sites` unchanged; clears `sitesError` on success.
- [ ] `retryAll`: `await wakeServer()`, then `loadSites()`, then `runScenario(id)` for every scenario that has an `error`.
- [ ] `App` calls `wakeServer()` on mount, before/alongside `loadSites()`.
- [ ] `StatusBanner` (rendered at the top of the page):
  - `server === 'waking'`: "Waking the server. This can take up to a minute."
  - `server === 'down'`: "Can't reach the server." + **Try again** button (`retryAll`).
  - `sitesError`: "Couldn't load the site list." + **Try again**.
  - Renders nothing when all is well. Uses `role="status"`.
- [ ] A scenario card with an `error` shows a **Try again** button that calls `runScenario(id)`.
- [ ] `index.html`: add `<meta name="description" content="Compare lunar landing sites and dates: see where the Sun and Earth sit above the real terrain horizon, and when a lander has power and a radio link to Earth.">`, and Open Graph tags `og:title`, `og:description` (same text), `og:type` = `website`.
- [ ] `styles.css`: `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }`.
- [ ] Tests (vitest, mock `./api`): (a) `loadSites` failure sets `sitesError`, success clears it; (b) `wakeServer` sets `'ok'` when the ping succeeds; (c) with pings failing then succeeding (fake timers), status goes `'waking'` then `'ok'`; (d) `retryAll` re-runs only errored scenarios.
- [ ] Verify: `npx vitest run && npm run build` clean.

- [ ] **Commit:** `git commit -m "feat(frontend): server wake-up state, error banner with retry, share metadata"`

**Stage 1 gate (controller):** restart uvicorn, run both suites, browser-check the end-of-period fix (slider at max: Apollo 11 Earth "visible"), then `git push origin main`.

---

# Stage 2: new interface

### Task 5: Pure helpers (format, horizon, summary, CSV, URL state)

**Files:**
- Create: `frontend/src/lib/format.ts`, `lib/horizon.ts`, `lib/summary.ts`, `lib/csv.ts`, `lib/urlState.ts` and a `*.test.ts` beside each.

**Interfaces:** exactly as in "Shared interfaces". `View` type is declared in `lib/urlState.ts` for now and re-exported from `store.ts` in Task 6.

- [ ] **Step 1: Write the tests first**

```ts
// format.test.ts
import { dateLabel, dayLabel, pct } from './format';
it('dayLabel', () => {
  expect(dayLabel(0)).toBe('Day 0, 00:00');
  expect(dayLabel(12 * 86_400_000 + 14 * 3_600_000 + 5 * 60_000)).toBe('Day 12, 14:05');
});
it('dateLabel', () => { expect(dateLabel('2026-12-01T00:00:00Z')).toBe('1 Dec 2026'); });
it('pct', () => {
  expect(pct(46.02)).toBe('46%'); expect(pct(0)).toBe('0%'); expect(pct(0.4)).toBe('<1%');
  expect(pct(99.6)).toBe('>99%'); expect(pct(100)).toBe('100%');
});
```

```ts
// horizon.test.ts
import { maskAt } from './horizon';
it('interpolates periodically', () => {
  const el = [0, 1, 2, 3]; // 90-degree bins
  expect(maskAt(el, 45)).toBeCloseTo(0.5); expect(maskAt(el, 315)).toBeCloseTo(1.5);
  expect(maskAt(el, -45)).toBeCloseTo(1.5); expect(maskAt(el, 360)).toBeCloseTo(0);
});
```

```ts
// summary.test.ts
import { summarize } from './summary';
import type { ScenarioResult } from '../types';
const D = 86_400_000;
const mk = (m: Partial<ScenarioResult['metrics']>, w: Partial<ScenarioResult['windows']>): ScenarioResult => ({
  terrain_source: 'x', terrain_partial: false, site_height_m: 0, horizon: { az: [], el: [] },
  samples: { t: [0, D], sun_az: [], sun_el: [], sun_frac: [], earth_az: [], earth_el: [], earth_frac: [], earth_vis: [],
    dsn_goldstone: [], dsn_madrid: [], dsn_canberra: [], dte: [], power_w: [], sun_vec: [], earth_vec: [] },
  windows: { sun: [], earth: [], dte: [], ...w },
  metrics: { illumination_pct: 0, sun_time_pct: 0, longest_dark_h: 0, earth_vis_pct: 0, dte_pct: 0, mean_power_w: 0,
    energy_wh: 0, max_sun_el: 0, min_sun_el: 0, ...m },
});
it('always sunlit, Earth rises later', () => {
  const s = summarize(mk({ sun_time_pct: 100, earth_vis_pct: 46, dte_pct: 45.9 },
    { sun: [[0, 30 * D]], earth: [[12.7 * D, 26.5 * D]] }), 30);
  expect(s).toMatchObject({ sunPct: 100, earthPct: 46, linkPct: 45.9 });
  expect(s.sentence).toBe('Sunlit the whole time. Earth comes into view on day 12 and stays for 14 days.');
});
it('never sunlit, never sees Earth', () => {
  expect(summarize(mk({}, {}), 30).sentence).toBe('No sunlight at all. Earth never comes into view.');
});
it('day and night, Earth always in view', () => {
  const s = summarize(mk({ sun_time_pct: 49.6, earth_vis_pct: 100, longest_dark_h: 327.6 },
    { sun: [[13.65 * D, 28.53 * D]], earth: [[0, 30 * D]] }), 30);
  expect(s.sentence).toBe('Sunlit about half the time, with a longest night of 14 days. Earth is in view the whole time.');
});
```

Sentence rules for `summarize` (two sentences, joined by a space):
- Sun: `sun_time_pct >= 99.5` → "Sunlit the whole time."; `<= 0.5` → "No sunlight at all."; otherwise "Sunlit about {fraction} of the time, with a longest night of {N}." where fraction is "a quarter" (≤37.5), "half" (≤62.5), "three quarters" (≤87.5), else "most" (and "a little" → use "a small part" below 12.5), and N is `longest_dark_h` as "{d} days" (rounded, when ≥ 48 h) or "{h} hours". For "half" the wording is "about half the time".
- Earth: `earth_vis_pct >= 99.5` → "Earth is in view the whole time."; `<= 0.5` → "Earth never comes into view."; otherwise, using the first Earth window: if it starts at the range start → "Earth is in view for the first {n} days."; else "Earth comes into view on day {floor(start/day)} and stays for {round(length/day)} days."

```ts
// csv.test.ts
import { scenarioCsv } from './csv';
it('writes a header and one row per sample', () => {
  const csv = scenarioCsv({ samples: { t: [0, 600000], sun_az: [1, 2], sun_el: [3, 4], sun_frac: [1, 0.5],
    earth_az: [5, 6], earth_el: [7, 8], earth_frac: [1, 1], earth_vis: [true, false], dsn_goldstone: [true, true],
    dsn_madrid: [false, false], dsn_canberra: [false, true], dte: [true, false], power_w: [400, 200],
    sun_vec: [], earth_vec: [] } } as never);
  const lines = csv.trim().split('\n');
  expect(lines[0]).toBe('time_utc,sun_azimuth_deg,sun_elevation_deg,sun_disk_visible_fraction,earth_azimuth_deg,earth_elevation_deg,earth_in_view,dsn_goldstone,dsn_madrid,dsn_canberra,radio_link_to_earth,array_power_w');
  expect(lines[1]).toBe('1970-01-01T00:00:00Z,1,3,1,5,7,1,1,0,0,1,400');
  expect(lines).toHaveLength(3);
});
```

```ts
// urlState.test.ts
import { decodeState, encodeState } from './urlState';
const sites = [{ id: 'connecting-ridge', name: 'CR', lat: -89.4667, lon: -136.667 }] as never;
it('round-trips curated and custom scenarios', () => {
  const st = { scenarios: [
    { siteId: 'connecting-ridge', lat: -89.4667, lon: -136.667, start: '2026-12-01T00:00:00Z', days: 30 },
    { siteId: null, lat: -87.5, lon: 45, start: '2027-03-15T06:00:00Z', days: 60 } ],
    offsetMs: 12.5 * 3_600_000, view: 'timeline' as const, active: 1 };
  expect(decodeState('?' + encodeState(st), sites)).toEqual(st);
});
it('returns null for missing or broken input', () => {
  expect(decodeState('', sites)).toBeNull();
  expect(decodeState('?s=nope@x~1', sites)).toBeNull();
});
it('drops unknown site ids and clamps bad values', () => {
  const d = decodeState('?s=ghost@2026-12-01T00:00~30;connecting-ridge@2026-12-01T00:00~999&v=zzz&a=9&t=-5', sites)!;
  expect(d.scenarios).toHaveLength(1); expect(d.scenarios[0].days).toBe(60);
  expect(d.view).toBe('sky'); expect(d.active).toBe(0); expect(d.offsetMs).toBe(0);
});
```

URL format: `s` = scenarios joined by `;`, each `<site>@<YYYY-MM-DDTHH:mm>~<days>` where `<site>` is a site id or `c_<lat>_<lon>` for custom; `t` = offset in hours (2 decimals); `v` = view; `a` = active index. At most 4 scenarios are decoded; days clamp to 1–60; invalid dates drop the item; if no valid scenario remains, return `null`. Use `URLSearchParams`.

- [ ] **Step 2:** Run `npx vitest run`. Expected: new tests FAIL (modules missing).
- [ ] **Step 3:** Implement the five modules to satisfy the tests and rules above. `downloadText` creates a Blob URL and clicks a temporary `<a download>`.
- [ ] **Step 4:** `npx vitest run && npm run build`: all pass, clean.
- [ ] **Step 5: Commit** `git commit -m "feat(frontend): helpers for plain-language summary, CSV export, share links and labels"`

---

### Task 6: Store: views, tags, date changes, URL sync

**Files:**
- Modify: `frontend/src/store.ts`, `frontend/src/store.test.ts`, `frontend/src/App.tsx`
- Create: `frontend/src/lib/useUrlSync.ts`

**Requirements:**
- [ ] `store.ts` exports `View` (re-export from `lib/urlState`), adds `view` (default `'sky'`) and `setView`.
- [ ] `Scenario.tag`: assigned in `addScenario` as the first unused of `['A','B','C','D']`; `color` now comes from the Global Constraints tag colours in the same order (replace `COLORS`).
- [ ] `updateScenario(id, patch)`: merges `start`/`days`, clears `result`/`error`, re-runs the scenario, and re-clamps `offsetMs` to the new max duration.
- [ ] `duplicateShifted` label format: `"{site name}, {dateLabel(new start)}"` instead of "(+29.53 d)".
- [ ] `events: Record<string, number>` and `noteEvent(name)` (increments a counter).
- [ ] Tutorial state and actions per Shared interfaces (plain state only; no persistence yet. Task 15 adds it).
- [ ] `lib/useUrlSync.ts`: a hook used once in `App`.
  - On first load after sites arrive: `decodeState(location.search, sites)`. If it returns state, add those scenarios (label = site name or `Custom -87.5°, 45°`), then set `view`, `activeId` (by index) and `offsetMs` (after results load, or immediately; `setOffset` clamps). If `null`, add the two defaults as today.
  - Afterwards: subscribe to the store and `history.replaceState` with `encodeState(...)`, throttled to at most once per 500 ms. Do not write while playing (write once when playback stops).
- [ ] `App.tsx` uses `useUrlSync()` in place of the inline default-scenario effect.
- [ ] Tests: tag/colour assignment and reuse after removal; `updateScenario` re-runs and clears the old result; `setView`; `noteEvent`.
- [ ] Verify: `npx vitest run && npm run build` clean; in the browser, the URL gains `?s=...` after load, and reloading that URL restores the same sites.

- [ ] **Commit:** `git commit -m "feat(frontend): view state, site tags, date changes and URL-synced scenarios"`

---

### Task 7: New shell, design tokens, tabs and time bar

**Files:**
- Rewrite: `frontend/src/styles.css`, `frontend/src/App.tsx`, `frontend/src/components/Header.tsx`
- Create: `frontend/src/components/Tabs.tsx`, `frontend/src/components/TimeBar.tsx` (replaces `TimeScrubber.tsx`; delete the old file)
- Modify: `frontend/index.html` (fonts), and only as needed for theming: `HorizonPanorama.tsx`, `Terrain3D.tsx`, `TimelineGantt.tsx`, `ComparisonGrid.tsx`, `ScenarioList.tsx`, `AddScenario.tsx`, `StatusBanner.tsx`

**Load the `frontend-design:frontend-design` skill first** and apply it within the Global Constraints (tokens, type, copy rules are fixed; spacing, scale and detail are yours).

**Layout (desktop):**

```
┌────────────────────────────────────────────────┐
│ Lunar Landing Site Navigator      Share  Help  │  header (hairline below)
│ [status banner when needed]                    │
│ site chips row            (Task 8; for now the │
│                            existing list/form) │
│ summary strip             (Task 9 placeholder) │
│ Sky view | 3D terrain | Timeline | All numbers │  tabs  data-tour="tabs"
│ ┌────────────────────────────────────────────┐ │
│ │ one view at a time        data-tour="stage"│ │
│ └────────────────────────────────────────────┘ │
├────────────────────────────────────────────────┤
│ Play  speed  ─────●──────  Day 12, 14:00       │  time bar, pinned  data-tour="timebar"
└────────────────────────────────────────────────┘
```

**Requirements:**
- [ ] `index.html` loads Atkinson Hyperlegible Next (400, 500, 600, 700) and drops IBM Plex.
- [ ] `styles.css` defines the tokens exactly as in Global Constraints, a type scale, and base styles for buttons, inputs, links, focus rings (visible, 2 px), tabs, hairlines, and `.sky-window` (dark scope that redefines the tokens).
- [ ] `Header`: product name (sentence case, not uppercase), then **Share** (`data-tour="share"`, disabled placeholder until Task 14) and **Help** (`data-tour="help"`, placeholder until Task 14). The solar-array select is removed from the header (it moves to All numbers in Task 12; until then keep it at the top of the numbers tab).
- [ ] `Tabs`: an accessible tablist (`role="tablist"`, arrow-key navigation, `aria-selected`), bound to `view`/`setView`. Tab buttons carry `data-tour="tab-terrain"`, `tab-timeline`, `tab-numbers`. Labels: "Sky view", "3D terrain", "Timeline", "All numbers".
- [ ] Stage shows exactly one of: `HorizonPanorama` (sky), `Terrain3D` (terrain), `TimelineGantt` (timeline), `ComparisonGrid` (numbers). `Terrain3D` stays mounted but hidden (`display: none`) after its first show, so WebGL is not re-created on every tab switch; with `frameloop="demand"` it costs nothing while hidden.
- [ ] `TimeBar`: Play/Pause (ink primary button), speed select with plain labels ("Slow", "Normal", "Fast", "Very fast" = 1, 6, 24, 72 h/s), slider, and the readout `dayLabel(offsetMs)` followed by the UTC date-time of the active scenario in soft ink. Keeps the playback loop from Task 2. Pinned to the bottom of the viewport.
- [ ] The sky view and 3D view sit in `.sky-window` containers with a comfortable height (sky ≈ 420 px, 3D ≈ 520 px at desktop) and rounded 8 px corners; SVG text inside uses the dark-scope tokens.
- [ ] Existing components are re-themed only as far as needed to look right in the new shell (colours via tokens, no uppercase headings, no monospace). Their full redesigns are Tasks 8–13; do not restructure them here.
- [ ] Remove every `text-transform: uppercase`, monospace font and " · " joined string from the files you touch.
- [ ] Verify: `npx vitest run && npm run build` clean. Screenshots at 1440×900 and 1280×720 of each tab (`r2-t7-sky.png`, `-terrain`, `-timeline`, `-numbers`); switch tabs with JS `document.querySelector('[data-tour=tab-terrain]').click()`. No console errors. Check contrast of body text and soft ink on the page (≥ 4.5:1).

- [ ] **Commit:** `git commit -m "feat(frontend): new light shell with tabs, time bar and design tokens"`

---

### Task 8: Site chips, chip menu and the Add-site dialog

**Files:**
- Create: `frontend/src/components/SiteChips.tsx`, `ChipMenu.tsx`, `AddSiteDialog.tsx`, `frontend/src/lib/nextSunrise.ts` (+ test)
- Modify: `SouthPoleMap.tsx`, `App.tsx`, `styles.css`
- Delete: `ScenarioList.tsx`, `AddScenario.tsx`

**Requirements:**
- [ ] **Chips row** (`data-tour="chips"`): one chip per scenario: letter tag in the site colour, short name (cut at " ("), and the landing date (`dateLabel`) only when the scenarios' start dates are not all equal. The active chip is clearly marked (`aria-pressed`). Clicking a chip makes it active. A loading chip shows a small inline "computing" indicator and stays one line tall. An errored chip shows "Failed" with **Try again**.
- [ ] Each chip has a menu button (`data-tour="chip-menu"` on the first chip's button, `aria-haspopup="menu"`) opening `ChipMenu`:
  - "Change landing date" (inline date + time inputs and days 1–60, validated with `lib/validate.ts`; applies via `updateScenario`).
  - "Land a month later" (`duplicateShifted(id, SYNODIC_DAYS)`; disabled with a reason at 4 sites).
  - "Start at the next sunrise" (uses `nextSunrise`; disabled when there is none, with the reason "The Sun is up the whole time" or "The Sun never rises here in this period").
  - "Remove".
  - Keyboard: Escape closes; focus returns to the button.
- [ ] `lib/nextSunrise.ts`: `nextSunrise(sunWindows: Win[], startMs: number): number | null`. Returns the start of the first Sun window that begins after `startMs` (a window already open at `startMs` does not count). Tests: Sun up from the start then another window later → the later start; Sun down at start → first window start; single window from start → `null`; no windows → `null`.
- [ ] **Add site** button (`data-tour="add-site"`), disabled at 4 with the label "4 sites is the most you can compare". Opens `AddSiteDialog` (native `<dialog>`, labelled, Escape closes, focus trapped by the browser).
- [ ] Dialog contents:
  - Site list grouped "South pole (real terrain)" and "Elsewhere on the Moon (smooth horizon)", each row showing name and the one-line description; plus "Pick a spot on the map".
  - The map (`SouthPoleMap`): wheel and pinch zoom (1×–8×), drag to pan, tap/click to drop a pin and fill in coordinates, **+**/**−**/**Reset** buttons, curated pins with an invisible 44 px hit area that select that site on tap. Zoom/pan by changing the SVG `viewBox`/image transform; the click-to-lat/lon maths must account for the current zoom and pan. No new dependency.
  - Custom latitude/longitude inputs (validated).
  - Landing date: native date and time inputs, prefilled with the active scenario's start, with preset buttons "Today", "One month later" (active start + 29.53 d), "January 2030".
  - Days (1–60).
  - **Add site** (ink primary) and **Cancel**. Validation message as before.
- [ ] Verify: `npx vitest run && npm run build` clean. Browser script: open dialog, zoom twice, click a spot, confirm coordinates are inside 80–90°S and match the expected orientation (right of centre = positive longitude near +90°); add it; open a chip menu and use "Land a month later"; change a date. Screenshots `r2-t8-chips.png`, `r2-t8-dialog.png`. No console errors.

- [ ] **Commit:** `git commit -m "feat(frontend): site chips with per-site dates and an add-site dialog with zoomable map"`

---

### Task 9: Summary strip and loading skeletons

**Files:**
- Create: `frontend/src/components/SummaryStrip.tsx`, `Skeleton.tsx`
- Modify: `App.tsx`, `styles.css`

**Requirements:**
- [ ] Under the chips (`data-tour="summary"`): one column per scenario (1–4), separated by hairlines, each with the tag + short name, then three figures with labels: "Sunlight", "Earth in view", "Radio link to Earth" (values via `pct`), then `summarize(result, days).sentence`.
- [ ] The best value in each row is marked with a small "most" label (text, not colour only) when 2+ scenarios have results and the values differ.
- [ ] While a scenario loads, its column shows skeleton lines (static blocks; a subtle shimmer only when motion is allowed). The stage shows a skeleton instead of "Waiting for results…" when the active scenario has no result yet.
- [ ] Clicking a column makes that scenario active.
- [ ] "Radio link to Earth" has a `title` tooltip: "Earth is in view and a Deep Space Network antenna can see the Moon (direct-to-Earth, DTE)."
- [ ] Verify: build clean; screenshot `r2-t9-summary.png` with 2 and with 4 scenarios; numbers match the All numbers tab.

- [ ] **Commit:** `git commit -m "feat(frontend): plain-language summary strip with loading skeletons"`

---

### Task 10: Sky view redesign

**Files:**
- Modify: `frontend/src/components/HorizonPanorama.tsx`, `styles.css`

**Requirements:**
- [ ] Use the vertical space well: in the polar zoom, fit the y-range to the data: from `min(mask) − 1°` (not below −6°) to `max(8°, max Sun/Earth elevation + 1°)`; non-polar keeps the full-sky range. Keep the zoom select with plain labels ("Fit", "Near the horizon", "Whole sky").
- [ ] Stronger terrain: lighter fill and a clearly visible skyline stroke (contrast ≥ 3:1 against the sky); compass labels (N, NE, E…) at readable size and contrast.
- [ ] Label the bodies inside the chart: "Sun" and "Earth" text beside their markers (keep clear of the plot edges; flip side near the right edge). The Earth marker must stay legible in front of terrain: give it a dark outline ring, and when Earth is hidden draw it hollow with the label "Earth (behind terrain)".
- [ ] A small legend inside the window: Sun, Earth, "path over the whole period" (faint line sample), "terrain".
- [ ] One caption line under the chart in plain words, e.g. "At Day 12, 14:00 the Sun is 1.4° above the horizon and fully visible. Earth is 3.9° up, in view." Then, in soft ink, the terrain source ("Terrain: LOLA 80 m").
- [ ] Geometry stays memoised and independent of `offsetMs`; tracks stay clipped to the plot.
- [ ] Verify: build clean; screenshots for Connecting Ridge at T+0 and T+15 d, Apollo 11, and the Shackleton floor (`r2-t10-*.png`); no console errors.

- [ ] **Commit:** `git commit -m "feat(frontend): clearer sky view with labelled Sun and Earth, legend and fitted range"`

---

### Task 11: Timeline tab with an elevation chart

**Files:**
- Create: `frontend/src/components/ElevationChart.tsx`
- Modify: `frontend/src/components/TimelineGantt.tsx`, `App.tsx` (timeline tab shows both), `styles.css`

**Requirements:**
- [ ] **Elevation chart** (top of the tab, for the active site, on the light surface): x = mission days, y = degrees above the level horizon. For the Sun and for Earth draw (1) the body's elevation over time and (2) the terrain height in the body's direction at each sample (`maskAt(result.horizon.el, az)`), as a filled band from the bottom up to that height in a muted tone. Shade the time ranges where the body is hidden. Two small stacked plots (Sun on top, Earth below) sharing the x-axis; each titled in words ("Sun: height above the horizon", "Earth: height above the horizon"). A vertical cursor at the current time; clicking sets the time and calls `noteEvent('timeline-seek')`.
- [ ] y-range per plot fits the data with 1° padding; a 0° line is drawn.
- [ ] **Bars** (below): legend at the top ("Sunlight", "Earth in view", "Radio link to Earth") with colour swatches; every row labelled in words with the site tag (e.g. "A Connecting Ridge" as a group heading, then rows "Sunlight", "Earth in view", "Radio link"); long names are truncated with an ellipsis and never overlap the plot (reserve a wider label column or put the group heading on its own line above its rows). Clicking sets the time and calls `noteEvent('timeline-seek')`.
- [ ] Day ticks read "Day 0", "Day 5"…; the last label stays inside the plot.
- [ ] All geometry memoised; only cursors depend on `offsetMs`. Downsample the elevation polylines to at most ~1,500 points per line.
- [ ] Verify: build clean; screenshots `r2-t11-timeline.png` (2 scenarios) and with 4 scenarios including a custom site with a long name; clicking moves the cursor in both charts.

- [ ] **Commit:** `git commit -m "feat(frontend): timeline tab with elevation-vs-terrain chart, legend and worded rows"`

---

### Task 12: All numbers tab, CSV download, solar-array setting

**Files:**
- Modify: `frontend/src/components/ComparisonGrid.tsx` (rename file and component to `NumbersTable.tsx` / `NumbersTable`; update imports), `App.tsx`, `styles.css`

**Requirements:**
- [ ] Two clearly separated groups with plain headings: "Right now (Day 12, 14:00)" and "Over the whole period".
- [ ] "Right now" rows: "Sun", "Earth", "Radio link to Earth". Each cell has two lines: the value ("1.4° up, fully visible" / "18.1° below the horizon") and the status ("Sets in 3 days 4 hours" / "Rises in 13 days 15 hours" / "Up for the rest of the period" / "Does not rise in this period"). Uses `windowStatus` with `rangeEndOf`. No "≥", no "T+".
- [ ] "Over the whole period" rows: Sunlight (average share of the Sun's disk visible), Time with any Sun, Longest night, Earth in view, Radio link to Earth, Average power, Energy, Highest Sun. Row labels have `title` tooltips (reuse the existing tip texts) and each technical term is plain. "Average power" and the sky view's instantaneous power must be labelled so they cannot be confused ("Average power over the period").
- [ ] Best value per row marked with a small "most"/"least" text label where a better direction exists.
- [ ] Solar array control at the top of the tab: label "Solar panel", options "Upright, turns to face the Sun", "Flat on the deck", "Upright, fixed facing north"; note "1 m², 30% efficient".
- [ ] **Download CSV** button per site column (`scenarioCsv` + `downloadText`, filename `<site-id-or-custom>_<YYYY-MM-DD>_<days>d.csv`).
- [ ] Terrain source and site height per column, in soft ink ("Terrain: LOLA 80 m, site at 1,944 m").
- [ ] Below 700 px wide: one card per site stacked vertically (no horizontal scroll), same rows.
- [ ] Verify: build clean; screenshots desktop and 390×844; download works in the browser script (intercept the download and check the header line and row count = samples).

- [ ] **Commit:** `git commit -m "feat(frontend): all-numbers tab in plain words with CSV download and panel setting"`

---

### Task 13: 3D tab: scale, north, lettered markers

**Files:**
- Modify: `frontend/src/components/Terrain3D.tsx`, `styles.css`

**Requirements:**
- [ ] Site markers are larger and carry their letter tag (drei `Html` label or `Billboard` + `Text`; choose the cheaper one that stays crisp) in the site colour with a dark outline so they read on bright and dark ground. Only south-pole sites inside the model are drawn.
- [ ] The Earth marker has a text label "Earth" (and "Sun" for the Sun marker); hidden bodies keep the dimmed style from before and the label "(hidden)".
- [ ] A north arrow and a scale bar as DOM overlays in a corner. The north arrow rotates with the camera (points toward lunar longitude 0 = "to Earth-facing side"; label it "Near side"). The scale bar shows a round distance (e.g. "20 km") computed from the camera distance at the orbit target; update on control change (not every tick).
- [ ] Vertical exaggeration control keeps working; label "Exaggerate heights".
- [ ] Per-tick work stays limited to the light and the Sun/Earth markers.
- [ ] Verify: build clean; screenshots `r2-t13-*.png` at T+0 and T+15 d with 3 polar sites; orbit by dispatching pointer events or setting the camera, and confirm the arrow and scale change.

- [ ] **Commit:** `git commit -m "feat(frontend): 3D view with lettered site markers, north arrow and scale bar"`

---

### Task 14: Share link, Help drawer, glossary and Methods

**Files:**
- Create: `frontend/src/components/HelpDrawer.tsx`, `Term.tsx`, `frontend/src/content/glossary.ts`, `frontend/src/content/methods.ts`
- Modify: `Header.tsx`, `App.tsx`, `styles.css`, and add `<Term>` where the terms first appear in the summary strip and numbers tab

**Requirements:**
- [ ] **Share** button: copies `location.origin + location.pathname + '?' + encodeState(current)` to the clipboard, calls `noteEvent('link-copied')`, and shows "Link copied" inline for 2 s. If the clipboard API is unavailable, show the link in a small field, selected.
- [ ] **Help** opens a right-side drawer (`<dialog>` or `aria-modal` panel, Escape closes) with three sections:
  - "Take the tutorial" button (calls `resetTutorial()` then `openTutorial()`; label notes it resets the sites to the two starting ones).
  - "Words used here": glossary list from `content/glossary.ts`: Sunlight, Earth in view, Radio link to Earth (DTE), Deep Space Network (DSN), Horizon, Terrain horizon, LOLA, Permanently shadowed region (PSR), Lunation, Libration, Elevation, Azimuth, Mission day. One or two plain sentences each.
  - "Methods and data" from `content/methods.ts`: where Sun/Earth positions come from (JPL DE440 ephemeris via Skyfield, Moon orientation including libration; checked against JPL Horizons to within 0.004°); terrain (NASA LRO LOLA 80 m south-pole elevation model, horizons traced to 150 km, 2 m observer; custom spots use a 240 m version; sites north of 80°S use a smooth sphere); visibility rules (any part of the Sun's disk counts as sunlight, Earth counts when half its disk clears the terrain, no atmosphere so no bending of light); radio link (Earth in view and Goldstone, Madrid or Canberra sees the Moon at least 10° up); power (1,361 W/m² scaled by distance, panel angle and visible Sun fraction; 1 m² at 30%); limits (features smaller than the grid are missed; no heat, dust or relay satellites; far-field terrain is partial for sites north of 84.95°S). Source links: JPL Horizons, NAIF kernels, PDS LOLA, LROC Quickmap, NASA Moon Trek.
- [ ] `Term` component: wraps a word, shows the glossary definition on hover and focus (accessible: `tabIndex=0`, `aria-describedby`), dotted underline.
- [ ] Verify: build clean; browser script grants clipboard permission, clicks Share, reads the clipboard, opens that URL in a new page and checks the same chips, tab and time; screenshot `r2-t14-help.png`.

- [ ] **Commit:** `git commit -m "feat(frontend): share link, help drawer with glossary and methods"`

---

# Stage 3: tutorial

### Task 15: Learn-by-doing tutorial

**Files:**
- Create: `frontend/src/lib/tutorial.ts` (+ `tutorial.test.ts`), `frontend/src/components/Tutorial.tsx`, `Spotlight.tsx`
- Modify: `store.ts` (persistence + remove `explain`/`toggleExplain`), `App.tsx`, `styles.css`, any component still reading `explain`
- Delete: `frontend/src/components/ExplainPanel.tsx`

**Tasks (exact content for `TASKS`):**

| id | title | instruction | target | lesson |
|---|---|---|---|---|
| `pick-site` | Pick a site | Two sites are loaded: Connecting Ridge near the south pole, and Apollo 11 near the equator. Click the Apollo 11 chip to look at it. | `chips` | At the equator the Sun climbs high overhead. At the pole it never rises more than about 2° above the horizon, so it skims around the skyline. |
| `earth-rise` | Watch Earth rise | Click Connecting Ridge again, then drag the time slider (or press Play) until Earth comes into view. | `timebar` | Earth hangs almost still in the lunar sky, but a monthly wobble called libration lifts it above the ridges and hides it again. That opens and closes the radio link. |
| `open-terrain` | See the terrain | Open the 3D terrain tab and drag to look around. | `tab-terrain` | With the Sun this low, a distant ridge a few hundred metres taller than you can cast a shadow for days. Terrain decides where there is power. |
| `add-crater` | Add a dark crater | Add the site "Shackleton crater floor". | `add-site` | Shackleton's rim is one of the sunniest places on the Moon. Its floor, about 4 km below, has not seen the Sun in billions of years. A few kilometres change everything. |
| `land-later` | Land a month later | Open the menu on the Connecting Ridge chip and choose "Land a month later". | `chip-menu` | Launches slip. The same spot can be sunlit all month in one season and dark half the time in another, so every date change needs a fresh look. |
| `read-timeline` | Read the timeline | Open the Timeline tab and click anywhere on it to jump to that moment. | `tab-timeline` | A radio link needs both ends: Earth must be above the terrain, and an antenna in California, Spain or Australia must be able to see the Moon. |
| `open-numbers` | Check the numbers | Open the All numbers tab. | `tab-numbers` | Everything here comes from NASA terrain data and the JPL ephemeris. Hover a row name to see what it means, or download the data as CSV. |
| `share` | Share your comparison | Press Share to copy a link to exactly what you see. | `share` | That's the tour. Help has a glossary and a page on methods and data. |

**Completion rules (`newlyCompleted(prev, next, completed)`), each only if not already completed:**
- `pick-site`: `next.activeId !== prev.activeId` and both non-null.
- `earth-rise`: the active scenario's `siteId === 'connecting-ridge'`, `next.offsetMs > 0`, and its `earthVisibleNow` is `true` while it was not `true` in `prev` (or the offset changed).
- `open-terrain`: `next.view === 'terrain'` and `prev.view !== 'terrain'`.
- `add-crater`: `next.scenarios` contains `siteId === 'shackleton-floor'` and `prev.scenarios` did not.
- `land-later`: `next.scenarios` has more entries than `prev` and two entries share a `siteId` with different `start`.
- `read-timeline`: `next.view === 'timeline'` and `next.events['timeline-seek'] > (prev.events['timeline-seek'] ?? 0)`.
- `open-numbers`: `next.view === 'numbers'` and `prev.view !== 'numbers'`.
- `share`: `next.events['link-copied'] > (prev.events['link-copied'] ?? 0)`.

- [ ] **Step 1: Write `tutorial.test.ts` first**: one passing and one non-triggering case per rule above (16 cases), plus: an already-completed id is never returned; `TASKS` has 8 entries with unique ids and non-empty text; every `target` is one of the tour anchors in Global Constraints.
- [ ] **Step 2:** Run; expect FAIL (module missing). **Step 3:** implement `lib/tutorial.ts`. **Step 4:** tests pass.
- [ ] **Step 5: `Tutorial.tsx`**: a right-side panel, 320 px wide, that sits beside the main column on wide screens (the main column narrows; nothing is covered) and becomes a bottom sheet below 900 px.
  - Heading "Get started", progress "3 of 8".
  - The 8 tasks as a checklist. Completed tasks show a tick and their lesson in soft ink. The current task (first not completed) is expanded: instruction, **Show me** and **Skip this step** (marks it completed without the lesson emphasis).
  - Any task can complete out of order when its rule fires.
  - When a task completes, its lesson is shown and announced (`aria-live="polite"`).
  - Footer: **Close** (keeps progress) and, when all are done, **Finish**.
  - Subscribes to the store, builds a `Snapshot` (compute `earthVisibleNow` from `earth_vis[indexAt(...)]`), and calls `newlyCompleted` on each change; calls `completeTask` for each result. Throttle so playback ticks do not cause extra renders (compare snapshots outside React; only set state on change).
- [ ] **Step 6: `Spotlight.tsx`**: **Show me** scrolls the element with the matching `data-tour` into view and draws a highlight ring around it for 3 s (a positioned outline element; static ring when reduced motion is requested, a gentle pulse otherwise). If the target is inside a closed menu/dialog, highlight its opener instead.
- [ ] **Step 7: Store**: persist `{ completed, dismissed }` in `localStorage` under `llsn.tutorial.v1` (guard for unavailable storage). `openTutorial`/`closeTutorial` set `open`; closing sets `dismissed`. `resetTutorial` clears progress and replaces the scenarios with the two defaults (Connecting Ridge and Apollo 11, default start, 30 days), view `'sky'`, offset 0. Auto-open on first visit: when not dismissed and the URL carried no shared state. Remove `explain` and `toggleExplain`.
- [ ] **Step 8:** Delete `ExplainPanel.tsx`; remove inline explain notes that depended on `explain` (tooltips remain).
- [ ] **Step 9: Verify**: `npx vitest run && npm run build` clean. Browser script completes all 8 tasks by acting in the app (click chip; set slider to day 15; click tab; add Shackleton floor through the dialog; chip menu "Land a month later"; timeline click; numbers tab; Share) and asserts "8 of 8"; reload mid-way keeps progress; Skip and Close work; Help → "Take the tutorial" restarts it. Screenshots `r2-t15-start.png`, `r2-t15-mid.png`, `r2-t15-done.png`, and one at 390×844.

- [ ] **Commit:** `git commit -m "feat(frontend): learn-by-doing tutorial with hints; fold explain lessons into it"`

---

### Task 16: Phones, accessibility and whole-app check

**Files:** `frontend/src/styles.css` and any component needing small fixes.

**Requirements:**
- [ ] At 390×844: no horizontal page scroll; chips wrap or scroll within their own row; summary columns stack; tabs scroll horizontally inside their bar if needed; the time bar wraps to two rows cleanly; dialog and drawers are full-width sheets; tutorial is a bottom sheet that can be minimised; "30 d" and similar never wrap mid-unit (`white-space: nowrap` on figures with units).
- [ ] All interactive targets ≥ 44 px on touch widths (chip menu buttons, remove, tabs, map pins, zoom buttons, date inputs).
- [ ] Contrast: body and soft-ink text ≥ 4.5:1 on their backgrounds, in both light and dark scopes; non-text marks ≥ 3:1. Fix any that fail.
- [ ] Keyboard pass: tab order follows the visual order; every control is reachable; focus is visible; dialogs return focus.
- [ ] Remove dead CSS and unused components/exports left from the old UI.
- [ ] Whole-app browser check (script + screenshots at 1440×900, 1280×720, 390×844), covering every item in the spec's Verification section, including: slider at the very end; each tab; playback at "Normal" speed for 5 s advancing 30 h ± 20% with the 3D tab open; share link round trip; CSV; tutorial; backend-down banner (point `VITE_API_URL` at a dead port in a second vite instance on port 5174 that you start and stop yourself) and Retry text; zero console errors.
- [ ] `cd backend && .venv/bin/pytest -q` and `cd frontend && npx vitest run && npm run build`: all green, no warnings.

- [ ] **Commit:** `git commit -m "fix(frontend): phone layout, touch targets, contrast and cleanup"`

---

# Stage 4: wrap-up

### Task 17: README, methodology and demo script

**Files:** `README.md`, `docs/methodology.md`, `docs/demo-script.md`, `docs/screenshot.png`

- [ ] `README.md`: one-line pitch; live links (placeholders `<VERCEL_URL>` / `<RENDER_URL>` that the controller fills in); screenshot; what it does (the four views, summary, share link, CSV, tutorial); quick start (venv, `pip install -r requirements.txt`, `python scripts/download_data.py`, `python scripts/build_terrain.py`, `uvicorn app.main:app --port 8000`; `npm install`, `npm run dev`); deployment notes (Render blueprint, Vercel root `frontend` + `VITE_API_URL`, `CORS_ORIGINS`, keep-awake monitor on `/api/health`); tech stack; data sources with links; licence (Apache-2.0).
- [ ] `docs/methodology.md`: the same content as the in-app Methods page, expanded with the equations (projection, horizon ray-march along great circles, disk fraction, power), the JPL Horizons validation table (run a one-off script over `backend/tests/fixtures/horizons.json` and paste max |Δel| and |Δaz| per body/site), sanity checks (Shackleton floor 0% sunlight; Connecting Ridge by season: Dec 100%, Mar 45%, Jun 38%, Sep 95%; Chang'e-4 never sees Earth), and limits.
- [ ] `docs/demo-script.md`: 30-second video storyboard (6 shots with narration) and a 7-slide outline, written for the new UI.
- [ ] `docs/screenshot.png`: 1440×900 capture of the sky view with two sites.
- [ ] **Commit:** `git commit -m "docs: README, methodology and demo script"`

**Final gate (controller):** whole-branch review on the most capable model, one fix pass, show the user screenshots, then `git push origin main`; give the user the UptimeRobot and `CORS_ORIGINS` steps; verify the live site.

## Self-Review Notes
- Spec coverage: Stage 1 table → Tasks 1–4; shell/tokens → 7; chips/dialog/map/presets → 8; summary/skeletons → 9; sky view → 10; timeline + elevation chart → 11; numbers/CSV/panel/mobile cards → 12; 3D additions → 13; share/help/glossary/methods → 14; tutorial + Explain removal → 15; phones/a11y → 16; docs → 17. URL state → 5, 6, 14.
- Names used across tasks (`rangeEndOf`, `dayLabel`, `pct`, `maskAt`, `summarize`, `scenarioCsv`, `encodeState`/`decodeState`, `View`, `updateScenario`, `noteEvent`, `newlyCompleted`, `TASKS`, `data-tour` anchors) are defined once in "Shared interfaces" and Global Constraints.
