export const METHODS: { heading: string; text: string }[] = [
  { heading: 'Where the Sun and Earth are', text: 'Positions come from NASA JPL’s DE440 planetary ephemeris, computed with the Skyfield library, using the Moon’s precise orientation (which includes libration). We checked them against JPL Horizons: they agree to within 0.004°.' },
  { heading: 'The terrain horizon', text: 'Heights come from NASA’s LOLA south-pole elevation model at 80 m per pixel. For each site we trace 720 lines of sight (every half degree) out to 150 km along the curved surface, for an observer 2 m above the ground. Custom spots use a 240 m version. Sites north of 80°S have no terrain data, so they use a smooth sphere.' },
  { heading: 'When something counts as visible', text: 'Any part of the Sun’s disk above the terrain counts as sunlight. Earth counts as in view when at least half of its disk clears the terrain. The Moon has no air, so light does not bend near the horizon.' },
  { heading: 'Radio link to Earth', text: 'A link needs Earth in view from the site and at least one Deep Space Network site (Goldstone, Madrid or Canberra) seeing the Moon at least 10° above its own horizon.' },
  { heading: 'Power', text: 'A 1 m² panel at 30% efficiency, lit by 1,361 W/m² of sunlight scaled for the distance to the Sun, the angle of the panel and the share of the Sun’s disk that is visible. You can choose the panel’s orientation in All numbers.' },
  { heading: 'Limits', text: 'Features smaller than the elevation grid, like boulders, are not included. Heat, dust and relay satellites are not modelled. For sites north of about 85°S the farthest terrain is only partly covered by the data.' },
];

export const SOURCES: { label: string; url: string }[] = [
  { label: 'JPL Horizons', url: 'https://ssd.jpl.nasa.gov/horizons/' },
  { label: 'NAIF SPICE kernels', url: 'https://naif.jpl.nasa.gov/naif/data.html' },
  { label: 'LOLA elevation data (PDS Geosciences)', url: 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm' },
  { label: 'LROC Quickmap', url: 'https://quickmap.lroc.asu.edu/' },
  { label: 'NASA Moon Trek', url: 'https://trek.nasa.gov/moon/' },
];
