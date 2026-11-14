import pytest

from app.config import DEM_RAW, DEM_RUNTIME, KERNELS, RAW_DIR

requires_kernels = pytest.mark.skipif(
    not all((RAW_DIR / name).exists() for name in KERNELS),
    reason="kernels missing: run scripts/download_data.py --kernels",
)
requires_dem_raw = pytest.mark.skipif(
    not DEM_RAW.exists(), reason="DEM missing: run scripts/download_data.py --dem"
)
requires_dem_runtime = pytest.mark.skipif(
    not DEM_RUNTIME.exists(), reason="runtime DEM missing: run scripts/build_terrain.py"
)
