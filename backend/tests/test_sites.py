from app.sites import get_site, load_sites

KEYS = {"id", "name", "lat", "lon", "category", "mission", "description", "source"}


def test_sites_schema():
    sites = load_sites()
    assert len(sites) >= 11
    ids = [s["id"] for s in sites]
    assert len(ids) == len(set(ids))
    for s in sites:
        assert set(s) == KEYS
        assert -90 <= s["lat"] <= 90 and -180 <= s["lon"] <= 360
        assert s["category"] in {"south-pole", "contrast"}
    assert all(s["lat"] <= -80 for s in sites if s["category"] == "south-pole")


def test_get_site():
    assert get_site("apollo11")["lat"] > 0
    assert get_site("nope") is None
