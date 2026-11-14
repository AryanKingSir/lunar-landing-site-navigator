"""Simple solar-array power model (no atmosphere: flux depends only on distance)."""
import numpy as np

SOLAR_CONSTANT_W_M2 = 1361.0
AU_KM = 149_597_870.7
PANEL_MODES = ("vertical-tracking", "horizontal", "fixed-vertical")


def panel_power_w(sun_el, sun_az, sun_dist_km, sun_frac, mode: str = "vertical-tracking",
                  area_m2: float = 1.0, efficiency: float = 0.3, panel_az: float = 0.0):
    el = np.radians(np.asarray(sun_el, float))
    if mode == "vertical-tracking":
        cos_i = np.cos(el)
    elif mode == "horizontal":
        cos_i = np.sin(el)
    elif mode == "fixed-vertical":
        cos_i = np.cos(el) * np.cos(np.radians(np.asarray(sun_az, float) - panel_az))
    else:
        raise ValueError(f"unknown panel mode {mode!r}; expected one of {PANEL_MODES}")
    flux = SOLAR_CONSTANT_W_M2 * (AU_KM / np.asarray(sun_dist_km, float)) ** 2
    return flux * np.clip(cos_i, 0.0, None) * np.asarray(sun_frac, float) * area_m2 * efficiency
