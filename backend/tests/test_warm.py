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


@requires_kernels
def test_compute_is_not_duplicated_under_concurrency():
    import threading

    from app import scenario

    scenario._compute.cache_clear()
    req = scenario.ScenarioRequest(lat=0.67408, lon=23.47297, start="2026-12-01T00:00:00Z",
                                   end="2026-12-03T00:00:00Z", step_min=60)
    threads = [threading.Thread(target=scenario.compute_scenario, args=(req,)) for _ in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    info = scenario._compute.cache_info()
    assert info.misses == 1
    assert info.hits == 3


def test_warm_survives_a_missing_site(monkeypatch):
    from app import scenario

    monkeypatch.setattr(scenario, "get_site", lambda _site_id: None)
    assert scenario.warm_default_scenarios() == 0


def _run_lifespan(monkeypatch, warm_env):
    import threading

    from fastapi.testclient import TestClient

    from app import main

    called = threading.Event()
    calls = []

    def stub():
        calls.append(1)
        called.set()
        return 0

    monkeypatch.setattr(main, "warm_default_scenarios", stub)
    if warm_env is None:
        monkeypatch.delenv("WARM_CACHE", raising=False)
    else:
        monkeypatch.setenv("WARM_CACHE", warm_env)
    with TestClient(main.app):
        called.wait(timeout=2)
    return calls


def test_warm_is_skipped_when_disabled(monkeypatch):
    assert _run_lifespan(monkeypatch, "0") == []


def test_warm_runs_once_when_enabled(monkeypatch):
    assert _run_lifespan(monkeypatch, None) == [1]
