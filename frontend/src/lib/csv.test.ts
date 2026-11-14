import { describe, expect, it } from 'vitest';
import { scenarioCsv } from './csv';

describe('csv', () => {
  it('writes a header and one row per sample', () => {
    const csv = scenarioCsv({ samples: { t: [0, 600000], sun_az: [1, 2], sun_el: [3, 4], sun_frac: [1, 0.5],
      earth_az: [5, 6], earth_el: [7, 8], earth_frac: [1, 1], earth_vis: [true, false], dsn_goldstone: [true, true],
      dsn_madrid: [false, false], dsn_canberra: [false, true], dte: [true, false], power_w: [400, 200],
      sun_vec: [], earth_vec: [] } } as never);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe('time_utc,sun_azimuth_deg,sun_elevation_deg,sun_disk_visible_fraction,earth_azimuth_deg,earth_elevation_deg,earth_in_view,dsn_goldstone,dsn_madrid,dsn_canberra,radio_link_to_earth,array_power_w');
    expect(lines[1]).toBe('1970-01-01T00:00:00Z,1,3,1,5,7,1,1,0,0,1,400');
    expect(lines).toHaveLength(3);
  });
});
