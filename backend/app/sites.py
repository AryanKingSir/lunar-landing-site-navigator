import json
from functools import lru_cache

from app.config import SITES_JSON


@lru_cache(maxsize=1)
def load_sites() -> list[dict]:
    return json.loads(SITES_JSON.read_text())


def get_site(site_id: str) -> dict | None:
    return next((s for s in load_sites() if s["id"] == site_id), None)
