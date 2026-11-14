"""Download SPICE kernels and the LOLA south-pole DEM into backend/data/raw.

Usage: python scripts/download_data.py [--kernels] [--dem]   (no flag = both)
"""
import argparse
import shutil
import ssl
import sys
import urllib.request
from pathlib import Path

import certifi

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import DEM_DOWNLOAD, KERNELS, RAW_DIR  # noqa: E402


def fetch(name: str, url: str, size: int | None) -> None:
    dest = RAW_DIR / name
    if dest.exists() and (size is None or dest.stat().st_size == size):
        print(f"skip {name} (present)")
        return
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_name(dest.name + ".part")
    ctx = ssl.create_default_context(cafile=certifi.where())
    print(f"downloading {name} ...", flush=True)
    with urllib.request.urlopen(url, context=ctx, timeout=60) as resp, open(tmp, "wb") as out:
        shutil.copyfileobj(resp, out, 1 << 20)
    got = tmp.stat().st_size
    if size is not None and got != size:
        tmp.unlink()
        raise SystemExit(f"{name}: expected {size} bytes, got {got}")
    tmp.rename(dest)
    print(f"ok {name} ({got} bytes)")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--kernels", action="store_true")
    p.add_argument("--dem", action="store_true")
    a = p.parse_args()
    both = not (a.kernels or a.dem)
    if a.kernels or both:
        for name, (url, size) in KERNELS.items():
            fetch(name, url, size)
    if a.dem or both:
        for name, (url, size) in DEM_DOWNLOAD.items():
            fetch(name, url, size)


if __name__ == "__main__":
    main()
