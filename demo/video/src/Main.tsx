import { AbsoluteFill, Audio, Img, interpolate, Sequence as Seq, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import cuesJson from '../../assets/cues.json';
import { BrowserFrame, C, Camera, Caption, center, Cursor, fitZoom, Sequence, Stage, Stills, tween, VIEW, type Box } from './kit';

type Cues = {
  compare: { addSite: Box; shackleton: Box; addButton: Box; summary: Box };
  slip: { menuButton: Box; landLater: Box; summary: Box };
  share: { share: Box };
  sky: { pano: Box; caption: Box; frames: number };
  terrain: { wrap: Box; frames: number };
};
const cues = cuesJson as unknown as Cues;
const PAGE_C = { x: VIEW.w / 2, y: VIEW.h / 2 };
const OFF = { x: VIEW.w + 60, y: VIEW.h * 0.75 };

export type AudioProps = { vo: (string | null)[]; music: string | null; voGain: number; musicGain: number };
export const SCENES = [
  { id: 'intro', frames: 240 },
  { id: 'compare', frames: 360 },
  { id: 'sky', frames: 360 },
  { id: 'terrain', frames: 360 },
  { id: 'slip', frames: 300 },
  { id: 'share', frames: 250 },
] as const;
const FADE = 14; // crossfade between scenes

/** Fades a scene in over its first frames (scenes overlap by FADE). */
function SceneFade({ children, first }: { children: React.ReactNode; first?: boolean }) {
  const frame = useCurrentFrame();
  const op = first ? 1 : interpolate(frame, [0, FADE], [0, 1], { extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity: op }}>{children}</AbsoluteFill>;
}

function Intro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 6, fps, config: { damping: 200, mass: 0.9 } });
  const tag = tween(frame, 40, 70, 0, 1);
  return (
    <Stage>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center', transform: `translateY(${-30 + (1 - s) * 30}px)` }}>
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
  const zoom = tween(frame, 236, 300, 1, fitZoom(c.summary));
  const focus = { x: tween(frame, 236, 300, PAGE_C.x, center(c.summary).x), y: tween(frame, 236, 300, PAGE_C.y, center(c.summary).y + 20) };
  return (
    <Stage>
      <WindowIn>
        <Camera z={zoom} focus={focus}>
          <Stills items={[[0, 'compare/a-start.jpg'], [100, 'compare/b-dialog.jpg'], [168, 'compare/c-picked.jpg'], [224, 'compare/d-three.jpg']]} />
          <Cursor z={zoom} clicks={[94, 162, 218]} path={[[40, OFF], [90, center(c.addSite)], [112, center(c.addSite)], [158, center(c.shackleton)], [170, center(c.shackleton)], [214, center(c.addButton)], [250, center(c.addButton)], [300, OFF]]} />
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

function Slip() {
  const frame = useCurrentFrame();
  const c = cues.slip;
  const zoom = tween(frame, 160, 222, 1, fitZoom(c.summary));
  const focus = { x: tween(frame, 160, 222, PAGE_C.x, center(c.summary).x), y: tween(frame, 160, 222, PAGE_C.y, center(c.summary).y + 20) };
  return (
    <Stage>
      <BrowserFrame>
        <Camera z={zoom} focus={focus}>
          <Stills items={[[0, 'slip/a-start.jpg'], [84, 'slip/b-menu.jpg'], [148, 'slip/c-after.jpg']]} />
          <Cursor z={zoom} clicks={[78, 142]} path={[[18, OFF], [70, center(c.menuButton)], [92, center(c.menuButton)], [136, center(c.landLater)], [170, center(c.landLater)], [220, OFF]]} />
        </Camera>
      </BrowserFrame>
      <Caption text="Launch slips? Compare instantly." from={14} />
    </Stage>
  );
}

function Share() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = cues.share;
  const out = spring({ frame: frame - 92, fps, config: { damping: 200 } });
  const end = tween(frame, 104, 132, 0, 1);
  return (
    <Stage>
      <BrowserFrame style={{ transform: `scale(${1 - 0.12 * out}) translateY(${-out * 40}px)`, opacity: 1 - out }}>
        <Camera z={1} focus={PAGE_C}>
          <Stills items={[[0, 'share/a-start.jpg'], [52, 'share/b-copied.jpg']]} />
          <Cursor z={1} clicks={[46]} path={[[0, OFF], [40, center(c.share)], [90, center(c.share)]]} />
        </Camera>
      </BrowserFrame>
      <Caption text="Share it with your team." from={6} to={98} />
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', opacity: end }}>
        <div style={{ textAlign: 'center', transform: `translateY(${(1 - end) * 16}px)` }}>
          <Img src={staticFile('brand/lunaris-logo.png')} style={{ height: 220 }} />
          <div style={{ marginTop: 22, fontSize: 30, fontWeight: 600, color: C.ink }}>lunar-landing-site-navigator-pi.vercel.app</div>
          <div style={{ marginTop: 8, fontSize: 22, color: C.soft }}>NASA Space Apps Challenge 2026</div>
        </div>
      </div>
    </Stage>
  );
}

const VIEWS = { intro: Intro, compare: Compare, sky: Sky, terrain: Terrain, slip: Slip, share: Share };

export function Main({ vo, music, voGain, musicGain }: AudioProps) {
  let at = 0;
  return (
    <AbsoluteFill style={{ background: C.page }}>
      {SCENES.map((s, i) => {
        const from = i === 0 ? 0 : at - FADE;
        at = from + s.frames;
        const View = VIEWS[s.id];
        return (
          <Seq key={s.id} from={from} durationInFrames={s.frames + (i === SCENES.length - 1 ? 0 : FADE)}>
            <SceneFade first={i === 0}><View /></SceneFade>
            {vo[i] && <Audio src={staticFile(vo[i]!)} volume={voGain} />}
          </Seq>
        );
      })}
      {music && <Audio src={staticFile(music)} volume={(f) => musicGain * interpolate(f, [0, 30, 1740, 1800], [0, 1, 1, 0], { extrapolateRight: 'clamp' })} />}
    </AbsoluteFill>
  );
}

export const TOTAL = SCENES.reduce((n, s) => n + s.frames, 0) - FADE * (SCENES.length - 1);
