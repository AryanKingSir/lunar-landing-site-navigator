import { AbsoluteFill, Audio, Img, interpolate, Sequence as Seq, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import cuesJson from '../../assets/cues.json';
import horizon from '../../assets/horizon.json';
import { BrowserFrame, C, Camera, Caption, center, ClickSound, Cursor, fitZoom, Sequence, Stage, Stills, tween, VIEW, type Box } from './kit';

type Cues = {
  compare: { addSite: Box; shackleton: Box; addButton: Box; summary: Box };
  energy: { tab: Box; rows: Box; scrollFrames: number };
  share: { share: Box };
  sky: { pano: Box; caption: Box; frames: number };
  terrain: { wrap: Box; frames: number };
};
const cues = cuesJson as unknown as Cues;
const PAGE_C = { x: VIEW.w / 2, y: VIEW.h / 2 };
const OFF = { x: VIEW.w + 60, y: VIEW.h * 0.75 };

export type AudioProps = {
  vo: (string | null)[]; voDur: number[]; music: string | null; click: string | null;
  voGain: number; musicGain: number; duckGain: number;
};
export const SCENES = [
  { id: 'intro', frames: 280 },
  { id: 'compare', frames: 320 },
  { id: 'sky', frames: 370 },
  { id: 'terrain', frames: 350 },
  { id: 'energy', frames: 300 },
  { id: 'share', frames: 250 },
] as const;
const FADE = 14; // crossfade between scenes
const VO_AT = [30, 24, 8, 18, 16, 8]; // voice line start, frames into its scene (first line waits 0.5 s)
const STARTS = SCENES.map((_, i) => SCENES.slice(0, i).reduce((n, s) => n + s.frames - FADE, 0));

/** Fades a scene in over its first frames (scenes overlap by FADE). */
function SceneFade({ children, first }: { children: React.ReactNode; first?: boolean }) {
  const frame = useCurrentFrame();
  const op = first ? 1 : tween(frame, 0, FADE, 0, 1);
  return <AbsoluteFill style={{ opacity: op }}>{children}</AbsoluteFill>;
}

// Connecting Ridge's real skyline (LOLA), heights exaggerated, drawn across the bottom of the intro.
const SKY_W = 2400, SKY_H = 300, SKY_BASE = 900;
const skyY = (el: number) => SKY_BASE - (el + 3.5) * 34;
const SKYLINE = horizon.az.map((a, i) => `${i ? 'L' : 'M'}${((a / 360) * SKY_W).toFixed(1)},${skyY(horizon.el[i]).toFixed(1)}`).join(' ');

function Intro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 6, fps, config: { damping: 200, mass: 0.9 } });
  const tag = tween(frame, 40, 70, 0, 1);
  const land = tween(frame, 0, 60, 0, 1);
  const pan = -240 - frame * 0.5;              // slow drift along the horizon
  // The Sun skims sideways along the ridge, its top just clearing it.
  const sunX = 1180 + frame * 0.9;
  const k = Math.round((((sunX - pan) / SKY_W) * 360) / (360 / horizon.az.length)) % horizon.az.length;
  const sunY = skyY(Math.max(...horizon.el.slice(Math.max(0, k - 2), k + 3))) - 6;
  return (
    <Stage>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: land }}>
        <defs>
          <radialGradient id="introGlow">
            <stop offset="0" stopColor={C.sun} stopOpacity="0.55" />
            <stop offset="0.4" stopColor={C.sun} stopOpacity="0.16" />
            <stop offset="1" stopColor={C.sun} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="introLand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#cfd0cc" />
            <stop offset="1" stopColor="#dcdcd8" />
          </linearGradient>
        </defs>
        <circle cx={sunX} cy={sunY} r={260} fill="url(#introGlow)" />
        <circle cx={sunX} cy={sunY} r={13} fill={C.sun} />
        <g transform={`translate(${pan},${(1 - land) * 40})`}>
          <path d={`${SKYLINE} L${SKY_W},1080 L0,1080 Z`} fill="url(#introLand)" />
          <path d={SKYLINE} fill="none" stroke="#9fa19d" strokeWidth={1.5} />
        </g>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center', transform: `translateY(${-70 + (1 - s) * 30}px)` }}>
          <Img src={staticFile('brand/lunaris-logo.png')} style={{ height: 260, opacity: s, transform: `scale(${0.94 + 0.06 * s})` }} />
          <div style={{ marginTop: 18, fontSize: 30, fontWeight: 600, color: C.soft, opacity: tag, transform: `translateY(${(1 - tag) * 10}px)` }}>
            Lunar landing site navigator
          </div>
        </div>
      </div>
      <Caption text="At the lunar south pole, the Sun barely rises." from={90} />
    </Stage>
  );
}

function WindowIn({ children }: { children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200, mass: 1.1 } });
  return <BrowserFrame style={{ transform: `translateY(${(1 - s) * 140}px) scale(${0.96 + 0.04 * s})`, opacity: s }}>{children}</BrowserFrame>;
}

function Compare() {
  const frame = useCurrentFrame();
  const c = cues.compare;
  const zoom = tween(frame, 210, 272, 1, fitZoom(c.summary));
  const focus = { x: tween(frame, 210, 272, PAGE_C.x, center(c.summary).x), y: tween(frame, 210, 272, PAGE_C.y, center(c.summary).y + 20) };
  return (
    <Stage>
      <WindowIn>
        <Camera z={zoom} focus={focus}>
          <Stills items={[[0, 'compare/a-start.jpg'], [90, 'compare/b-dialog.jpg'], [150, 'compare/c-picked.jpg'], [200, 'compare/d-three.jpg']]} />
          <Cursor z={zoom} clicks={[84, 144, 194]} path={[[30, OFF], [80, center(c.addSite)], [100, center(c.addSite)], [140, center(c.shackleton)], [152, center(c.shackleton)], [190, center(c.addButton)], [226, center(c.addButton)], [272, OFF]]} />
        </Camera>
      </WindowIn>
      <Caption text="Compare any site, any date." from={24} />
    </Stage>
  );
}

function Sky() {
  const frame = useCurrentFrame();
  const p = cues.sky.pano;
  const zoom = tween(frame, 10, 110, 1, 1.3);
  const focus = { x: tween(frame, 10, 110, PAGE_C.x, center(p).x), y: tween(frame, 10, 110, PAGE_C.y, center(p).y + 30) };
  return (
    <Stage>
      <BrowserFrame>
        <Camera z={zoom} focus={focus}><Sequence dir="sky" count={cues.sky.frames} /></Camera>
      </BrowserFrame>
      <Caption text="The real horizon, from NASA laser data." from={10} />
    </Stage>
  );
}

function Terrain() {
  const frame = useCurrentFrame();
  const zoom = tween(frame, 0, 360, 1.04, 1.16);
  return (
    <Stage>
      <BrowserFrame>
        <Camera z={zoom} focus={{ x: VIEW.w / 2, y: VIEW.h * 0.42 }}><Sequence dir="terrain" count={cues.terrain.frames} /></Camera>
      </BrowserFrame>
      <Caption text="Light and shadow, hour by hour." from={10} />
    </Stage>
  );
}

function Energy() {
  const frame = useCurrentFrame();
  const c = cues.energy;
  const zoom = tween(frame, 150, 240, 1, 1.08);
  const focus = { x: tween(frame, 150, 240, PAGE_C.x, center(c.rows).x), y: tween(frame, 150, 240, PAGE_C.y, center(c.rows).y) };
  const numbers = interpolate(frame, [74, 79], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const mark = tween(frame, 150, 172, 0, 1);
  const pad = 10;
  return (
    <Stage>
      <BrowserFrame>
        <Camera z={zoom} focus={focus}>
          <Stills items={[[0, 'energy/a-start.jpg']]} />
          {numbers > 0 && <div style={{ position: 'absolute', inset: 0, opacity: numbers }}><Sequence dir="energy/scroll" count={c.scrollFrames} offset={92} /></div>}
          <div style={{ position: 'absolute', left: c.rows.x - pad, top: c.rows.y - pad / 2, width: c.rows.w + 2 * pad, height: c.rows.h + pad,
            borderRadius: 10, background: 'rgba(240,165,42,0.18)', boxShadow: `0 0 0 2px ${C.sun}`, mixBlendMode: 'multiply',
            opacity: mark, transform: `scale(${0.98 + 0.02 * mark})` }} />
          <Cursor z={zoom} clicks={[68]} path={[[14, OFF], [62, center(c.tab)], [84, center(c.tab)], [130, OFF]]} />
        </Camera>
      </BrowserFrame>
      <Caption text="Solar energy, site by site." from={14} />
    </Stage>
  );
}

function Share() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = cues.share;
  const out = spring({ frame: frame - 92, fps, config: { damping: 200 } });
  // Gentle push-in on the Share button so "Link copied" reads, eased back as the window leaves.
  const z = tween(frame, 4, 44, 1, 1.35);
  const focus = { x: tween(frame, 4, 44, PAGE_C.x, center(c.share).x - 200), y: tween(frame, 4, 44, PAGE_C.y, center(c.share).y + 120) };
  const rise = (from: number) => {
    const v = spring({ frame: frame - from, fps, config: { damping: 200, mass: 0.8 } });
    return { opacity: v, transform: `translateY(${(1 - v) * 18}px)` };
  };
  return (
    <Stage>
      <BrowserFrame style={{ transform: `scale(${1 - 0.12 * out}) translateY(${-out * 40}px)`, opacity: 1 - out }}>
        <Camera z={z} focus={focus}>
          <Stills items={[[0, 'share/a-start.jpg'], [52, 'share/b-copied.jpg']]} />
          <Cursor z={z} clicks={[46]} path={[[0, OFF], [40, center(c.share)], [90, center(c.share)]]} />
        </Camera>
      </BrowserFrame>
      <Caption text="Share it with your team." from={6} to={98} />
      {frame >= 100 && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center', display: 'grid', justifyItems: 'center' }}>
            <Img src={staticFile('brand/lunaris-logo.png')} style={{ height: 220, ...rise(104), transform: `${rise(104).transform} scale(${0.96 + 0.04 * rise(104).opacity})` }} />
            <div style={{ marginTop: 30, fontSize: 18, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.soft, ...rise(118) }}>Try it now</div>
            <div style={{ marginTop: 12, padding: '14px 30px', borderRadius: 999, background: '#fff', border: `1px solid ${C.hairline}`,
              boxShadow: '0 10px 30px rgba(30,33,37,0.10)', fontSize: 30, fontWeight: 600, color: C.ink, ...rise(124) }}>
              lunar-landing-site-navigator-pi.vercel.app
            </div>
            <div style={{ marginTop: 22, fontSize: 22, color: C.soft, ...rise(134) }}>NASA Space Apps Challenge 2026</div>
          </div>
        </div>
      )}
    </Stage>
  );
}

const VIEWS = { intro: Intro, compare: Compare, sky: Sky, terrain: Terrain, energy: Energy, share: Share };

export function Main({ vo, voDur, music, click, voGain, musicGain, duckGain }: AudioProps) {
  const { fps } = useVideoConfig();
  const spans = vo.map((v, i) => (v ? [STARTS[i] + VO_AT[i], STARTS[i] + VO_AT[i] + voDur[i] * fps] : null)).filter(Boolean) as number[][];
  // Music: fade in/out, ducked to duckGain while a line plays (12-frame ramps).
  const musicVol = (f: number) => {
    const talk = Math.max(0, ...spans.map(([a, b]) => interpolate(f, [a - 12, a, b, b + 12], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })));
    const edge = interpolate(f, [0, 30, TOTAL - 60, TOTAL], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return edge * (musicGain + (duckGain - musicGain) * talk);
  };
  return (
    <ClickSound.Provider value={click}>
      <AbsoluteFill style={{ background: C.page }}>
        {SCENES.map((s, i) => {
          const View = VIEWS[s.id];
          return (
            <Seq key={s.id} from={STARTS[i]} durationInFrames={s.frames + (i === SCENES.length - 1 ? 0 : FADE)}>
              <SceneFade first={i === 0}><View /></SceneFade>
              {vo[i] && <Seq from={VO_AT[i]} layout="none"><Audio src={staticFile(vo[i]!)} volume={voGain} /></Seq>}
            </Seq>
          );
        })}
        {music && <Audio src={staticFile(music)} volume={musicVol} />}
      </AbsoluteFill>
    </ClickSound.Provider>
  );
}

export const TOTAL = SCENES.reduce((n, s) => n + s.frames, 0) - FADE * (SCENES.length - 1);
