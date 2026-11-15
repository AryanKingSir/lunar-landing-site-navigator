# Lunaris 30-second demo video

Every frame comes from the live site (`https://lunar-landing-site-navigator-pi.vercel.app/`), captured with Playwright and composed with Remotion. Voice and sound come from ElevenLabs.

Output: `out/lunaris-demo-30s.mp4` (1920×1080, 60 fps, H.264 + AAC, 30.0 s).

## Story

Script, captions, scene lengths, voice timing and click moments all live in `video/timing.json`.

| Time | Picture | Caption | Voice |
|---|---|---|---|
| 0–4.5 s | Logo over Connecting Ridge's real skyline, the Sun skimming along it | Where every shadow matters. | The lunar south pole. Where every shadow matters. |
| 4.5–9.5 s | Add Shackleton crater floor, zoom on the summary | Any site. Any date. | Lunaris compares any landing site, on any date, in seconds. |
| 9.5–15.5 s | Sky view, Day 2 → 17: Sun and Earth over the LOLA skyline | Real NASA terrain. Real horizons. | Real NASA terrain shows exactly when the Sun, and Earth, clear the horizon. |
| 15.5–21 s | 3D terrain, shadows over 5 days | Light and shadow, hour by hour. | Watch light and shadow move across the pole, hour by hour. |
| 21–26 s | All numbers: radio link to Earth (blue), then solar power and energy (orange) | Solar power. A link to Earth. | Solar power, and a radio link to Earth. Measured for every site. |
| 26–30 s | Share → end card with the URL | Plan it. Share it. | Plan your landing. Share it with your team. Lunaris. |

## Re-render

```sh
cd demo
npm install
npx playwright install chromium      # once
node capture/capture.mjs             # all scenes + intro skyline (horizon), or e.g. `node capture/capture.mjs energy share`
source audio/key.sh                  # ELEVENLABS_API_KEY (from the env, or the elevenlabs MCP entry in ~/.claude.json)
node audio/voice.mjs hpp4J3VqNfWAUOO0d1Us:bella    # lines from video/timing.json → assets/vo/bella/
node video/render.mjs                # mixes assets/soundtrack.wav, then renders; add --draft for a fast half-size preview
npm run studio                       # live preview in Remotion Studio
```

### Audio

`audio/mix.py` builds the whole soundtrack sample-accurately (macOS `afconvert` + numpy), and Remotion just plays that one track:

- **Voice:** each line has the TTS mouth-click artefacts in its pauses removed, is levelled to the same loudness, and is placed at its scene's `voAt`.
- **Music bed:** fades in and out, and ducks smoothly under the voice.
- **Clicks:** each cursor click gets a short synthesised tick.
- **Peaks:** a soft limiter keeps them under -1 dBFS.

The mixer warns if a voice line runs into the next one.

### Using the Lara voice

Lara (`vChnJZ1Cu89g2XXumPfT`) is a Voice Library voice, and the ElevenLabs API only allows library voices on a paid plan. Either:

- **Paid plan:** `node audio/voice.mjs vChnJZ1Cu89g2XXumPfT:lara`.
- **Website:**
  1. In ElevenLabs, add Lara to My Voices.
  2. In Text to Speech (Multilingual v2), generate each `line` from `video/timing.json`.
  3. Save the files as `assets/vo/lara/line-1.mp3` … `line-6.mp3`.

`node video/render.mjs` uses `lara` automatically when those files exist (otherwise `bella`; or pass `--voice=<name>`).

Other generated voices are in `assets/vo/` (alice and george read the previous script). The music bed (`assets/music.mp3`) comes from the ElevenLabs sound-effects API; the music API needs a paid plan.

## YouTube

**Title:** Lunaris: compare lunar landing sites by sunlight and Earth view (NASA Space Apps 2026)

**Description:**

> Lunaris helps mission planners pick where and when to land near the Moon's south pole. It compares sites and dates by how much sunlight they get and when Earth (and a Deep Space Network radio link) is in view, using the real terrain horizon from NASA's LOLA laser altimeter data.
>
> Try it: https://lunar-landing-site-navigator-pi.vercel.app/
>
> Built for the NASA Space Apps Challenge 2026, "Lunar Landing Site Navigator".
> Data: NASA LRO LOLA (LDEM 80 m south polar DEM), JPL DE440 ephemerides.
> Voice and sound: ElevenLabs.
