"""Build terrain products from LOLA LDEM_80S_80M (run after download_data.py --dem).

Outputs:
  data/dem_240m.npz                     runtime DEM for on-demand custom-site horizons
  data/horizons/<site-id>.json          80 m horizon masks for curated south-pole sites
  frontend/public/terrain/heightmap.bin uint16 500x500 over a 360 km box (3D view)
  frontend/public/terrain/hillshade.png 900x900 shaded relief (site-picker map)
  frontend/public/terrain/meta.json
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app import terrain  # noqa: E402
from app.config import DEM_RAW, DEM_RUNTIME, FRONTEND_TERRAIN_DIR, HORIZONS_DIR  # noqa: E402
from app.sites import load_sites  # noqa: E402

CROP = slice(1550, 6050)  # 4500 px x 80 m = 360 km box centred on the pole (centre 3799.5)


def build_runtime_dem(dem80: terrain.Dem) -> None:
    h = dem80.heights[:7599, :7599].reshape(2533, 3, 2533, 3).mean(axis=(1, 3))
    dn = np.round(h / 0.5).astype(np.int16)
    np.savez_compressed(DEM_RUNTIME, dn=dn, scale_m=240.0, offset=(dem80.offset - 1.0) / 3.0)
    print(f"wrote {DEM_RUNTIME} ({DEM_RUNTIME.stat().st_size / 1e6:.1f} MB)")


def build_curated_horizons(dem80: terrain.Dem) -> None:
    HORIZONS_DIR.mkdir(parents=True, exist_ok=True)
    for s in load_sites():
        if s["lat"] > -80:
            continue
        mask = terrain.horizon_mask(dem80, s["lat"], s["lon"], obs_h=2.0)
        out = {"id": s["id"], "az_step": 0.5, "el": np.round(mask, 3).tolist(),
               "site_height_m": round(terrain.height_at(dem80, s["lat"], s["lon"]), 1),
               "partial": s["lat"] > terrain.FULL_COVERAGE_LAT}
        (HORIZONS_DIR / f"{s['id']}.json").write_text(json.dumps(out))
        print(f"{s['id']}: h0={out['site_height_m']} m, mask max {mask.max():.2f} deg")


def _hillshade(h: np.ndarray, cell_m: float, az_deg: float = 315.0, alt_deg: float = 45.0) -> np.ndarray:
    gy, gx = np.gradient(h, cell_m)
    slope = np.pi / 2 - np.arctan(np.hypot(gx, gy))
    # Rows increase southward, so this is the ESRI convention with dz/drow.
    aspect = np.arctan2(gy, -gx)
    az = np.radians(360.0 - az_deg + 90.0)
    alt = np.radians(alt_deg)
    shaded = np.sin(alt) * np.sin(slope) + np.cos(alt) * np.cos(slope) * np.cos(az - aspect)
    return (np.clip(shaded, 0, 1) * 255).astype(np.uint8)


def build_frontend_terrain(dem80: terrain.Dem) -> None:
    FRONTEND_TERRAIN_DIR.mkdir(parents=True, exist_ok=True)
    crop = dem80.heights[CROP, CROP]
    hm = crop.reshape(500, 9, 500, 9).mean(axis=(1, 3))
    lo, hi = float(hm.min()), float(hm.max())
    ((hm - lo) / (hi - lo) * 65535).round().astype("<u2").tofile(FRONTEND_TERRAIN_DIR / "heightmap.bin")
    hs = crop.reshape(900, 5, 900, 5).mean(axis=(1, 3))
    Image.fromarray(_hillshade(hs, 400.0)).save(FRONTEND_TERRAIN_DIR / "hillshade.png")
    meta = {"extent_m": 360000, "heightmap_n": 500, "h_min_m": round(lo, 1),
            "h_max_m": round(hi, 1), "hillshade_n": 900}
    (FRONTEND_TERRAIN_DIR / "meta.json").write_text(json.dumps(meta))
    print(f"frontend terrain: {meta}")


def main() -> None:
    dem80 = terrain.load_dem_img(DEM_RAW)
    build_runtime_dem(dem80)
    build_curated_horizons(dem80)
    build_frontend_terrain(dem80)


if __name__ == "__main__":
    main()
