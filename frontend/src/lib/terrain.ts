import { useEffect, useState } from 'react';

export type TerrainMeta = { extent_m: number; heightmap_n: number; h_min_m: number; h_max_m: number; hillshade_n: number };
export type Terrain = { meta: TerrainMeta; heights: Float32Array }; // metres, row-major, row 0 = +y

let metaP: Promise<TerrainMeta> | null = null;
let terrainP: Promise<Terrain> | null = null;

export function loadTerrainMeta(): Promise<TerrainMeta> {
  if (!metaP) {
    metaP = fetch('/terrain/meta.json')
      .then((r) => {
        if (!r.ok) throw new Error(`GET /terrain/meta.json failed: ${r.status}`);
        return r.json() as Promise<TerrainMeta>;
      })
      .catch((e) => { metaP = null; throw e; });
  }
  return metaP;
}

function loadTerrain(): Promise<Terrain> {
  if (!terrainP) {
    terrainP = Promise.all([
      loadTerrainMeta(),
      fetch('/terrain/heightmap.bin').then((r) => {
        if (!r.ok) throw new Error(`GET /terrain/heightmap.bin failed: ${r.status}`);
        return r.arrayBuffer();
      }),
    ])
      .then(([meta, buf]) => {
        const raw = new Uint16Array(buf);
        const span = meta.h_max_m - meta.h_min_m;
        const heights = new Float32Array(raw.length);
        for (let i = 0; i < raw.length; i++) heights[i] = meta.h_min_m + (raw[i] / 65535) * span;
        return { meta, heights };
      })
      .catch((e) => { terrainP = null; throw e; });
  }
  return terrainP;
}

export function useTerrain(): Terrain | null {
  const [t, setT] = useState<Terrain | null>(null);
  useEffect(() => { loadTerrain().then(setT).catch((e) => console.error(e)); }, []);
  return t;
}

/** Nearest-neighbour height (m) at projected coordinates, or NaN outside the box. */
export function heightAtXY(t: Terrain, x: number, y: number): number {
  const { extent_m: E, heightmap_n: n } = t.meta;
  const ix = Math.round(((x + E / 2) / E) * (n - 1));
  const iy = Math.round(((E / 2 - y) / E) * (n - 1));
  if (ix < 0 || iy < 0 || ix >= n || iy >= n) return NaN;
  return t.heights[iy * n + ix];
}
