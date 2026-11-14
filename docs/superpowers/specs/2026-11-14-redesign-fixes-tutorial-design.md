# Fixes, redesign and tutorial — Design Spec (round 2)

## Context
The app is built, reviewed and live (Render + Vercel). The team's test review found one real logic bug, several UI problems and a list of missing features. The user also finds the UI too complex and "AI-looking", and wants a first-time tutorial.

This round does three things:
1. Fixes every confirmed bug from the review (list A).
2. Adds the requested features (list C), minus PNG export.
3. Replaces the dense dashboard with a simpler, plain-language interface and a learn-by-doing tutorial.

The backend maths is validated and does not change, apart from small speed work.

## Decisions (confirmed with the user)
- **Layout:** one big view at a time, switched by tabs (Sky view / 3D terrain / Timeline / All numbers). Site chips on top, a plain-language summary per site under them, and the time bar pinned at the bottom.
- **Look:** a light moon-grey page with dark text. Only the sky view and 3D view are black, like windows into space. No neon colours. Sun stays amber, Earth stays blue.
- **Audience:** anyone. Plain words first; exact angles, watts and technical terms live in "All numbers" and in hover tips.
- **Chips:** each chip is a site plus its landing date. A new chip copies the current date. The chip menu has: change date, land a month later, remove.
- **Summary:** key numbers plus one plain sentence per site. No good/bad ratings.
- **Tutorial:** 8 learn-by-doing tasks in a checklist panel on the right. Each task completes itself when done, has a "Show me" hint, and can be skipped. It starts on the first visit and can be replayed from Help.
- **Explain panel:** removed. Its five lessons become the short explanations shown as tutorial tasks complete; Help gets a glossary and a "Methods & data" page.
- **Extras:** zoomable map yes; PNG export no.
- **Keep-awake:** the user sets up UptimeRobot; the app also wakes the server on page open.
- **Deploy:** push the bug-fix stage as soon as it passes; push the redesign and tutorial together after the user has seen screenshots.

## Design system
Avoid the usual generated-UI tells: no all-caps labels, no monospace for small text, no "A · B · C" strings, no boxes inside boxes.

- **Colour**
  - Page `#e4e4e1` (regolith), raised surface `#f3f3f1`, ink `#1e2125`, soft ink `#5a5f66`, hairline `#c4c5c2`.
  - Sky windows `#0b0d12`.
  - On the light page: Sun `#b86e00`, Earth `#1d6aa8`, Earth link `#2c7556`.
  - Inside dark windows: Sun `#f0a52a`, Earth `#62aee8`, Earth link `#74c39c`.
  - Primary button is ink-coloured, not amber, so it no longer clashes with the Sun colour.
  - Each site gets a letter tag (A–D) as well as a colour, so nothing depends on colour alone.
- **Type:** Atkinson Hyperlegible for everything (chosen for legibility on a projector), with tabular numerals for figures. Sentence case throughout. Body text 15–16 px.
- **Layout:** single left-aligned column, max width about 1180 px. Sections are separated by space and hairlines, not cards. Touch targets are at least 44 px.
- **Principle:** the dark sky window is the one bold element; everything around it stays quiet.
- **Wording:** "Sunlight", "Earth in view", "Radio link to Earth" (technical term DTE in the hover tip), "Day 12, 14:00" instead of "T+12d 14h".

## Stage 1: bug fixes and speed (push when verified)
| Fix | Where |
|---|---|
| End-of-period bug: at the last instant every window reads "down / hidden / none in period". Treat the range end as inside the last window, and pass the true end (last sample + step). | `frontend/src/lib/time.ts` (`windowStatus`), `ComparisonGrid.tsx`, new tests in `lib/time.test.ts` |
| Playback stutter: render the 3D scene only when time or settings change (`frameloop="demand"` + `invalidate`), shadow map 4096 → 2048, cap the per-frame time step. | `Terrain3D.tsx`, `TimeScrubber.tsx` |
| 3D looks black while "Sun visible": add a low fill light so grazing-lit ground is readable; label the legend "At ‹site›"; clearer note when the active site is outside the polar model. | `Terrain3D.tsx` |
| Failures are silent: banner with Retry when the site list fails; Retry on a failed scenario; wake the server on page open and show "Waking the server, this can take a minute". | `store.ts`, `api.ts`, new `components/StatusBanner.tsx` |
| Slow first response: warm the two default scenarios in a background thread at server start; round arrays more tightly to shrink the response (target under 80 KB gzipped). Response keys stay the same. | `backend/app/main.py`, `backend/app/scenario.py`, tests |
| Share previews and motion: meta description, Open Graph tags, `prefers-reduced-motion` respected. | `frontend/index.html`, `styles.css` |

## Stage 2: new interface
Existing logic is reused: `store.ts` (scenarios, stale-response guard, time clamp), `lib/time.ts`, `lib/scale.ts`, `lib/projection.ts`, `lib/terrain.ts`, `lib/validate.ts`, and the memoised drawing code inside `HorizonPanorama`, `TimelineGantt` and `Terrain3D`.

- **Shell and tokens.** Rewrite `styles.css` and `App.tsx` to the new layout; swap fonts in `index.html`. `Header` becomes title + Share + Help.
- **Store additions.** `view` (active tab), `updateScenario(id, patch)` for date changes, tutorial state. Remove `explain`.
- **Site chips + Add-site dialog.** Replaces `ScenarioList` and `AddScenario`.
  - Chips: letter tag, name, date shown only when dates differ, and a menu (change date, land a month later, start at next sunrise, remove).
  - Dialog: grouped site list, custom coordinates, and the map with wheel/pinch zoom, drag to pan, tap to drop a pin and large invisible hit areas on pins.
  - Dates: a native date picker with presets (Today, +1 lunation, 2030).
- **Summary strip.** One column per site: Sunlight %, Earth in view %, Radio link %, and one generated sentence, e.g. "Sunlit all month. Earth comes into view on day 13 for 14 days." New pure function `lib/summary.ts` with tests. Skeleton placeholders while loading; a loading chip stays one line tall.
- **Sky view tab** (from `HorizonPanorama`): stronger skyline and compass labels, "Sun" and "Earth" labelled inside the chart, a small legend, and a one-line note explaining that the faint lines are the paths over the whole period.
- **3D terrain tab** (from `Terrain3D`): scale bar, north arrow, larger lettered site markers, a labelled Earth marker.
- **Timeline tab** (from `TimelineGantt`): legend, every row labelled in words, long names handled. New chart above it for the active site: Sun and Earth height above the horizon over time, drawn against the terrain height in that direction, with hidden periods shaded. New helper `maskAt(az)` in `lib/horizon.ts`, tested.
- **All numbers tab** (from `ComparisonGrid`): value and status on separate lines; "now" vs "average" labelled clearly; solar-array setting lives here; **Download CSV** per site (`lib/csv.ts`, tested). On phones the table becomes one card per site.
- **Share.** Scenarios, time, tab and active site are stored in the URL (`lib/urlState.ts`, tested) and restored on load; **Copy link** button in the header.
- **Help.** A drawer with: replay tutorial, glossary, and "Methods & data" (ephemeris source, LOLA terrain, DSN model, power assumptions, accuracy vs JPL Horizons, known limits, source links). Glossary terms also get hover tips through a small `Term` component.
- **Phones.** Stacked summary, scrollable tabs, no horizontal overflow, tutorial as a bottom sheet.

## Stage 3: tutorial
New `components/Tutorial.tsx` + `lib/tutorial.ts` (task definitions and completion checks, tested). Progress is saved in `localStorage`.

| # | Task | Completes when | Lesson shown |
|---|---|---|---|
| 1 | Pick a site | another chip becomes active | Pole vs equator: the Sun skims the horizon at the pole |
| 2 | Move time until Earth rises at Connecting Ridge | Earth becomes visible at the active site | Earth bobs on the horizon (libration) |
| 3 | Open the 3D terrain | 3D tab opened | Long shadows; terrain decides power |
| 4 | Add Shackleton's crater floor | that site is added | Same neighbourhood, opposite fates |
| 5 | Land a month later | a shifted copy is added | What a schedule slip changes |
| 6 | Read the timeline | Timeline tab opened and a time clicked | A link needs both ends (ground stations) |
| 7 | Open All numbers | tab opened | What each number means |
| 8 | Share your comparison | Copy link pressed | Done; points to Download CSV and Help |

"Show me" highlights the relevant control. `ExplainPanel.tsx` is deleted after its text is moved.

## Stage 4: wrap-up
- README, `docs/methodology.md`, `docs/demo-script.md` (the original Task 17), reusing the Methods text.
- Steps for the user: UptimeRobot monitor on `<render-url>/api/health` every 5 min; set `CORS_ORIGINS` on Render to the Vercel URL. The user needs to send the Render URL.
- Final review of the whole branch, then the second push.

## How the work runs
Same process as before: design spec to `docs/superpowers/specs/`, task-level plan via the writing-plans skill to `docs/superpowers/plans/`, then one subagent per task with a review after each, tracked in `.superpowers/sdd/progress.md`. Backend and pure frontend logic are written test-first. The frontend-design skill is loaded for the shell task.

## Verification
- `cd backend && .venv/bin/pytest -q` and `cd frontend && npx vitest run && npm run build`: all green, no warnings.
- Browser checks with the headless Chromium script (`scratchpad/pw/shot.mjs`), screenshots at 1440×900, 1280×720 and 390×844:
  - Slider at the very end: Apollo 11 shows Earth in view, Connecting Ridge shows Sun up.
  - Each tab renders; playback at 6 h/s advances smoothly with the 3D tab open.
  - Open a copied share link in a fresh page: same sites, dates, time and tab.
  - CSV download has one row per time step with the right columns.
  - Tutorial: complete all 8 tasks by acting in the app; reload mid-way and progress is kept; Skip and replay work.
  - Stop the backend: banner with Retry appears; restart and Retry recovers.
  - No console errors; no horizontal scroll at 390 px.
- After each push: `/api/health` and the full flow on the live URLs.
