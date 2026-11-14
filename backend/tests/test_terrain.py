import math

import numpy as np
import pytest

from app import terrain as T


def test_projection_pole_and_roundtrip():
    x, y = T.latlon_to_xy(-90.0, 0.0)
    assert abs(x) < 1e-6 and abs(y) < 1e-6
    lat, lon = T.xy_to_latlon(*T.latlon_to_xy(-85.3, -120.4))
    assert abs(lat + 85.3) < 1e-9 and abs(((lon + 120.4 + 180) % 360) - 180) < 1e-9


def test_projection_orientation_matches_pds_catalog():
    # lon 0 is "up" (+y), 90E is "right" (+x)
    x0, y0 = T.latlon_to_xy(-89.0, 0.0)
    x90, y90 = T.latlon_to_xy(-89.0, 90.0)
    r = 2 * T.R_MOON_M * math.tan(math.radians(0.5))
    assert abs(y0 - r) < 1e-6 and abs(x0) < 1e-6
    assert abs(x90 - r) < 1e-6 and abs(y90) < 1e-6
    dem = T.Dem(np.zeros((101, 101), np.float32), 80.0, 50.0)
    col, row = T._xy_to_pixel(dem, np.array([0.0]), np.array([800.0]))
    assert col[0] == pytest.approx(50.0) and row[0] == pytest.approx(40.0)  # up = smaller row


def test_sample_bilinear_and_outside_is_nan():
    h = np.arange(16, dtype=np.float32).reshape(4, 4)
    dem = T.Dem(h, 10.0, 1.5)  # pixel (row 1.5, col 1.5) is the origin
    v = T.sample(dem, np.array([0.0, 1e6]), np.array([0.0, 0.0]))
    assert v[0] == pytest.approx(7.5)  # mean of 5, 6, 9, 10
    assert np.isnan(v[1])


def test_flat_terrain_gives_geometric_dip():
    dem = T.Dem(np.zeros((801, 801), np.float32), 80.0, 400.0)
    mask = T.horizon_mask(dem, -90.0, 0.0, obs_h=2.0, max_range_m=20_000.0)
    dip = T.horizon_dip_deg(2.0)
    assert dip == pytest.approx(0.0869, abs=2e-4)
    assert np.all(np.abs(mask + dip) < 0.01)


def test_wall_to_the_north_raises_mask_at_azimuth_zero_only():
    n, s, off = 801, 80.0, 400.0
    h = np.zeros((n, n), np.float32)
    # block 1000 m tall where y in [10 km, 12 km] (rows above centre), |x| < 2 km
    rows = slice(int(off - 12_000 / s), int(off - 10_000 / s) + 1)
    cols = slice(int(off - 2_000 / s), int(off + 2_000 / s) + 1)
    h[rows, cols] = 1000.0
    dem = T.Dem(h, s, off)
    mask = T.horizon_mask(dem, -90.0, 0.0, obs_h=2.0, max_range_m=20_000.0)
    d = 10_000.0
    th = d / T.R_MOON_M
    expected = math.degrees(math.atan2((T.R_MOON_M + 1000) * math.cos(th) - (T.R_MOON_M + 2),
                                       (T.R_MOON_M + 1000) * math.sin(th)))
    assert mask[0] == pytest.approx(expected, abs=0.15)  # ~5.5 deg
    assert mask[360] == pytest.approx(-T.horizon_dip_deg(2.0), abs=0.01)  # south: flat


def test_smooth_horizon():
    m = T.smooth_horizon(2.0)
    assert m.shape == (720,) and np.allclose(m, -T.horizon_dip_deg(2.0))
