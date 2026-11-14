from tests.markers import requires_kernels


@requires_kernels
def test_warm_default_scenarios_fills_cache():
    from app import scenario

    scenario.cache_clear()
    assert scenario.warm_default_scenarios() == 2
    info = scenario.cache_stats()
    assert info["size"] == 2
    # the frontend's default request must be a cache hit
    req = scenario.ScenarioRequest(lat=-89.4667, lon=-136.667, start="2026-12-01T00:00:00Z",
                                   end="2026-12-31T00:00:00Z", step_min=10, obs_h=2,
                                   panel_mode="vertical-tracking", panel_az=0, area_m2=1, efficiency=0.3)
    scenario.compute_scenario(req)
    assert scenario.cache_stats()["hits"] == info["hits"] + 1


@requires_kernels
def test_compute_is_not_duplicated_under_concurrency():
    import threading

    from app import scenario

    scenario.cache_clear()
    req = scenario.ScenarioRequest(lat=0.67408, lon=23.47297, start="2026-12-01T00:00:00Z",
                                   end="2026-12-03T00:00:00Z", step_min=60)
    threads = [threading.Thread(target=scenario.compute_scenario, args=(req,)) for _ in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    info = scenario.cache_stats()
    assert info["misses"] == 1
    assert info["hits"] == 3


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


def _small(lon=23.47297, days=2):
    from app import scenario

    end = f"2026-12-{1 + days:02d}T00:00:00Z"
    return scenario.ScenarioRequest(lat=0.67408, lon=lon, start="2026-12-01T00:00:00Z", end=end, step_min=60)


@requires_kernels
def test_cache_hit_does_not_wait_for_compute_slot(monkeypatch):
    import time

    from app import scenario

    scenario.cache_clear()
    monkeypatch.setattr(scenario, "COMPUTE_WAIT_S", 5)
    req = _small()
    first = scenario.compute_scenario(req)
    scenario._compute_sem.acquire()
    try:
        t0 = time.monotonic()
        again = scenario.compute_scenario(req)
        assert time.monotonic() - t0 < 1.0
    finally:
        scenario._compute_sem.release()
    assert again is first


@requires_kernels
def test_busy_raises_server_busy(monkeypatch):
    import pytest

    from app import scenario

    scenario.cache_clear()
    monkeypatch.setattr(scenario, "COMPUTE_WAIT_S", 0.05)
    scenario._compute_sem.acquire()
    try:
        with pytest.raises(scenario.ServerBusy):
            scenario.compute_scenario(_small())
    finally:
        scenario._compute_sem.release()


_BODY = {"lat": 0.67408, "lon": 23.47297, "start": "2026-12-01T00:00:00Z",
         "end": "2026-12-03T00:00:00Z", "step_min": 60}


@requires_kernels
def test_busy_maps_to_503_with_retry_after(monkeypatch):
    from fastapi.testclient import TestClient

    from app import main, scenario

    scenario.cache_clear()
    monkeypatch.setattr(scenario, "COMPUTE_WAIT_S", 0.05)
    scenario._compute_sem.acquire()
    try:
        r = TestClient(main.app).post("/api/scenario", json=_BODY)
    finally:
        scenario._compute_sem.release()
    assert r.status_code == 503
    assert r.json() == {"detail": "The server is busy. Try again in a moment."}
    assert r.headers["Retry-After"] == "5"


def test_health_answers_while_compute_is_busy():
    from fastapi.testclient import TestClient

    from app import main, scenario

    scenario._compute_sem.acquire()
    try:
        r = TestClient(main.app).get("/api/health")
    finally:
        scenario._compute_sem.release()
    assert r.status_code == 200


def _small_day(day):
    from app import scenario

    return scenario.ScenarioRequest(lat=0.67408, lon=23.47297, start=f"2026-12-{day:02d}T00:00:00Z",
                                    end=f"2026-12-{day + 2:02d}T00:00:00Z", step_min=60)


@requires_kernels
def test_cache_evicts_least_recently_used(monkeypatch):
    from app import scenario

    scenario.cache_clear()
    monkeypatch.setattr(scenario, "_CACHE_MAX", 2)
    a, b, c = _small_day(1), _small_day(5), _small_day(9)
    scenario.compute_scenario(a)
    scenario.compute_scenario(b)
    scenario.compute_scenario(a)  # hit: b is now the least recently used
    scenario.compute_scenario(c)
    assert scenario.cache_stats()["size"] == 2
    misses = scenario.cache_stats()["misses"]
    scenario.compute_scenario(a)
    assert scenario.cache_stats()["misses"] == misses  # a survived
    scenario.compute_scenario(b)
    assert scenario.cache_stats()["misses"] == misses + 1  # b was evicted


@requires_kernels
def test_waiter_cap_rejects_immediately(monkeypatch):
    import threading
    import time

    import pytest

    from app import scenario

    scenario.cache_clear()
    monkeypatch.setattr(scenario, "MAX_WAITERS", 2)
    monkeypatch.setattr(scenario, "COMPUTE_WAIT_S", 5)
    results = []

    def run(req):
        results.append(scenario.compute_scenario(req))

    threads = [threading.Thread(target=run, args=(_small_day(d),)) for d in (1, 5)]
    scenario._compute_sem.acquire()
    try:
        for t in threads:
            t.start()
        deadline = time.monotonic() + 2
        while scenario.cache_stats()["waiting"] < 2 and time.monotonic() < deadline:
            time.sleep(0.01)
        assert scenario.cache_stats()["waiting"] == 2
        t0 = time.monotonic()
        with pytest.raises(scenario.ServerBusy):
            scenario.compute_scenario(_small_day(9))
        assert time.monotonic() - t0 < 1.0
    finally:
        scenario._compute_sem.release()
        for t in threads:
            t.join(timeout=30)
    assert len(results) == 2
    assert scenario.cache_stats()["waiting"] == 0


@requires_kernels
def test_waiter_count_does_not_leak_on_timeout(monkeypatch):
    import pytest

    from app import scenario

    scenario.cache_clear()
    monkeypatch.setattr(scenario, "COMPUTE_WAIT_S", 0.05)
    scenario._compute_sem.acquire()
    try:
        with pytest.raises(scenario.ServerBusy):
            scenario.compute_scenario(_small_day(1))
    finally:
        scenario._compute_sem.release()
    assert scenario.cache_stats()["waiting"] == 0


def test_health_and_sites_are_async():
    import inspect

    from app import main

    assert inspect.iscoroutinefunction(main.health)
    assert inspect.iscoroutinefunction(main.sites)


def test_warm_treats_server_busy_as_failure(monkeypatch):
    from app import scenario

    def busy(_req):
        raise scenario.ServerBusy()

    monkeypatch.setattr(scenario, "compute_scenario", busy)
    assert scenario.warm_default_scenarios() == 0
