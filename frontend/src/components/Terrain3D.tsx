import { OrbitControls, Stars } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Component, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
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

/** The only part of the scene that follows mission time: light + Sun/Earth markers. */
function SunEarth({ target, reach, zMax }: { target: V3; reach: number; zMax: number }) {
  const samples = useStore((s) => activeScenario(s)?.result?.samples);
  const offsetMs = useStore((s) => s.offsetMs);
  const light = useRef<THREE.DirectionalLight>(null);

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
        intensity={3} shadow-mapSize={[4096, 4096]} shadow-bias={-0.0004} />
      <mesh position={at(sun, 250)}><sphereGeometry args={[5, 24, 24]} /><meshBasicMaterial color="#f5a524" wireframe={!sunVisible} transparent={!sunVisible} opacity={sunVisible ? 1 : 0.25} /></mesh>
      {earth && <mesh position={at(earth, 250)}><sphereGeometry args={[8, 24, 24]} /><meshBasicMaterial color="#4cc9f0" wireframe={!earthVisible} transparent={!earthVisible} opacity={earthVisible ? 1 : 0.25} /></mesh>}
    </>
  );
}

function Scene({ terrain }: { terrain: Terrain }) {
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
      return p ? [{ id: s.id, color: s.color, p }] : [];
    }),
    [terrain, scenarios, ex],
  );

  return (
    <>
      <color attach="background" args={['#000']} />
      <Stars radius={3000} depth={200} count={4000} factor={6} fade />
      <ambientLight intensity={0.03} />
      <SunEarth target={target} reach={reach} zMax={zMax} />
      <TerrainMesh terrain={terrain} ex={ex} />
      {pins.map(({ id, color, p }) => (
        <mesh key={id} position={[p[0], p[1], p[2] + 1.5]}>
          <sphereGeometry args={[id === activeId ? 1.6 : 1, 16, 16]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
      <OrbitControls target={target} maxDistance={1500} />
    </>
  );
}

/** Live legend; the only DOM piece that ticks with mission time, so the rest of the panel stays still. */
function BodyLegend() {
  const samples = useStore((s) => activeScenario(s)?.result?.samples);
  const offsetMs = useStore((s) => s.offsetMs);
  if (!samples) return null;
  const i = indexAt(samples.t, samples.t[0] + offsetMs);
  return (
    <span className="mono">
      <span style={{ color: 'var(--sun)' }}>Sun</span> {samples.sun_frac[i] > 0 ? 'visible' : 'hidden'} · <span style={{ color: 'var(--earth)' }}>Earth</span> {samples.earth_vis[i] ? 'visible' : 'hidden'}
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

export function Terrain3D() {
  const terrain = useTerrain();
  const lat = useStore((s) => activeScenario(s)?.lat);
  const ex = useStore((s) => s.exaggeration);
  const setEx = useStore((s) => s.setExaggeration);
  const outside = lat !== undefined && lat > -84.5;
  return (
    <section className="panel">
      <h2>3D south pole · LOLA terrain lit by the real Sun</h2>
      <div className="three-wrap">
        {terrain ? (
          <WebGLBoundary>
            <Canvas shadows camera={{ position: [0, -220, 140], up: [0, 0, 1], fov: 45, near: 0.5, far: 6000 }}>
              <Scene terrain={terrain} />
            </Canvas>
          </WebGLBoundary>
        ) : <p className="muted" style={{ padding: 12 }}>Loading terrain…</p>}
        <div className="overlay">
          <label className="muted">Vertical exaggeration{' '}
            <input type="range" min={1} max={5} step={0.5} value={ex} onChange={(e) => setEx(Number(e.target.value))} />
          </label>
          <span className="mono">{ex}×</span>
          <BodyLegend />
          {outside && <span className="muted">· the active site is outside the ±180 km polar model; showing the pole for context</span>}
        </div>
      </div>
    </section>
  );
}
