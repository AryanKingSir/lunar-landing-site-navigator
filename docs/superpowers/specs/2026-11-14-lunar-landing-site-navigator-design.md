# Lunar Landing Site Navigator — Design Spec

## Context
This is a NASA Space Apps 2026 challenge, "Lunar Landing Site Navigator", built over a 48h hackathon with about 40h left. The repo is empty (LICENSE only). The goal is an intuitive web tool for mission planners (primary), educators and the public (via an explainer mode). Users compare landing sites and dates, and see Sun and Earth positions against the **real terrain horizon** to judge solar power and direct-to-Earth (DTE) comms windows.

From the official challenge page (spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator):
- Curated sites (Apollo, CLPS, commercial and international) plus custom lat/lon, compared side by side.
- Flexible dates; time remaining until sunset and Earthset; solar elevation, sunlight duration, Earth windows.
- 2D, 3D and timeline/animation views; works for experts and the public.
- Data: JPL Horizons (ephemeris), LOLA (topography), Quickmap and Moon Trek. No atmosphere means no refraction: the horizon is terrain plus curvature. Libration matters.

## Decisions (confirmed with user)
- **Stack:** Python **FastAPI** backend (Skyfield + NAIF lunar kernels + numpy) and **React + Vite + TypeScript** frontend.
- **Terrain:** real LOLA horizons (the main differentiator).
- **Sites:** south-pole sites get terrain horizons. Apollo, Chandrayaan-3, Chang'e-4 (far side, so never sees Earth) etc. get a smooth-sphere horizon as an educational contrast.
- **MVP views (all required):** horizon panorama, timeline/Gantt, side-by-side comparison, **3D terrain at full priority**.
- **Metrics:** geometric visibility + simple solar power + DSN-aware DTE.
- **UI:** mission-control dark, amber Sun, blue Earth. Planner-dense by default, with an "Explain" mode.
- **Deploy:** public URL (frontend on Vercel, backend Docker on Render). The user will create accounts at deploy time.
- **Deliverables:** README, a methodology doc, and a demo video script / slide outline.
- **Git:** small frequent commits on `main`.

## Architecture

```
backend/                     (uv, Python 3.11)
  app/main.py                FastAPI: GET /api/sites, POST /api/scenario, GET /api/health; CORS
  app/ephemeris.py           Skyfield: Sun/Earth topocentric az/el/distance at a lunar lat/lon, vectorized
  app/terrain.py             DEM load (polar stereographic), latlon<->xy, horizon_mask(lat,lon,obs_h)
  app/visibility.py          Sun disk visible fraction, Earth visible, interval/window extraction, countdowns
  app/dsn.py                 Goldstone/Madrid/Canberra: Moon elevation >= 10 deg check
  app/power.py               W output for panel modes (vertical sun-tracking / horizontal / fixed azimuth)
  app/scenario.py            orchestrates the above into one ScenarioResult (pydantic); LRU cached
  data/sites.json            curated sites with lat, lon, category, mission, source citation
  data/horizons/*.json       precomputed 80 m horizon masks for curated sites
  scripts/download_data.py   fetches kernels + DEM with size checks (into data/raw, gitignored)
  scripts/build_terrain.py   DEM -> npy; 240 m downsample (server); 16-bit heightmap PNG (3D); curated masks
  tests/                     pytest
frontend/                    (Vite + React + TS, zustand, D3, react-three-fiber/drei)
  src/api.ts, src/store.ts   typed API client; global state: scenarios[], currentTime, playing
  components/SitePicker      curated list + custom lat/lon + clickable south-pole hillshade map
  components/ScenarioBar     2-4 scenario columns (site x date range), add/duplicate/remove
  components/MetricCards     illum %, longest night, Earth %, DTE %, mean power, energy, Sun el now, countdowns
  components/HorizonPanorama 360 deg skyline (D3/SVG), Sun/Earth tracks, current markers, shaded terrain
  components/TimelineGantt   stacked Sun / Earth / DTE bars per scenario, shared time axis
  components/TimeScrubber    shared current time, play/pause animation, speed control
  components/Terrain3D       r3f terrain mesh, directional light = Sun vector (live shadows), Earth sprite, site pins
  components/ExplainMode     guided steps + tooltips ("why the Sun skims the horizon", libration, "move 1 km")
```

### Data
- **Ephemeris:** Skyfield with `de440s.bsp` and the lunar orientation kernels from Skyfield's documented Moon-frame recipe (`moon_080317.tf`, `pck00008.tpc`, `moon_pa_de421_1900-2050.bpc`, frame `MOON_ME_DE421`). Libration is inherent in the frame.
- **Terrain:** LOLA `ldem_80s_80m.img` (PDS Geosciences, polar stereographic, about 115 MB, verified it exists). It covers 80–90°S, so ray-marches stay in coverage for sites south of about 84.5°S. Beyond the DEM edge, fall back to a smooth sphere and flag it in the result.
  - Curated south-pole sites: precomputed masks from the 80 m data.
  - Custom coordinates: computed on demand from a 240 m downsample (about 13 MB, fits Render's free 512 MB).
- **Sites (coords cited in `sites.json`):** Shackleton rim / Connecting Ridge, de Gerlache rim, Malapert Massif, Mons Mouton (IM-2 / VIPER area), Haworth, Nobile rim, Cabeus B peak, Slater Plain (the NASA Artemis III candidate regions), Chang'e-7 target. Smooth-horizon contrast sites: Apollo 11/15/17, Chandrayaan-3, Chang'e-4.

### Core algorithms
- **Horizon mask:** 720 azimuths (0.5°). March outward up to 150 km at step ≈ DEM resolution. Elevation angle = `atan2((R+h)cos(d/R) − (R+h0+obs_h), (R+h)sin(d/R))`, with R = 1737.4 km and observer height 2 m by default. Keep the max per azimuth. Vectorized numpy.
- **Sun visible fraction:** circular-segment area of the Sun disk (angular radius from distance) above mask(az).
  - Earth: visible when its disk center is above the mask; fraction is also reported.
- **DTE** = Earth visible at site AND at least one DSN complex sees the Moon at ≥ 10° elevation. Per-station breakdown is returned.
- **Power:** P = 1361·(1 AU/r)²·f_vis·cos(incidence)·area·eff. Defaults: vertical sun-tracking panel, 1 m², 30%. Horizontal and fixed-azimuth modes are selectable.
- **Windows and metrics:** boolean series become intervals. Metrics: illumination %, longest dark (h), Earth %, DTE %, mean W, Wh per lunar day, next sunset/Earthset from currentTime.
- **API:** `POST /api/scenario {lat, lon, start, end, step_min=10, obs_h, panel}` → `{horizon{az,el}, samples{t,sun_az,sun_el,sun_frac,earth_az,earth_el,earth_vis,dsn{...},dte,power_w}, windows{sun,earth,dte}, metrics, terrain_source}`. 30 days at 10 min is 4,320 samples. Results are cached.

## Build order (≈40h; I write the code, with parallel subagents where noted)
Work test-first on the backend (pytest). Commit after each step.

0. **Spec + plan docs.** Save this design to `docs/superpowers/specs/2026-11-14-lunar-landing-site-navigator-design.md`, then `superpowers:writing-plans` for the task-level plan. Commit.
1. **Scaffold (H0–2).** uv backend, Vite frontend, `.gitignore` (data/raw), download script. Downloads run in the background.
2. **Ephemeris (H2–5).** TDD against a JPL Horizons fixture (topocentric `coord@301` for 2 sites × 3 times, fetched once and stored in `tests/fixtures`). Tolerance 0.05°.
3. **Terrain (H5–10).** Tests: a flat synthetic DEM gives mask ≈ −dip (about −0.05°); a synthetic Gaussian peak gives the analytic angle; reading the real DEM gives sane values (Shackleton rim has a low horizon, the crater floor a high one). Then build curated masks, the 240 m npy and the 3D heightmap PNG.
4. **Visibility, DSN, power, scenario, API (H10–14).** Unit tests for the disk-fraction formula, interval extraction and DSN checks. API test via FastAPI TestClient.
5. **Frontend core (H14–26).** Layout and theme (load the `frontend-design` skill first), SitePicker, ScenarioBar, MetricCards, HorizonPanorama, TimelineGantt, TimeScrubber. **In parallel:** a subagent builds Terrain3D against the same store and API contract.
6. **Explain mode + polish (H26–30).** Guided tour, tooltips, empty and error states, and loading states for Render cold starts.
7. **Deploy (H30–33).** Backend Dockerfile on Render (bundles kernels, 240 m DEM, masks) and frontend on Vercel with `VITE_API_URL`. The user creates the accounts.
8. **Docs + demo (H33–37).** README, `docs/methodology.md` (sources, equations, assumptions, Horizons validation numbers, limits), `docs/demo-script.md` (30 s video storyboard + 7-slide outline).
9. **Buffer / recording (H37–40).**

**Risk fallbacks:**
- If the Skyfield Moon frame fails validation, precompute curated ephemerides via the Horizons API.
- If the 3D view slips, ship a simplified globe while the 2D views stay intact.
- If a site falls outside the DEM, use the smooth horizon with a visible badge.

## Verification
- `cd backend && uv run pytest`: Horizons agreement ≤ 0.05°, terrain synthetic tests, visibility/DSN/power units, API contract.
- `cd frontend && npm run build && npx vitest run` (pure utils: intervals, countdown formatting).
- End to end: run both servers, then Playwright MCP.
  - Pick Shackleton rim + Apollo 11 for the same 30 days.
  - Check that the panorama shows the Sun skimming the terrain at the pole and arcing high at Apollo 11.
  - Check that the Gantt windows match the metric cards and that scrubbing moves the 3D shadows and the panorama markers together.
  - Check that Chang'e-4 shows 0% Earth / DTE.
  - Take screenshots.
- Spot-check one Sun window against Quickmap or Horizons and record it in the methodology doc.
- Check the deployed URLs: `/api/health` and the full flow on the Vercel URL.
