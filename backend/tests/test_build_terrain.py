import json

import numpy as np
import pytest

from app.config import FRONTEND_TERRAIN_DIR
from scripts.build_terrain import _hillshade


def test_hillshade_lights_northwest_slopes():
    n = 101
    yy, xx = np.mgrid[0:n, 0:n]
    r = np.hypot(xx - 50, yy - 50)
    h = np.where(r < 30, -1000 * (1 - (r / 30) ** 2), 0.0)
    hs = _hillshade(h, 100.0)
    # Lit from az 315 (NW). The NW inner wall faces SE, away from the light (dark);
    # the SE inner wall faces NW, toward the light (bright).
    assert hs[35, 35] < 128, hs[35, 35]
    assert hs[65, 65] > 200, hs[65, 65]
    assert hs[35, 35] < hs[65, 65]


def test_frontend_terrain_assets_consistent():
    meta_path = FRONTEND_TERRAIN_DIR / "meta.json"
    if not meta_path.exists():
        pytest.skip("frontend terrain missing: run scripts/build_terrain.py")
    meta = json.loads(meta_path.read_text())
    raw = (FRONTEND_TERRAIN_DIR / "heightmap.bin").read_bytes()
    n = meta["heightmap_n"]
    assert len(raw) == n * n * 2
    values = np.frombuffer(raw, dtype="<u2")
    assert values.min() == 0
    assert values.max() == 65535
    assert meta["h_min_m"] < meta["h_max_m"]
    assert meta["extent_m"] == 360000
