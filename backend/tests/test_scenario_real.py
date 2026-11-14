from datetime import datetime, timezone

from tests.markers import requires_dem_runtime, requires_kernels


def _run(lat, lon):
    from app.scenario import ScenarioRequest, compute_scenario
    req = ScenarioRequest(lat=lat, lon=lon, start=datetime(2026, 12, 1, tzinfo=timezone.utc),
                          end=datetime(2026, 12, 31, tzinfo=timezone.utc), step_min=30)
    return compute_scenario(req)


@requires_kernels
@requires_dem_runtime
def test_permanently_shadowed_floor_is_dark():
    d = _run(-89.67, 129.78)
    assert d["terrain_source"].startswith("LOLA")
    assert d["metrics"]["illumination_pct"] < 1.0


@requires_kernels
@requires_dem_runtime
def test_connecting_ridge_is_well_lit():
    assert _run(-89.4667, -136.667)["metrics"]["illumination_pct"] > 40.0


@requires_kernels
def test_far_side_never_sees_earth():
    d = _run(-45.4446, 177.5991)
    assert d["metrics"]["earth_vis_pct"] == 0.0 and d["metrics"]["dte_pct"] == 0.0


@requires_kernels
def test_equator_has_roughly_half_sunlight():
    assert 35.0 < _run(0.67408, 23.47297)["metrics"]["sun_time_pct"] < 65.0
