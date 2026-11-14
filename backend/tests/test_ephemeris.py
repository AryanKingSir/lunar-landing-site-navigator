import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pytest

from tests.markers import requires_kernels

FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "horizons.json").read_text())


def _ms(iso: str) -> int:
    return int(datetime.strptime(iso, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc).timestamp() * 1000)


@requires_kernels
@pytest.mark.parametrize("row", FIXTURE, ids=lambda r: f"{r['site']}-{r['body']}-{r['time_utc']}")
def test_matches_jpl_horizons(row):
    from app.ephemeris import body_altaz

    e = body_altaz(row["lat"], row["lon"], row["elev_m"], np.array([_ms(row["time_utc"])]))
    el = e.sun_el[0] if row["body"] == "sun" else e.earth_el[0]
    az = e.sun_az[0] if row["body"] == "sun" else e.earth_az[0]
    assert abs(el - row["el"]) < 0.05
    if row["el"] < 80:  # azimuth is ill-defined near zenith
        daz = (az - row["az"] + 180) % 360 - 180
        assert abs(daz) < 0.1


@requires_kernels
def test_vectorized_shapes_and_unit_vectors():
    from app.ephemeris import body_altaz

    t = np.arange(10) * 3_600_000 + _ms("2026-12-01T00:00:00Z")
    e = body_altaz(-89.4667, -136.667, 1947.0, t)
    assert e.sun_el.shape == (10,) and e.earth_vec.shape == (10, 3)
    assert np.allclose(np.linalg.norm(e.sun_vec, axis=1), 1.0, atol=1e-9)
    assert 1.4e8 < e.sun_dist_km.mean() < 1.6e8
    assert 3.5e5 < e.earth_dist_km.mean() < 4.1e5
