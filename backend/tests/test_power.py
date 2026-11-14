import numpy as np
import pytest

from app.power import panel_power_w

AU = 149_597_870.7


def test_vertical_tracking_at_grazing_sun():
    p = panel_power_w(np.array([0.0]), np.array([10.0]), np.array([AU]), np.array([1.0]))
    assert p[0] == pytest.approx(1361 * 0.3)


def test_horizontal_and_fixed_modes():
    p = panel_power_w(np.array([30.0]), np.array([0.0]), np.array([AU]), np.array([1.0]), mode="horizontal")
    assert p[0] == pytest.approx(1361 * 0.5 * 0.3)
    back = panel_power_w(np.array([5.0]), np.array([270.0]), np.array([AU]), np.array([1.0]),
                         mode="fixed-vertical", panel_az=90.0)
    assert back[0] == 0.0


def test_partial_disk_and_bad_mode():
    p = panel_power_w(np.array([0.0]), np.array([0.0]), np.array([AU]), np.array([0.25]), area_m2=2.0)
    assert p[0] == pytest.approx(1361 * 0.3 * 0.25 * 2.0)
    with pytest.raises(ValueError):
        panel_power_w(np.array([0.0]), np.array([0.0]), np.array([AU]), np.array([1.0]), mode="nope")
