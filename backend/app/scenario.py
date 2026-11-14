"""Combine ephemeris, terrain, DSN and power into one scenario result."""
import json
import logging
import threading
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Literal

import numpy as np
from pydantic import BaseModel, Field, model_validator

from app import dsn, ephemeris, power, terrain, visibility
from app.config import DEM_RUNTIME, HORIZONS_DIR
from app.sites import get_site, load_sites

MAX_SAMPLES = 5_000  # UI max is 60 d @ 20 min = 4,320; keeps peak RAM under Render free tier (512 MB)
CURATED_OBS_H = 2.0


def _utc_ms(dt: datetime) -> int:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp() * 1000)


class ScenarioRequest(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=360)
    start: datetime
    end: datetime
    step_min: int = Field(default=10, ge=1, le=240)
    obs_h: float = Field(default=2.0, ge=0, le=100)
    panel_mode: Literal["vertical-tracking", "horizontal", "fixed-vertical"] = "vertical-tracking"
    panel_az: float = 0.0
    area_m2: float = Field(default=1.0, gt=0, le=100)
    efficiency: float = Field(default=0.3, gt=0, le=1)

    @model_validator(mode="after")
    def _check_range(self):
        span = _utc_ms(self.end) - _utc_ms(self.start)
        if span <= 0:
            raise ValueError("end must be after start")
        n = span // (self.step_min * 60_000)
        if n > MAX_SAMPLES:
            raise ValueError(f"{n} samples exceeds {MAX_SAMPLES}; increase step_min or shorten the range")
        return self


@lru_cache(maxsize=1)
def _runtime_dem():
    return terrain.load_dem_npz(DEM_RUNTIME) if DEM_RUNTIME.exists() else None


@lru_cache(maxsize=256)
def get_horizon(lat: float, lon: float, obs_h: float):
    if obs_h == CURATED_OBS_H:
        for s in load_sites():
            path = HORIZONS_DIR / f"{s['id']}.json"
            if abs(s["lat"] - lat) < 1e-6 and abs(s["lon"] - lon) < 1e-6 and path.exists():
                d = json.loads(path.read_text())
                return np.array(d["el"]), "LOLA 80 m (precomputed)", d["partial"], d["site_height_m"]
    dem = _runtime_dem()
    if dem is not None and lat <= -80.0:
        h0 = terrain.height_at(dem, lat, lon)
        if not np.isnan(h0):
            mask = terrain.horizon_mask(dem, lat, lon, obs_h)
            return mask, "LOLA 240 m", lat > terrain.FULL_COVERAGE_LAT, round(h0, 1)
    return terrain.smooth_horizon(obs_h), "smooth sphere (no terrain data)", False, None


log = logging.getLogger(__name__)

DEFAULT_WARM = [("connecting-ridge", 30), ("apollo11", 30)]
WARM_START = "2026-12-01T00:00:00Z"


def warm_default_scenarios() -> int:
    """Pre-compute the frontend's default request per site so the first user hits the cache."""
    done = 0
    for site_id, days in DEFAULT_WARM:
        try:
            site = get_site(site_id)
            if site is None:
                raise ValueError(f"unknown site {site_id}")
            start = datetime.fromisoformat(WARM_START.replace("Z", "+00:00"))
            end = (start + timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")
            compute_scenario(ScenarioRequest(
                lat=site["lat"], lon=site["lon"], start=WARM_START, end=end, step_min=10, obs_h=2,
                panel_mode="vertical-tracking", panel_az=0, area_m2=1, efficiency=0.3))
            done += 1
        except Exception:
            log.exception("warm-up failed for %s", site_id)
    return done


# One computation at a time: a concurrent caller waits and then hits the cache, and peak RAM stays bounded (512 MB host).
_compute_lock = threading.Lock()


def compute_scenario(req: ScenarioRequest) -> dict:
    with _compute_lock:
        return _compute(req.model_dump_json())


def _r(a, nd=2):
    return np.round(np.asarray(a, float), nd).tolist()


# Full response dicts are MBs each; keep few so Render free (512 MB) does not OOM
@lru_cache(maxsize=8)
def _compute(key: str) -> dict:
    req = ScenarioRequest.model_validate_json(key)
    step_ms = req.step_min * 60_000
    t = np.arange(_utc_ms(req.start), _utc_ms(req.end), step_ms, dtype=np.int64)
    mask, source, partial, h0 = get_horizon(req.lat, req.lon, req.obs_h)
    e = ephemeris.body_altaz(req.lat, req.lon, (h0 or 0.0) + req.obs_h, t)

    sun_frac = visibility.disk_fraction(
        e.sun_el, visibility.angular_radius_deg(visibility.SUN_RADIUS_KM, e.sun_dist_km),
        visibility.interp_mask(mask, e.sun_az))
    earth_frac = visibility.disk_fraction(
        e.earth_el, visibility.angular_radius_deg(visibility.EARTH_RADIUS_KM, e.earth_dist_km),
        visibility.interp_mask(mask, e.earth_az))
    earth_vis = earth_frac >= 0.5
    stations = dsn.dsn_visible(t)
    dte = earth_vis & np.logical_or.reduce(list(stations.values()))
    pw = power.panel_power_w(e.sun_el, e.sun_az, e.sun_dist_km, sun_frac, req.panel_mode,
                             req.area_m2, req.efficiency, req.panel_az)
    sun_up = sun_frac > 0
    dt_h = req.step_min / 60.0

    return {
        "terrain_source": source,
        "terrain_partial": bool(partial),
        "site_height_m": h0,
        "horizon": {"az": _r(np.arange(len(mask)) * 360.0 / len(mask), 2), "el": _r(mask, 2)},
        "samples": {
            "t": t.tolist(),
            "sun_az": _r(e.sun_az), "sun_el": _r(e.sun_el), "sun_frac": _r(sun_frac, 3),
            "earth_az": _r(e.earth_az), "earth_el": _r(e.earth_el), "earth_frac": _r(earth_frac, 3),
            "earth_vis": earth_vis.tolist(),
            **{f"dsn_{k}": v.tolist() for k, v in stations.items()},
            "dte": dte.tolist(),
            "power_w": _r(pw, 0),
            "sun_vec": _r(e.sun_vec, 4), "earth_vec": _r(e.earth_vec, 4),
        },
        "windows": {
            "sun": visibility.to_windows(t, sun_up, step_ms),
            "earth": visibility.to_windows(t, earth_vis, step_ms),
            "dte": visibility.to_windows(t, dte, step_ms),
        },
        "metrics": {
            "illumination_pct": round(float(sun_frac.mean() * 100), 2),
            "sun_time_pct": round(float(sun_up.mean() * 100), 2),
            "longest_dark_h": round(visibility.longest_run(~sun_up) * dt_h, 2),
            "earth_vis_pct": round(float(earth_vis.mean() * 100), 2),
            "dte_pct": round(float(dte.mean() * 100), 2),
            "mean_power_w": round(float(pw.mean()), 1),
            "energy_wh": round(float(pw.sum() * dt_h), 0),
            "max_sun_el": round(float(e.sun_el.max()), 3),
            "min_sun_el": round(float(e.sun_el.min()), 3),
        },
    }
