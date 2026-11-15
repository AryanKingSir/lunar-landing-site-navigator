# Lunaris 30-second demo video

Every frame comes from the live site (`https://lunar-landing-site-navigator-pi.vercel.app/`), captured with Playwright and composed with Remotion. Voice and sound come from ElevenLabs.

Output: `out/lunaris-demo-30s.mp4` (1920×1080, 60 fps, H.264 + AAC, 30.0 s).

## Story

| Time | Picture | Caption | Voice |
|---|---|---|---|
| 0–4.5 s | Logo over Connecting Ridge's real skyline, the Sun skimming along it | At the lunar south pole, the Sun barely rises. | At the Moon's south pole, the Sun barely clears the horizon. |
| 4.5–9.5 s | Add Shackleton crater floor, zoom on the summary | Compare any site, any date. | Lunaris compares landing sites and dates in seconds. |
| 9.5–15.5 s | Sky view, Day 2 → 17 | The real horizon, from NASA laser data. | See the real skyline, from NASA laser data, and exactly when Earth rises. |
| 15.5–21 s | 3D terrain, shadows over 5 days | Light and shadow, hour by hour. | Watch sunlight and shadow sweep across the terrain. |
| 21–26 s | All numbers → power and energy rows | Solar energy, site by site. | And see how much solar energy each site can collect. |
| 26–30 s | Share → end card with the URL | Share it with your team. | Then share it with your team. Lunaris. |

## Re-render

```sh
cd demo
npm install
npx playwright install chromium      # once
node capture/capture.mjs             # all scenes + intro skyline (horizon), or e.g. `node capture/capture.mjs energy share`
source audio/key.sh                  # ELEVENLABS_API_KEY (from the env, or the elevenlabs MCP entry in ~/.claude.json)
node audio/voice.mjs Xb7hH8MSUJpSbSDYk0k2:alice    # voice lines → assets/vo/alice/
node video/render.mjs                # voice: alice (default); add --draft for a fast half-size preview
npm run studio                       # live preview in Remotion Studio
```

Trial voices are also in `assets/vo/george` and `assets/vo/brian` (`--voice=george`). The music bed (`assets/music.mp3`) and click (`assets/sfx/click.mp3`) come from the ElevenLabs sound-effects API; the music API needs a paid plan.

The voice lines are in `audio/voice.mjs`, captions and timing in `video/src/Main.tsx`.

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
