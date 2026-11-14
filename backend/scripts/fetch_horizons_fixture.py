"""Fetch reference Sun/Earth az/el from the JPL Horizons API for ephemeris tests."""
import json
import ssl
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

import certifi

OUT = Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "horizons.json"
SITES = {
    "connecting-ridge": (-89.4667, -136.667, 1947.0),
    "apollo11": (0.67408, 23.47297, 0.0),
}
TIMES = ["2026-11-20 00:00", "2026-12-05 12:00", "2027-01-10 06:30"]
BODIES = {"sun": "10", "earth": "399"}
API = "https://ssd.jpl.nasa.gov/api/horizons.api"


def query(body: str, lat: float, lon: float, elev_m: float) -> list[tuple[str, float, float]]:
    params = {
        "format": "json",
        "COMMAND": f"'{body}'",
        "CENTER": "'coord@301'",
        "COORD_TYPE": "'GEODETIC'",
        "SITE_COORD": f"'{lon},{lat},{elev_m / 1000.0}'",
        "MAKE_EPHEM": "'YES'",
        "EPHEM_TYPE": "'OBSERVER'",
        "TLIST": " ".join(f"'{t}'" for t in TIMES),
        "TLIST_TYPE": "'CAL'",
        "QUANTITIES": "'4'",
        "ANG_FORMAT": "'DEG'",
        "CSV_FORMAT": "'YES'",
        "EXTRA_PREC": "'YES'",
    }
    url = API + "?" + urllib.parse.urlencode(params)
    ctx = ssl.create_default_context(cafile=certifi.where())
    with urllib.request.urlopen(url, context=ctx, timeout=60) as r:
        result = json.load(r)["result"]
    block = result.split("$$SOE")[1].split("$$EOE")[0]
    rows = []
    for line in block.strip().splitlines():
        parts = [p.strip() for p in line.split(",")]
        stamp = datetime.strptime(parts[0], "%Y-%b-%d %H:%M:%S.%f")
        rows.append((stamp.strftime("%Y-%m-%dT%H:%M:%SZ"), float(parts[3]), float(parts[4])))
    return rows


def main() -> None:
    out = []
    for site, (lat, lon, elev) in SITES.items():
        for body_name, body in BODIES.items():
            for time_utc, az, el in query(body, lat, lon, elev):
                out.append({"site": site, "lat": lat, "lon": lon, "elev_m": elev,
                            "body": body_name, "time_utc": time_utc, "az": az, "el": el})
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=1))
    print(f"wrote {len(out)} rows to {OUT}")


if __name__ == "__main__":
    main()
