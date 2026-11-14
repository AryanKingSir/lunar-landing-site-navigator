import numpy as np
import pytest

from app import visibility as V


def test_disk_fraction_limits_and_midpoint():
    f = V.disk_fraction(np.array([0.0, 1.0, -1.0, 0.125]), 0.25, 0.0)
    assert f[0] == pytest.approx(0.5)
    assert f[1] == pytest.approx(1.0)
    assert f[2] == pytest.approx(0.0)
    assert f[3] == pytest.approx(0.80450, abs=1e-4)  # centre half a radius above the line


def test_angular_radius_of_sun_at_1au():
    assert V.angular_radius_deg(V.SUN_RADIUS_KM, 149_597_870.7) == pytest.approx(0.2665, abs=1e-3)


def test_interp_mask_is_periodic():
    mask = np.array([0.0, 1.0, 2.0, 3.0])  # 90-degree bins
    out = V.interp_mask(mask, np.array([45.0, 315.0, -45.0, 360.0]))
    assert out.tolist() == pytest.approx([0.5, 1.5, 1.5, 0.0])


def test_to_windows_and_longest_run():
    t = np.array([0, 10, 20, 30, 40])
    assert V.to_windows(t, np.array([1, 1, 0, 1, 1], bool), 10) == [[0, 20], [30, 50]]
    assert V.to_windows(t, np.zeros(5, bool), 10) == []
    assert V.longest_run(np.array([0, 1, 1, 1, 0, 1], bool)) == 3
    assert V.longest_run(np.zeros(4, bool)) == 0
