export type Site = {
  id: string; name: string; lat: number; lon: number;
  category: 'south-pole' | 'contrast'; mission: string; description: string; source: string;
};
export type PanelMode = 'vertical-tracking' | 'horizontal' | 'fixed-vertical';
export type Win = [number, number];
export type Metrics = {
  illumination_pct: number; sun_time_pct: number; longest_dark_h: number; earth_vis_pct: number;
  dte_pct: number; mean_power_w: number; energy_wh: number; max_sun_el: number; min_sun_el: number;
};
export type ScenarioResult = {
  terrain_source: string; terrain_partial: boolean; site_height_m: number | null;
  horizon: { az: number[]; el: number[] };
  samples: {
    t: number[]; sun_az: number[]; sun_el: number[]; sun_frac: number[];
    earth_az: number[]; earth_el: number[]; earth_frac: number[]; earth_vis: boolean[];
    dsn_goldstone: boolean[]; dsn_madrid: boolean[]; dsn_canberra: boolean[]; dte: boolean[];
    power_w: number[]; sun_vec: number[][]; earth_vec: number[][];
  };
  windows: { sun: Win[]; earth: Win[]; dte: Win[] };
  metrics: Metrics;
};
export type ScenarioRequest = {
  lat: number; lon: number; start: string; end: string; step_min: number; obs_h: number;
  panel_mode: PanelMode; panel_az: number; area_m2: number; efficiency: number;
};
