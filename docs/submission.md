# NASA Space Apps 2026: project submission

Answers for every field on the team's Project page, in the order the form shows them. Copy the text under each **Answer** heading into the matching field.

**Deadline:** Sunday, November 15, 11:59 p.m., local time of our Local Event. Saving does not submit: click **Submit for Judging**.

## Before you submit

- [ ] **Upload the demo video.** Upload `demo/out/lunaris-demo-30s.mp4` to YouTube.
  - Visibility: **Unlisted** or **Public** (not Private).
  - "Made for kids": **No**.
  - Title and description: copy from [YouTube upload](#youtube-upload) below.
- [ ] **Test the link.** Open the YouTube link in a private window and check it plays without signing in.
- [ ] **Fill in every field below**, then click **Save Progress**.
- [ ] **Tick both boxes:** "Terms and Conditions" and "Confirm All Work is Original".
- [ ] **Click Submit for Judging** and wait for the confirmation banner.

---

## 1. Project Summary

### Project Name

**Answer**

Lunaris - Lunar landing site navigator

### Summary \*

*50–200 words suggested, 1,500 characters max. This answer is 177 words, 1,012 characters.*

**Answer**

Lunaris is a free web app that helps mission planners choose where and when to land near the Moon's south pole. There, the Sun skims only a degree or two above the horizon, so a ridge kilometres away can decide whether a lander gets solar power or can talk to Earth. Lunaris traces each site's real horizon from NASA's LOLA laser-altimeter terrain and combines it with JPL ephemerides. For any site and landing date it shows when the Sun is visible, how much power a solar panel would produce, when Earth is in view, and when a direct radio link through NASA's Deep Space Network is possible. Up to four site-and-date scenarios can be compared side by side: a plain-language summary, a 360° sky view, lit 3D terrain with live shadows, a timeline, and a full numbers table. Any comparison can be shared with one link. Lunaris turns heavy orbital and terrain geometry into answers anyone on a team can read in seconds, which matters as Artemis and other missions target the pole's few well-lit, Earth-facing spots.

---

## 2. Project Links

### Project Demonstration \*

*A video of 30 seconds or less, at a public link (no password, permission or registration). Use the full URL, starting with `https://`.*

**Answer**

The YouTube link of the uploaded demo, for example `https://www.youtube.com/watch?v=...`

### Project \*

*A public link to the final project.*

**Answer**

https://lunar-landing-site-navigator-pi.vercel.app/

---

## 3. Project Details \*

*What does it do or how does it work? Benefits? Intended impact? Tools, languages, hardware, software? How is it creative? What factors did the team consider?*

**Answer**

The headings below are in capitals so they survive pasting. They can be made bold in the form's editor.

WHAT IT DOES

Lunaris compares lunar landing sites and dates by what a lander can actually see from the surface: the Sun, for power, and Earth, for communication.

Pick up to four scenarios, each a site plus a landing date and mission length:
- curated sites: Artemis III candidate areas such as Connecting Ridge and Malapert Massif, the Chang'e-7 target, IM-2 Athena, and permanently shadowed craters;
- contrast sites: Apollo, Chandrayaan-3 and Chang'e-4;
- or any point dropped on a zoomable south-pole map.

For each one, Lunaris shows:
- Summary: sunlight, Earth in view and radio link to Earth as percentages, plus one plain sentence.
- Sky view: the real 360° skyline around the site, with the Sun's and Earth's paths and current positions, labelled when hidden by terrain.
- 3D terrain: the south pole lit by the real Sun direction at the chosen moment, with live shadows and site markers.
- Timeline: every window of sunlight, Earth visibility and radio link over the mission.
- All numbers:
  - countdowns ("Sets in 3 days 4 hours");
  - period totals and the longest night;
  - average solar power and total energy for three panel orientations;
  - a CSV download of every time step.

One time control drives every view, and Share copies a link that reopens the exact comparison.

HOW IT WORKS

- Sun and Earth positions: NASA JPL's DE440 ephemeris through Skyfield, in the Moon's mean-Earth frame (NAIF lunar frame kernels), so libration is included. Checked against JPL Horizons: the largest difference in 12 checks was 0.0038°.
- Terrain horizon: from NASA's LRO LOLA polar elevation model (LDEM_80S_80M, 80 m per pixel). For 720 directions around each site, we trace the true great circle out to 150 km and keep the highest elevation angle, including the Moon's curvature.
- Visibility: the visible share of the Sun's disk above the local horizon. Earth counts as in view when at least half its disk clears the terrain.
- Radio link: Earth must be in view from the site, and at least one Deep Space Network complex (Goldstone, Madrid or Canberra) must see the Moon at 10° or more.
- Power: 1361 W/m², scaled by Sun distance, visible disk share and panel angle, for a 1 m² panel at 30% efficiency. The panel can be upright and Sun-tracking, flat, or fixed facing north.
- Sanity checks:
  - Shackleton's floor gets 0% sunlight.
  - Connecting Ridge gets 100% in December 2026 and 38% in June 2027.
  - Chang'e-4, on the far side, never sees Earth.
  - Apollo 11 gets about 50% sunlight.

BENEFITS AND INTENDED IMPACT

At the pole, small differences decide a mission. In December 2026, Connecting Ridge is sunlit 100% of the time and could collect about 303 kWh from a 1 m² panel over a month, while Shackleton's floor next to it gets nothing. Moving a few kilometres, or landing a month later, changes everything.

Lunaris makes these trade-offs visible in seconds without specialist software. Engineers, students and the public can test "what if we land here, or later?" and share the answer. We hope it helps teams shortlist sites and dates early, and helps people understand why the lunar south pole is so hard and so valuable.

WHAT MAKES IT CREATIVE

It turns heavy geometry into views anyone can read: a skyline "from the lander's eyes", a lit 3D pole, and plain sentences instead of raw angles. It is built for comparison: several sites and dates side by side, synced to one clock and shareable as a link. An interactive 8-step tutorial teaches the app by doing.

FACTORS WE CONSIDERED

- Accuracy: checked against JPL Horizons and published heights.
- Honest limits: no boulders under 80 m, and no relay satellites or heat modelling. Sites outside the polar terrain model are flagged.
- Readability: plain words, a highly legible font, and keyboard access.
- Speed: horizons are precomputed for curated sites and cached; custom pins are computed on demand.

TOOLS AND LANGUAGES

- Backend: Python (FastAPI, Skyfield, NumPy), hosted on Render.
- Frontend: TypeScript, React, Vite, zustand and three.js (react-three-fiber), hosted on Vercel.
- Demo video: Playwright (capturing the live site) and Remotion.
- Open source (Apache-2.0): https://github.com/AryanKingSir/lunar-landing-site-navigator

---

## 4. Use of Super Intelligence (SI) \*

*For data collection only; judges do not see this answer, but they do see the SI labels in the project.*

**Categories** (if the field is a picker)

Coding, Debugging or Troubleshooting, Presentation, Video, Audio

**Answer** (if the field is text)

Yes. Our team chose the challenge, set the requirements and features, made the design decisions, and tested the app. We used Anthropic's Claude (Claude Code) as a coding assistant to plan the implementation, write most of the code and documentation, debug, and script the demo video's capture and editing. All results were checked against NASA JPL Horizons and published values. The demo video's narration and sound are AI-generated with ElevenLabs (text-to-speech and sound effects). This is stated on the video's end card, in its description and in its file metadata. All app footage in the video is real screen capture of the live site. No SI-generated images are used, and nothing generated uses NASA branding. The code's AI assistance is noted in the repository README and in the commit metadata (Co-Authored-By: Claude).

**Where the SI labels are**

| Rule | Where we meet it |
|---|---|
| Audio: acknowledge in descriptive text and metadata | Video end card, YouTube description, and MP4 file metadata (`comment` tag) |
| Code: acknowledge in descriptive text and metadata | README "Use of AI" section, and `Co-Authored-By: Claude` in commits |
| Images and videos: visible watermark if SI-generated | Not applicable: no SI-generated images; video footage is real screen capture |

---

## 5. NASA Data \*

*Click **Add New Link** once per row. Put the name in "Link Text" and the full URL in "Link Url".*

| Link Text | Link Url |
|---|---|
| LRO LOLA polar elevation model LDEM_80S_80M (PDS Geosciences Node) | https://pds-geosciences.wustl.edu/missions/lro/lola.htm |
| LOLA gridded data products (LDEM files) | https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/ |
| JPL DE440 planetary ephemeris and lunar frame kernels (NAIF SPICE) | https://naif.jpl.nasa.gov/naif/data.html |
| NAIF generic kernels (de440s.bsp, moon_pa_de421, moon_080317.tf) | https://naif.jpl.nasa.gov/pub/naif/generic_kernels/ |
| JPL Horizons (used to validate Sun and Earth positions) | https://ssd.jpl.nasa.gov/horizons/ |
| LROC QuickMap (site locations and terrain checks) | https://quickmap.lroc.asu.edu/ |
| NASA Moon Trek | https://trek.nasa.gov/moon/ |
| NASA NSSDCA (Apollo landing site coordinates) | https://nssdc.gsfc.nasa.gov/ |

---

## 6. Space Agency Partner & Other Data

*Same as above: one **Add New Link** per row.*

**Space Agency Partner data**

| Link Text | Link Url |
|---|---|
| Chandrayaan-3 landing site (ISRO) | https://www.isro.gov.in/ |

**Our project resources**

| Link Text | Link Url |
|---|---|
| Landing-site list with a source for every coordinate | https://github.com/AryanKingSir/lunar-landing-site-navigator/blob/main/backend/data/sites.json |
| Methodology and validation | https://github.com/AryanKingSir/lunar-landing-site-navigator/blob/main/docs/methodology.md |
| Project source code (Apache-2.0) | https://github.com/AryanKingSir/lunar-landing-site-navigator |

**Libraries, fonts and services**

| Link Text | Link Url |
|---|---|
| Skyfield (astronomy library) | https://rhodesmill.org/skyfield/ |
| FastAPI | https://fastapi.tiangolo.com/ |
| NumPy | https://numpy.org/ |
| React | https://react.dev/ |
| three.js | https://threejs.org/ |
| react-three-fiber | https://github.com/pmndrs/react-three-fiber |
| Vite | https://vite.dev/ |
| Atkinson Hyperlegible Next font | https://fonts.google.com/specimen/Atkinson+Hyperlegible+Next |
| Playwright (demo capture) | https://playwright.dev/ |
| Remotion (demo video) | https://www.remotion.dev/ |
| ElevenLabs (AI voice and sound in the demo) | https://elevenlabs.io/ |
| Claude Code by Anthropic (AI coding assistant) | https://www.anthropic.com/claude-code |
| Vercel (frontend hosting) | https://vercel.com/ |
| Render (API hosting) | https://render.com/ |

---

## YouTube upload

**File:** `demo/out/lunaris-demo-30s.mp4` (30.0 s, 1920×1080, 60 fps)

**Title**

Lunaris: compare lunar landing sites by sunlight and Earth view (NASA Space Apps 2026)

**Description**

Lunaris helps mission planners pick where and when to land near the Moon's south pole. It compares sites and dates by how much sunlight they get and when Earth (and a Deep Space Network radio link) is in view, using the real terrain horizon from NASA's LOLA laser altimeter data.

Try it: https://lunar-landing-site-navigator-pi.vercel.app/

Built for the NASA Space Apps Challenge 2026, "Lunar Landing Site Navigator".
Data: NASA LRO LOLA (LDEM 80 m south polar DEM), JPL DE440 ephemerides.
Narration and sound are AI-generated (ElevenLabs text-to-speech and sound effects). All app footage is real screen capture of the live site.

**Settings:** Visibility Unlisted or Public. Audience: "No, it's not made for kids".

---

## Rules we checked

- **Demo length:** 30.0 s, within the 30-second limit.
- **Language:** all content is in English.
- **No minors:** no images, video, audio or likeness of anyone under 18. The narration is an AI voice, and no team member appears.
- **NASA data:** at least one NASA data source is used (several, listed above), as required for Global Awards.
- **Links:** every link above was checked and opens without a login.
