"""Is the Moon above the 10-degree mask at each Deep Space Network complex?"""
import numpy as np
from skyfield.api import wgs84

from app.ephemeris import kernels, times_from_ms

DSN_STATIONS: dict[str, tuple[float, float, float]] = {
    "goldstone": (35.4267, -116.8900, 1000.0),
    "madrid": (40.4314, -4.2481, 830.0),
    "canberra": (-35.4014, 148.9817, 690.0),
}
MIN_ELEVATION_DEG = 10.0


def moon_elevations(t_ms) -> dict[str, np.ndarray]:
    _, eph, _, _ = kernels()
    t = times_from_ms(t_ms)
    out = {}
    for name, (lat, lon, elev) in DSN_STATIONS.items():
        station = eph["earth"] + wgs84.latlon(lat, lon, elevation_m=elev)
        alt, _, _ = station.at(t).observe(eph["moon"]).apparent().altaz()
        out[name] = np.atleast_1d(alt.degrees)
    return out


def dsn_visible(t_ms, min_el: float = MIN_ELEVATION_DEG) -> dict[str, np.ndarray]:
    return {name: el >= min_el for name, el in moon_elevations(t_ms).items()}
