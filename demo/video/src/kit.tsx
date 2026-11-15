// Shared building blocks: page tokens, browser frame, camera, cursor, caption, image sequences.
import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import { Audio, Easing, Img, interpolate, Sequence as RSeq, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/AtkinsonHyperlegibleNext';

export const { fontFamily } = loadFont('normal', { weights: ['400', '600', '700'], subsets: ['latin'] });

export const C = { page: '#e4e4e1', surface: '#f3f3f1', ink: '#1e2125', soft: '#5a5f66', hairline: '#c4c5c2', sun: '#f0a52a' };
export const VIEW = { w: 1600, h: 1000 };            // captured CSS viewport
export const WIN = { w: 1400, top: 44, bar: 40 };     // on-screen window width, top offset, title bar height
export const SCALE = WIN.w / VIEW.w;                   // content scale inside the window
export const WIN_H = VIEW.h * SCALE + WIN.bar;
export const EASE = Easing.bezier(0.45, 0, 0.2, 1);

export type Box = { x: number; y: number; w: number; h: number };
export const center = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
/** Largest zoom (up to max) at which the whole box, plus a margin, stays in view. */
export const fitZoom = (b: Box, max = 1.6, margin = 60) => Math.min(max, VIEW.w / (b.w + 2 * margin), VIEW.h / (b.h + 2 * margin));

/** Value that eases from a to b between frames f0 and f1. */
export function tween(frame: number, f0: number, f1: number, a: number, b: number) {
  return interpolate(frame, [f0, f1], [a, b], { easing: EASE, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
}

/** Soft moon-grey stage with a faint top light. */
export function Stage({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily, color: C.ink,
      background: `radial-gradient(1200px 700px at 50% 0%, #eeeeeb 0%, ${C.page} 60%, #dcdcd8 100%)` }}>
      {children}
    </div>
  );
}

/** macOS-style browser window showing the live site's address. */
export function BrowserFrame({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ position: 'absolute', left: (1920 - WIN.w) / 2, top: WIN.top, width: WIN.w, height: WIN_H, borderRadius: 14, overflow: 'hidden',
      background: C.page, boxShadow: '0 40px 90px rgba(30,33,37,0.22), 0 6px 18px rgba(30,33,37,0.10), 0 0 0 1px rgba(30,33,37,0.10)', ...style }}>
      <div style={{ height: WIN.bar, background: '#ececea', borderBottom: `1px solid ${C.hairline}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8 }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />)}
        <div style={{ margin: '0 auto', transform: 'translateX(-30px)', minWidth: 420, height: 26, borderRadius: 7, background: '#fff', display: 'grid', placeItems: 'center',
          fontSize: 14, color: C.soft, border: `1px solid ${C.hairline}` }}>lunar-landing-site-navigator-pi.vercel.app</div>
      </div>
      <div style={{ position: 'relative', width: WIN.w, height: VIEW.h * SCALE, overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

/** Zoom/pan of the captured page: shows the region around `focus` at zoom `z` (1 = whole page). */
export function Camera({ z, focus, children }: { z: number; focus: { x: number; y: number }; children: ReactNode }) {
  const vw = VIEW.w / z, vh = VIEW.h / z;
  const cx = Math.min(Math.max(focus.x, vw / 2), VIEW.w - vw / 2);
  const cy = Math.min(Math.max(focus.y, vh / 2), VIEW.h - vh / 2);
  const tx = VIEW.w / 2 - cx * z, ty = VIEW.h / 2 - cy * z;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: VIEW.w, height: VIEW.h, transformOrigin: '0 0',
      transform: `scale(${SCALE}) translate(${tx}px, ${ty}px) scale(${z})` }}>
      {children}
    </div>
  );
}

/** A captured still or sequence frame filling the page layer. */
export function Shot({ src, opacity = 1 }: { src: string; opacity?: number }) {
  return <Img src={staticFile(src)} style={{ position: 'absolute', inset: 0, width: VIEW.w, height: VIEW.h, opacity }} />;
}

/** Crossfades through a list of [fromFrame, src] stills. */
export function Stills({ items, fade = 5 }: { items: [number, string][]; fade?: number }) {
  const frame = useCurrentFrame();
  return (
    <>
      {items.map(([from, src], i) => {
        const next = items[i + 1]?.[0];
        if (frame < from - fade || (next !== undefined && frame > next + fade)) return null;
        const op = i === 0 ? 1 : interpolate(frame, [from, from + fade], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return <Shot key={src} src={src} opacity={op} />;
      })}
    </>
  );
}

/** Frame-accurate image sequence (one capture frame per video frame, held at the ends). */
export function Sequence({ dir, count, offset = 0, rate = 1 }: { dir: string; count: number; offset?: number; rate?: number }) {
  const frame = useCurrentFrame();
  const i = Math.min(count - 1, Math.max(0, Math.round((frame - offset) * rate)));
  return <Shot src={`${dir}/f${String(i).padStart(4, '0')}.jpg`} />;
}

/** Click sound for every cursor press (null = silent). */
export const ClickSound = createContext<string | null>(null);

/** Arrow cursor gliding between page points; `clicks` are frames where it presses. */
export function Cursor({ path, clicks, z }: { path: [number, { x: number; y: number }][]; clicks: number[]; z: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const click = useContext(ClickSound);
  const sounds = click && clicks.map((c) => <RSeq key={c} from={c} durationInFrames={30} layout="none"><Audio src={staticFile(click)} /></RSeq>);
  if (frame < path[0][0]) return <>{sounds}</>;
  let p = path[path.length - 1][1];
  for (let i = 0; i < path.length - 1; i++) {
    const [f0, a] = path[i], [f1, b] = path[i + 1];
    if (frame >= f0 && frame <= f1) { p = { x: tween(frame, f0, f1, a.x, b.x), y: tween(frame, f0, f1, a.y, b.y) }; break; }
  }
  const press = clicks.reduce((m, c) => Math.max(m, frame >= c && frame < c + 14 ? 1 - Math.abs(frame - c - 4) / 10 : 0), 0);
  const ripple = clicks.map((c) => frame - c).find((d) => d >= 0 && d < 24);
  const s = 1 / z;
  const appear = spring({ frame: frame - path[0][0], fps, config: { damping: 200 } });
  return (
    <div style={{ position: 'absolute', left: p.x, top: p.y, transform: `scale(${s})`, transformOrigin: '0 0', opacity: appear, zIndex: 10 }}>
      {sounds}
      {ripple !== undefined && (
        <span style={{ position: 'absolute', left: -24, top: -24, width: 48, height: 48, borderRadius: 24, border: `3px solid ${C.ink}`,
          opacity: 0.5 * (1 - ripple / 24), transform: `scale(${0.4 + ripple / 24})` }} />
      )}
      <svg width="30" height="36" viewBox="0 0 30 36" style={{ transform: `scale(${1 - 0.15 * press})`, transformOrigin: '2px 2px',
        filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}>
        <path d="M2 2 L2 28 L9 21.5 L14 33 L19 31 L14 20 L24 20 Z" fill="#fff" stroke="#111" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** Large caption under the window, fading and rising in. */
export function Caption({ text, from = 0, to = Infinity }: { text: string; from?: number; to?: number }) {
  const frame = useCurrentFrame();
  const inn = tween(frame, from, from + 18, 0, 1);
  const out = to === Infinity ? 1 : tween(frame, to - 14, to, 1, 0);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: WIN.top + WIN_H + 22, textAlign: 'center', fontSize: 40, fontWeight: 700,
      letterSpacing: '-0.01em', color: C.ink, opacity: Math.min(inn, out), transform: `translateY(${(1 - inn) * 14}px)` }}>
      {text}
    </div>
  );
}
