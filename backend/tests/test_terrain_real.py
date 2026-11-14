import numpy as np
import pytest

from app import terrain as T
from app.config import DEM_RAW, DEM_RUNTIME
from tests.markers import requires_dem_raw, requires_dem_runtime


@requires_dem_raw
def test_known_heights_confirm_orientation():
    dem = T.load_dem_img(DEM_RAW)
    ridge = T.height_at(dem, -89.4667, -136.667)
    floor = T.height_at(dem, -89.67, 129.78)
    assert abs(ridge - 1947) < 400, ridge          # published ridge altitude 1947 m
    assert floor < ridge - 3000, (floor, ridge)     # Shackleton floor is ~4 km deep


@requires_dem_runtime
def test_runtime_dem_matches_raw_scale():
    dem = T.load_dem_npz(DEM_RUNTIME)
    assert dem.scale_m == 240.0 and dem.n == 2533
    assert abs(T.height_at(dem, -89.4667, -136.667) - 1947) < 500
    assert dem.offset == pytest.approx((3799.5 - 1.0) / 3.0)


@requires_dem_runtime
def test_crater_floor_horizon_is_high_and_ridge_low():
    dem = T.load_dem_npz(DEM_RUNTIME)
    floor = T.horizon_mask(dem, -89.67, 129.78)
    ridge = T.horizon_mask(dem, -89.4667, -136.667)
    assert np.median(floor) > 5.0      # walls of a 21 km-wide, 4 km-deep crater
    assert np.median(ridge) < 1.5
