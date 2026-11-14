from tests.markers import requires_kernels


@requires_kernels
def test_warm_default_scenarios_fills_cache():
    from app import scenario

    scenario._compute.cache_clear()
    assert scenario.warm_default_scenarios() == 2
    info = scenario._compute.cache_info()
    assert info.currsize == 2
    # the frontend's default request must be a cache hit
    req = scenario.ScenarioRequest(lat=-89.4667, lon=-136.667, start="2026-12-01T00:00:00Z",
                                   end="2026-12-31T00:00:00Z", step_min=10, obs_h=2,
                                   panel_mode="vertical-tracking", panel_az=0, area_m2=1, efficiency=0.3)
    scenario.compute_scenario(req)
    assert scenario._compute.cache_info().hits == info.hits + 1
