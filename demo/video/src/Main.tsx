import { AbsoluteFill, Audio, Img, Sequence as Seq, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import cuesJson from '../../assets/cues.json';
import horizon from '../../assets/horizon.json';
import timing from '../timing.json';
import { BrowserFrame, C, Camera, Caption, center, Cursor, fitZoom, Sequence, Stage, Stills, tween, VIEW, type Box } from './kit';

type Cues = {
  compare: { addSite: Box; shackleton: Box; addButton: Box; summary: Box };
  energy: { tab: Box; rows: Box; radio: Box; scrollFrames: number };
  share: { share: Box };
  sky: { pano: Box; caption: Box; frames: number };
  terrain: { wrap: Box; frames: number };
};
const cues = cuesJson as unknown as Cues;
const PAGE_C = { x: VIEW.w / 2, y: VIEW.h / 2 };
const OFF = { x: VIEW.w + 60, y: VIEW.h * 0.75 };

export type AudioProps = { soundtrack: string | null }; // one pre-mixed track (audio/mix.py)

// Scene lengths, voice timing, captions and clicks live in ../timing.json (shared with audio/mix.py).
export const SCENES = timing.scenes;
const FADE = timing.fade; // crossfade between scenes
const STARTS = SCENES.map((_, i) => SCENES.slice(0, i).reduce((n, s) => n + s.frames - FADE, 0));
const T = (id: string) => SCENES.find((s) => s.id === id)!;

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
      <Caption text={T('intro').caption} from={90} />
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
          <Cursor z={zoom} clicks={T('compare').clicks} path={[[30, OFF], [80, center(c.addSite)], [100, center(c.addSite)], [140, center(c.shackleton)], [152, center(c.shackleton)], [190, center(c.addButton)], [226, center(c.addButton)], [272, OFF]]} />
        </Camera>
      </WindowIn>
      <Caption text={T('compare').caption} from={24} />
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
      <Caption text={T('sky').caption} from={10} />
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
      <Caption text={T('terrain').caption} from={10} />
    </Stage>
  );
}

/** Soft highlight band over a table row, multiplied onto the page. */
function Mark({ b, color, from }: { b: Box; color: string; from: number }) {
  const v = tween(useCurrentFrame(), from, from + 20, 0, 1);
  const pad = 10;
  return (
    <div style={{ position: 'absolute', left: b.x - pad, top: b.y + 3, width: b.w + 2 * pad, height: b.h - 6, borderRadius: 10,
      background: `${color}2e`, boxShadow: `0 0 0 2px ${color}`, mixBlendMode: 'multiply', opacity: v, transform: `scale(${0.98 + 0.02 * v})` }} />
  );
}

function Energy() {
  const frame = useCurrentFrame();
  const c = cues.energy;
  const both = { x: c.rows.x, y: c.radio.y, w: c.rows.w, h: c.rows.y + c.rows.h - c.radio.y };
  const zoom = tween(frame, 145, 235, 1, 1.08);
  const focus = { x: tween(frame, 145, 235, PAGE_C.x, center(both).x), y: tween(frame, 145, 235, PAGE_C.y, center(both).y) };
  const numbers = tween(frame, 74, 80, 0, 1);
  return (
    <Stage>
      <BrowserFrame>
        <Camera z={zoom} focus={focus}>
          <Stills items={[[0, 'energy/a-start.jpg']]} />
          {numbers > 0 && <div style={{ position: 'absolute', inset: 0, opacity: numbers }}><Sequence dir="energy/scroll" count={c.scrollFrames} offset={92} /></div>}
          <Mark b={c.radio} color="#2f72c4" from={148} />
          <Mark b={c.rows} color={C.sun} from={188} />
          <Cursor z={zoom} clicks={T('energy').clicks} path={[[14, OFF], [62, center(c.tab)], [84, center(c.tab)], [130, OFF]]} />
        </Camera>
      </BrowserFrame>
      <Caption text={T('energy').caption} from={14} />
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
          <Cursor z={z} clicks={T('share').clicks} path={[[0, OFF], [40, center(c.share)], [90, center(c.share)]]} />
        </Camera>
      </BrowserFrame>
      <Caption text={T('share').caption} from={6} to={98} />
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
            <div style={{ marginTop: 26, fontSize: 15, color: C.soft, opacity: 0.85 * rise(142).opacity }}>Narration and sound are AI-generated (ElevenLabs). All app footage is real.</div>
          </div>
        </div>
      )}
    </Stage>
  );
}

const VIEWS = { intro: Intro, compare: Compare, sky: Sky, terrain: Terrain, energy: Energy, share: Share };

export function Main({ soundtrack }: AudioProps) {
  return (
    <AbsoluteFill style={{ background: C.page }}>
      {SCENES.map((s, i) => {
        const View = VIEWS[s.id as keyof typeof VIEWS];
        return (
          <Seq key={s.id} from={STARTS[i]} durationInFrames={s.frames + (i === SCENES.length - 1 ? 0 : FADE)}>
            <SceneFade first={i === 0}><View /></SceneFade>
          </Seq>
        );
      })}
      {soundtrack && <Audio src={staticFile(soundtrack)} />}
    </AbsoluteFill>
  );
}

export const TOTAL = SCENES.reduce((n, s) => n + s.frames, 0) - FADE * (SCENES.length - 1);
