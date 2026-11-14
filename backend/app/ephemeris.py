"""Topocentric Sun and Earth positions for an observer on the lunar surface.

Uses Skyfield's documented Moon-frame recipe (MOON_ME_DE421 via moon_080317.tf +
moon_pa_de421 binary PCK), which includes physical libration.
"""
from dataclasses import dataclass
from functools import lru_cache

import numpy as np
from skyfield.api import Loader
from skyfield.planetarylib import PlanetaryConstants

from app.config import RAW_DIR


@dataclass(frozen=True, eq=False)
class Ephem:
    sun_az: np.ndarray
    sun_el: np.ndarray
    sun_dist_km: np.ndarray
    sun_vec: np.ndarray
    earth_az: np.ndarray
    earth_el: np.ndarray
    earth_dist_km: np.ndarray
    earth_vec: np.ndarray


@lru_cache(maxsize=1)
def kernels():
    load = Loader(str(RAW_DIR), verbose=False)
    ts = load.timescale(builtin=True)
    eph = load("de440s.bsp")
    pc = PlanetaryConstants()
    pc.read_text(load("moon_080317.tf"))
    pc.read_text(load("pck00011.tpc"))
    pc.read_binary(load("moon_pa_de421_1900-2050.bpc"))
    frame = pc.build_frame_named("MOON_ME_DE421")
    return ts, eph, pc, frame


def times_from_ms(t_ms: np.ndarray):
    ts = kernels()[0]
    return ts.utc(1970, 1, 1, 0, 0, np.asarray(t_ms, dtype=float) / 1000.0)


def _observe(site, target, t, frame):
    app = site.at(t).observe(target).apparent()
    alt, az, dist = app.altaz()
    xyz = np.asarray(app.frame_xyz(frame).au, dtype=float).T.reshape(-1, 3)
    vec = xyz / np.linalg.norm(xyz, axis=1, keepdims=True)
    return (np.atleast_1d(az.degrees), np.atleast_1d(alt.degrees),
            np.atleast_1d(dist.km), vec)


def body_altaz(lat_deg: float, lon_deg: float, elev_m: float, t_ms: np.ndarray) -> Ephem:
    _, eph, pc, frame = kernels()
    site = eph["moon"] + pc.build_latlon_degrees(frame, lat_deg, lon_deg, elevation_m=elev_m)
    t = times_from_ms(t_ms)
    s_az, s_el, s_d, s_v = _observe(site, eph["sun"], t, frame)
    e_az, e_el, e_d, e_v = _observe(site, eph["earth"], t, frame)
    return Ephem(s_az, s_el, s_d, s_v, e_az, e_el, e_d, e_v)
