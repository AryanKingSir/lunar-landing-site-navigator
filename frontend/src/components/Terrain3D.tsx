import { Html, OrbitControls, Stars } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import * as THREE from 'three';
import { placeName } from '../lib/format';
import { latLonToXY, R_MOON_M, toScene } from '../lib/projection';
import { heightAtXY, useTerrain, type Terrain } from '../lib/terrain';
import { indexAt } from '../lib/time';
import { activeScenario, useStore } from '../store';

type V3 = [number, number, number];

const R_KM = R_MOON_M / 1000;
const zAt = (xKm: number, yKm: number, hM: number, ex: number) => (hM / 1000) * ex - (xKm * xKm + yKm * yKm) / (2 * R_KM);

function sitePos(terrain: Terrain, lat: number, lon: number, ex: number): V3 | null {
  const [x, y] = latLonToXY(lat, lon);
  const h = heightAtXY(terrain, x, y);
  if (Number.isNaN(h)) return null;
  return [x / 1000, y / 1000, zAt(x / 1000, y / 1000, h, ex)];
}

function TerrainMesh({ terrain, ex }: { terrain: Terrain; ex: number }) {
  const geom = useMemo(() => {
    const { extent_m, heightmap_n: n } = terrain.meta;
    const E = extent_m / 1000;
    const g = new THREE.PlaneGeometry(E, E, n - 1, n - 1);
    const pos = g.attributes.position;
    for (let k = 0; k < pos.count; k++) pos.setZ(k, zAt(pos.getX(k), pos.getY(k), terrain.heights[k], ex));
    g.computeVertexNormals();
    return g;
  }, [terrain, ex]);
  useEffect(() => () => geom.dispose(), [geom]);
  return (
    <mesh geometry={geom} castShadow receiveShadow>
      <meshStandardMaterial color="#9a9ca0" roughness={1} metalness={0} />
    </mesh>
  );
}

const LIGHT_DIST = 800;

/** Soft radial glow texture for the Sun, made once. */
function useGlowTexture(): THREE.Texture {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 200, 110, 0.95)');
    grad.addColorStop(0.25, 'rgba(240, 165, 42, 0.45)');
    grad.addColorStop(1, 'rgba(240, 165, 42, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

/** Mission time while the view is shown; frozen at its last value while hidden, so a hidden view never re-renders per tick. */
function useLiveOffset(active: boolean): number {
  const last = useRef(0);
  const offsetMs = useStore((s) => (active ? s.offsetMs : last.current));
  last.current = offsetMs;
  return offsetMs;
}

/** Stops all rendering while the tab is hidden; draws one fresh frame when it is shown again. */
function FrameGate({ active }: { active: boolean }) {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    setFrameloop(active ? 'demand' : 'never');
    if (active) invalidate();
  }, [active, setFrameloop, invalidate]);
  return null;
}

/** The only part of the scene that follows mission time: light + Sun/Earth markers. */
function SunEarth({ target, reach, zMax, active }: { target: V3; reach: number; zMax: number; active: boolean }) {
  const samples = useStore((s) => activeScenario(s)?.result?.samples);
  const offsetMs = useLiveOffset(active);
  const light = useRef<THREE.DirectionalLight>(null);
  const glow = useGlowTexture();
  useEffect(() => () => glow.dispose(), [glow]);

  let sun: V3 = [0, 0, 1];
  let earth: V3 | null = null;
  let sunVisible = true;
  let earthVisible = true;
  if (samples) {
    const i = indexAt(samples.t, samples.t[0] + offsetMs);
    sun = toScene(samples.sun_vec[i]);
    earth = toScene(samples.earth_vec[i]);
    sunVisible = samples.sun_frac[i] > 0;
    earthVisible = !!samples.earth_vis[i];
  }
  const at = (d: V3, dist: number): V3 => [target[0] + d[0] * dist, target[1] + d[1] * dist, target[2] + d[2] * dist];

  // Fit the shadow frustum to the terrain box as seen from the Sun. With z as the shadow camera's
  // up, the box spans ±reach across the Sun line but only ±(zMax·cos el + reach·|sin el|) vertically,
  // so at grazing elevations the shadow map spends its texels on the terrain instead of empty sky.
  const sinEl = Math.min(1, Math.abs(sun[2]));
  const halfH = zMax * Math.sqrt(1 - sinEl * sinEl) + reach * sinEl + 2;
  const depth = reach + zMax + 2;
  useLayoutEffect(() => {
    const cam = light.current!.shadow.camera;
    cam.up.set(0, 0, 1);
    Object.assign(cam, { left: -reach, right: reach, top: halfH, bottom: -halfH, near: LIGHT_DIST - depth, far: LIGHT_DIST + depth });
    cam.updateProjectionMatrix();
  }, [reach, halfH, depth]);

  return (
    <>
      <directionalLight ref={light} castShadow position={[sun[0] * LIGHT_DIST, sun[1] * LIGHT_DIST, sun[2] * LIGHT_DIST]}
        intensity={3} shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} />
      <sprite position={at(sun, 250)} scale={[48, 48, 1]}>
        <spriteMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={sunVisible ? 1 : 0.2} />
      </sprite>
      <mesh position={at(sun, 250)}><sphereGeometry args={[6, 24, 24]} /><meshBasicMaterial color="#f0a52a" wireframe={!sunVisible} transparent={!sunVisible} opacity={sunVisible ? 1 : 0.25} /></mesh>
      <Html position={at(sun, 250)} zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
        <span className={`body-label sun ${sunVisible ? '' : 'hidden'}`}>Sun{sunVisible ? '' : ' (hidden)'}</span>
      </Html>
      {earth && <mesh position={at(earth, 250)}><sphereGeometry args={[10, 24, 24]} /><meshBasicMaterial color="#62aee8" wireframe={!earthVisible} transparent={!earthVisible} opacity={earthVisible ? 1 : 0.25} /></mesh>}
      {earth && (
        <Html position={at(earth, 250)} zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
          <span className={`body-label earth ${earthVisible ? '' : 'hidden'}`}>Earth{earthVisible ? '' : ' (hidden)'}</span>
        </Html>
      )}
    </>
  );
}

type CamInfo = { northDeg: number; barPx: number; barKm: number };
const NICE_KM = [1, 2, 5, 10, 20, 50, 100, 200];

/**
 * Reports, whenever the user orbits or zooms (never per playback tick), where the near side
 * (towards longitude 0, the Earth-facing side) points on screen and a round scale-bar length.
 */
function CameraReadout({ onChange }: { onChange: (c: CamInfo) => void }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as (THREE.EventDispatcher & { target: THREE.Vector3 }) | null;
  const size = useThree((s) => s.size);
  useEffect(() => {
    if (!controls) return;
    const toPx = (v: THREE.Vector3) => { const q = v.clone().project(camera); return [(q.x + 1) / 2 * size.width, (1 - q.y) / 2 * size.height]; };
    const update = () => {
      const t = controls.target;
      const [ax, ay] = toPx(t);
      const [nx, ny] = toPx(t.clone().add(new THREE.Vector3(0, 10, 0))); // +y = towards longitude 0
      const northDeg = (Math.atan2(nx - ax, -(ny - ay)) * 180) / Math.PI;
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      const [rx, ry] = toPx(t.clone().add(right));
      const pxPerKm = Math.hypot(rx - ax, ry - ay);
      const barKm = NICE_KM.find((k) => k * pxPerKm >= 60) ?? NICE_KM[NICE_KM.length - 1];
      onChange({ northDeg, barPx: Math.min(220, barKm * pxPerKm), barKm });
    };
    update();
    const ctl = controls as unknown as { addEventListener: (e: string, f: () => void) => void; removeEventListener: (e: string, f: () => void) => void };
    ctl.addEventListener('change', update);
    return () => ctl.removeEventListener('change', update);
  }, [camera, controls, size, onChange]);
  return null;
}

function Scene({ terrain, active, onCamera }: { terrain: Terrain; active: boolean; onCamera: (c: CamInfo) => void }) {
  const activeId = useStore((s) => s.activeId);
  const lat = useStore((s) => activeScenario(s)?.lat);
  const lon = useStore((s) => activeScenario(s)?.lon);
  const scenarios = useStore((s) => s.scenarios);
  const ex = useStore((s) => s.exaggeration);
  const { extent_m, h_min_m, h_max_m } = terrain.meta;
  const reach = extent_m / 1000 / Math.SQRT2 + 2; // pole -> box corner, km (+margin)
  const zMax = Math.max((h_max_m / 1000) * ex, (reach * reach) / (2 * R_KM) - (h_min_m / 1000) * ex);

  const target = useMemo<V3>(
    () => (lat === undefined || lon === undefined ? null : sitePos(terrain, lat, lon, ex)) ?? [0, 0, 0],
    [terrain, lat, lon, ex],
  );
  const pins = useMemo(
    () => scenarios.flatMap((s) => {
      const p = sitePos(terrain, s.lat, s.lon, ex);
      return p ? [{ id: s.id, color: s.color, tag: s.tag, name: placeName(s.label), p }] : [];
    }),
    [terrain, scenarios, ex],
  );

  return (
    <>
      <color attach="background" args={['#0b0d12']} />
      <FrameGate active={active} />
      <Stars radius={3000} depth={200} count={4000} factor={6} fade />
      <ambientLight intensity={0.1} />
      <SunEarth target={target} reach={reach} zMax={zMax} active={active} />
      <TerrainMesh terrain={terrain} ex={ex} />
      {pins.map(({ id, color, tag, name, p }) => (
        <group key={id}>
          <mesh position={[p[0], p[1], p[2] + 1.5]}>
            <sphereGeometry args={[id === activeId ? 1.6 : 1, 16, 16]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <Html position={[p[0], p[1], p[2] + 3]} center zIndexRange={[3, 0]} style={{ pointerEvents: 'none' }}>
            <span className={`pin-tag ${id === activeId ? 'active' : ''}`} style={{ '--c': color } as CSSProperties} title={name}>{tag}</span>
          </Html>
        </group>
      ))}
      <OrbitControls makeDefault target={target} maxDistance={1500} />
      <CameraReadout onChange={onCamera} />
    </>
  );
}

/** Live legend; the only DOM piece that ticks with mission time, so the rest of the panel stays still. */
function BodyLegend({ active }: { active: boolean }) {
  const samples = useStore((s) => activeScenario(s)?.result?.samples);
  const label = useStore((s) => activeScenario(s)?.label);
  const offsetMs = useLiveOffset(active);
  if (!samples) return null;
  const i = indexAt(samples.t, samples.t[0] + offsetMs);
  const site = placeName(label ?? 'site');
  return (
    <span className="live">
      At {site} the <span style={{ color: 'var(--sun)' }}>Sun</span> is {samples.sun_frac[i] > 0 ? 'up' : 'hidden'} and <span style={{ color: 'var(--earth)' }}>Earth</span> is {samples.earth_vis[i] ? 'in view' : 'hidden'}.
    </span>
  );
}

/** Without WebGL the Canvas throws; keep the rest of the app alive. */
class WebGLBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error('Terrain3D render error:', error); }
  render() {
    return this.state.failed
      ? <p className="muted" style={{ padding: 12 }}>3D view unavailable: WebGL could not be started in this browser.</p>
      : this.props.children;
  }
}

/** `active` is false while the 3D tab is hidden: the view then does no per-tick work and draws nothing. */
export function Terrain3D({ active = true }: { active?: boolean }) {
  const terrain = useTerrain();
  const lat = useStore((s) => activeScenario(s)?.lat);
  const label = useStore((s) => activeScenario(s)?.label);
  const ex = useStore((s) => s.exaggeration);
  const setEx = useStore((s) => s.setExaggeration);
  const outside = lat !== undefined && lat > -84.5;
  const [cam, setCam] = useState<CamInfo | null>(null);
  const [full, setFull] = useState(false);
  const canFull = typeof document !== 'undefined' && !!document.fullscreenEnabled;
  useEffect(() => {
    const onChange = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.querySelector<HTMLElement>('[data-tour="stage"]')?.requestFullscreen();
  };
  return (
    <section className="panel">
      <h2>South pole terrain, lit by the real Sun</h2>
      <div className="three-wrap sky-window">
        {terrain ? (
          <WebGLBoundary>
            <Canvas shadows frameloop="demand" camera={{ position: [0, -220, 140], up: [0, 0, 1], fov: 45, near: 0.5, far: 6000 }}>
              <Scene terrain={terrain} active={active} onCamera={setCam} />
            </Canvas>
          </WebGLBoundary>
        ) : <p className="muted" style={{ padding: 12 }}>Loading terrain…</p>}
        {cam && (
          <div className="nav-overlay" aria-hidden="true">
            <span className="north" style={{ transform: `rotate(${cam.northDeg}deg)` }}><span className="arrow" /></span>
            <span className="north-label">Near side (towards Earth)</span>
            <span className="scale"><span className="bar" style={{ width: cam.barPx }} />{cam.barKm} km</span>
          </div>
        )}
        {canFull && (
          <button className="ghost full-btn" onClick={toggleFull} aria-pressed={full}>
            {full ? 'Exit full screen' : 'Full screen'}
          </button>
        )}
        <div className="overlay">
          <label>Exaggerate heights
            <input type="range" min={1} max={5} step={0.5} value={ex} onChange={(e) => setEx(Number(e.target.value))} />
            <span className="num live">{ex}×</span>
          </label>
          <BodyLegend active={active} />
          {outside && <span className="muted">{(label ?? 'The active site').split(' (')[0]} is far from the south pole, so this view shows the pole for context.</span>}
        </div>
      </div>
    </section>
  );
}
