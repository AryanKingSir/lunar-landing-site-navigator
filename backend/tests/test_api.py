import gzip
import json

from fastapi.testclient import TestClient

from tests.markers import requires_kernels


def _client():
    from app.main import app
    return TestClient(app)


def test_health_and_sites():
    c = _client()
    assert c.get("/api/health").json() == {"status": "ok"}
    sites = c.get("/api/sites").json()
    assert any(s["id"] == "connecting-ridge" for s in sites)


def test_rejects_bad_ranges():
    c = _client()
    body = {"lat": 0.67, "lon": 23.47, "start": "2026-12-02T00:00:00Z", "end": "2026-12-01T00:00:00Z"}
    assert c.post("/api/scenario", json=body).status_code == 422
    body = {"lat": 0.67, "lon": 23.47, "start": "2026-01-01T00:00:00Z", "end": "2027-01-01T00:00:00Z", "step_min": 1}
    assert c.post("/api/scenario", json=body).status_code == 422


@requires_kernels
def test_apollo11_two_days():
    c = _client()
    body = {"lat": 0.67408, "lon": 23.47297, "start": "2026-12-01T00:00:00Z",
            "end": "2026-12-03T00:00:00Z", "step_min": 60}
    r = c.post("/api/scenario", json=body)
    assert r.status_code == 200, r.text
    d = r.json()
    assert len(d["samples"]["t"]) == 48
    assert d["terrain_source"].startswith("smooth")
    assert len(d["horizon"]["el"]) == 720
    assert set(d["metrics"]) == {"illumination_pct", "sun_time_pct", "longest_dark_h", "earth_vis_pct",
                                 "dte_pct", "mean_power_w", "energy_wh", "max_sun_el", "min_sun_el"}
    assert d["metrics"]["earth_vis_pct"] == 100.0  # near side, near the sub-Earth point


@requires_kernels
def test_thirty_day_response_is_compact():
    c = _client()
    body = {"lat": -89.4667, "lon": -136.667, "start": "2026-12-01T00:00:00Z", "end": "2026-12-31T00:00:00Z"}
    d = c.post("/api/scenario", json=body).json()
    assert len(gzip.compress(json.dumps(d).encode())) < 100_000
    assert len(d["samples"]["sun_vec"][0]) == 3
