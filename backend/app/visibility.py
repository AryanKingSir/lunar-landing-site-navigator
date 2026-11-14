"""Disk visibility above a terrain mask and boolean-series -> time windows."""
import numpy as np

SUN_RADIUS_KM = 695_700.0
EARTH_RADIUS_KM = 6_371.0


def angular_radius_deg(radius_km, dist_km):
    return np.degrees(np.arcsin(radius_km / np.asarray(dist_km, dtype=float)))


def disk_fraction(center_el, radius_deg, horizon_el):
    """Fraction of a circular disk above a horizontal line (circular-segment area)."""
    h = (np.asarray(center_el, float) - np.asarray(horizon_el, float)) / np.asarray(radius_deg, float)
    h = np.clip(h, -1.0, 1.0)
    return 1.0 - (np.arccos(h) - h * np.sqrt(1.0 - h * h)) / np.pi


def interp_mask(mask_el: np.ndarray, az_deg) -> np.ndarray:
    n = len(mask_el)
    pos = np.mod(np.asarray(az_deg, float), 360.0) / (360.0 / n)
    i0 = np.floor(pos).astype(np.int64) % n
    i1 = (i0 + 1) % n
    f = pos - np.floor(pos)
    return mask_el[i0] * (1 - f) + mask_el[i1] * f


def _runs(flag) -> tuple[np.ndarray, np.ndarray]:
    padded = np.concatenate([[0], np.asarray(flag, bool).astype(np.int8), [0]])
    d = np.diff(padded)
    return np.where(d == 1)[0], np.where(d == -1)[0]


def to_windows(t_ms, flag, step_ms: int) -> list[list[int]]:
    starts, ends = _runs(flag)
    return [[int(t_ms[s]), int(t_ms[e - 1]) + int(step_ms)] for s, e in zip(starts, ends)]


def longest_run(flag) -> int:
    starts, ends = _runs(flag)
    return int((ends - starts).max()) if len(starts) else 0
