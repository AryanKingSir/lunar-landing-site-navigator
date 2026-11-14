import type { ScenarioResult } from '../types';

const HEADER = 'time_utc,sun_azimuth_deg,sun_elevation_deg,sun_disk_visible_fraction,earth_azimuth_deg,earth_elevation_deg,earth_in_view,dsn_goldstone,dsn_madrid,dsn_canberra,radio_link_to_earth,array_power_w';

export function scenarioCsv(result: ScenarioResult): string {
  const s = result.samples;
  const b = (v: boolean) => (v ? 1 : 0);
  const rows = s.t.map((t, i) => [
    new Date(t).toISOString().replace('.000Z', 'Z'),
    s.sun_az[i], s.sun_el[i], s.sun_frac[i], s.earth_az[i], s.earth_el[i],
    b(s.earth_vis[i]), b(s.dsn_goldstone[i]), b(s.dsn_madrid[i]), b(s.dsn_canberra[i]), b(s.dte[i]),
    s.power_w[i],
  ].join(','));
  return [HEADER, ...rows].join('\n') + '\n';
}

export function downloadText(filename: string, text: string, mime = 'text/csv'): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
