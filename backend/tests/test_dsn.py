from datetime import datetime, timezone

import numpy as np

from tests.markers import requires_kernels


@requires_kernels
def test_dsn_coverage_is_plausible_over_a_month():
    from app.dsn import dsn_visible

    start = int(datetime(2026, 12, 1, tzinfo=timezone.utc).timestamp() * 1000)
    t = start + np.arange(30 * 48) * 1_800_000  # 30 days, 30-minute steps
    vis = dsn_visible(t)
    assert set(vis) == {"goldstone", "madrid", "canberra"}
    for name, v in vis.items():
        assert 0.2 < v.mean() < 0.7, (name, v.mean())
    union = np.logical_or.reduce(list(vis.values()))
    assert union.mean() > 0.8
