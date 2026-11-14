"""LOLA polar-stereographic DEM access and terrain horizon masks (south pole).

Projection follows PDS DSMAP_POLAR.CAT (south pole): lon 0 up, 90E right.
Heights are metres relative to the 1737.4 km reference sphere.
"""
from dataclasses import dataclass
from pathlib import Path

import numpy as np

R_MOON_M = 1737400.0
N_AZ = 720
MAX_RANGE_M = 150_000.0
FULL_COVERAGE_LAT = -84.95  # south of this (exact bound ~-84.95), 150 km rays stay inside the 80S DEM disk


@dataclass(frozen=True, eq=False)
class Dem:
    heights: np.ndarray  # (n, n) float32 metres
    scale_m: float       # metres per pixel
    offset: float        # 0-based pixel coordinate of the pole

    @property
    def n(self) -> int:
        return self.heights.shape[0]


def latlon_to_xy(lat, lon):
    r = 2.0 * R_MOON_M * np.tan(np.radians(90.0 + np.asarray(lat, float)) / 2.0)
    lam = np.radians(np.asarray(lon, float))
    return r * np.sin(lam), r * np.cos(lam)


def xy_to_latlon(x, y):
    r = np.hypot(x, y)
    lat = -90.0 + np.degrees(2.0 * np.arctan(0.5 * r / R_MOON_M))
    lon = np.degrees(np.arctan2(x, y))
    return lat, lon


def _xy_to_pixel(dem: Dem, x, y):
    return np.asarray(x) / dem.scale_m + dem.offset, -np.asarray(y) / dem.scale_m + dem.offset


def sample(dem: Dem, x, y) -> np.ndarray:
    col, row = _xy_to_pixel(dem, x, y)
    c0 = np.floor(col).astype(np.int64)
    r0 = np.floor(row).astype(np.int64)
    valid = (c0 >= 0) & (r0 >= 0) & (c0 < dem.n - 1) & (r0 < dem.n - 1)
    c0c = np.clip(c0, 0, dem.n - 2)
    r0c = np.clip(r0, 0, dem.n - 2)
    fc = col - c0c
    fr = row - r0c
    h = dem.heights
    v = (h[r0c, c0c] * (1 - fc) * (1 - fr) + h[r0c, c0c + 1] * fc * (1 - fr)
         + h[r0c + 1, c0c] * (1 - fc) * fr + h[r0c + 1, c0c + 1] * fc * fr)
    return np.where(valid, v, np.nan)


def height_at(dem: Dem, lat: float, lon: float) -> float:
    x, y = latlon_to_xy(lat, lon)
    return float(sample(dem, np.array([x]), np.array([y]))[0])


def horizon_dip_deg(obs_h: float) -> float:
    return float(np.degrees(np.arccos(R_MOON_M / (R_MOON_M + obs_h))))


def smooth_horizon(obs_h: float, n_az: int = N_AZ) -> np.ndarray:
    return np.full(n_az, -horizon_dip_deg(obs_h))


def horizon_mask(dem: Dem, lat: float, lon: float, obs_h: float = 2.0,
                 n_az: int = N_AZ, max_range_m: float = MAX_RANGE_M) -> np.ndarray:
    """Max terrain elevation angle (deg) per azimuth bin, including lunar curvature."""
    x0, y0 = latlon_to_xy(lat, lon)
    h0 = float(sample(dem, np.array([x0]), np.array([y0]))[0])
    if np.isnan(h0):
        raise ValueError(f"site {lat},{lon} is outside the DEM")
    az = np.radians(np.arange(n_az) * 360.0 / n_az)[:, None]  # clockwise from local north
    d = np.arange(1, int(max_range_m / dem.scale_m) + 1) * dem.scale_m  # ground metres
    delta = (d / R_MOON_M)[None, :]
    lam1 = np.radians(lon)
    if abs(lat + 90.0) < 1e-9:
        # degenerate at the pole: azimuth A heads along meridian lon + A
        phi2 = np.broadcast_to(np.radians(-90.0) + delta, (n_az, delta.shape[1]))
        lam2 = lam1 + az + np.zeros_like(delta)
    else:
        phi1 = np.radians(lat)
        phi2 = np.arcsin(np.sin(phi1) * np.cos(delta) + np.cos(phi1) * np.sin(delta) * np.cos(az))
        lam2 = lam1 + np.arctan2(np.sin(az) * np.sin(delta) * np.cos(phi1),
                                 np.cos(delta) - np.sin(phi1) * np.sin(phi2))
    X, Y = latlon_to_xy(np.degrees(phi2), np.degrees(lam2))
    H = sample(dem, X, Y)
    theta = d / R_MOON_M
    r_obs = R_MOON_M + h0 + obs_h
    r_t = R_MOON_M + H
    el = np.degrees(np.arctan2(r_t * np.cos(theta) - r_obs, r_t * np.sin(theta)))
    el = np.where(np.isnan(el), -np.inf, el)
    mask = el.max(axis=1)
    # Only bins whose whole ray lies off the DEM get the smooth-sphere floor;
    # bins with any valid terrain keep their computed value untouched.
    return np.where(np.isneginf(mask), -horizon_dip_deg(obs_h), mask)


def load_dem_img(path: Path, n: int = 7600, scale_m: float = 80.0) -> Dem:
    dn = np.fromfile(path, dtype="<i2").reshape(n, n)
    return Dem(dn.astype(np.float32) * 0.5, scale_m, n / 2 - 0.5)


def load_dem_npz(path: Path) -> Dem:
    d = np.load(path)
    return Dem(d["dn"].astype(np.float32) * 0.5, float(d["scale_m"]), float(d["offset"]))
