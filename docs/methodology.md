# Methodology

## 1. Where the Sun and Earth are

- **Source and method.** Topocentric positions for an observer on the lunar surface come from NASA JPL's DE440 ephemeris (`de440s.bsp`) through Skyfield.
- **Frame.** They use the Moon's mean-Earth frame (`MOON_ME_DE421`, from `moon_080317.tf` and `moon_pa_de421_1900-2050.bpc`). This frame includes physical libration.
- **Observer height.** The observer sits at the terrain height plus 2 m.
- **Validation.** We compared 12 values against the JPL Horizons API (`CENTER='coord@301'`): Sun and Earth, for Connecting Ridge and Apollo 11, at three dates. The largest difference was **0.0038°** in elevation and **0.0038°** in azimuth. A spot check through the running API gave Sun elevation 1.0200° against 1.0199° from Horizons.

## 2. The terrain horizon

**Elevation data.** We use the LOLA polar stereographic elevation model `LDEM_80S_80M`. Height in metres is DN × 0.5, relative to a sphere of radius 1737.4 km, at 80 m per pixel.

**Projection.** From PDS `DSMAP_POLAR.CAT`:
- r = 2R·tan((90° + lat)/2)
- x = r·sin(lon), y = r·cos(lon)
- column = x/scale + 3799.5, row = −y/scale + 3799.5

**Lines of sight.** For each of 720 azimuths (every 0.5°), we sample heights every grid cell along the true great circle, using the spherical destination-point formula, out to 150 km. The elevation angle of each sample, seen from an observer at height h₀ + 2 m, is:

```
angle = atan2((R + h)·cos(d/R) − (R + h₀ + 2 m), (R + h)·sin(d/R))
```

The horizon in each direction is the largest angle along that line.

**Coverage and resolution:**
- Curated south-pole sites use the 80 m data. Custom spots use a 240 m version computed on demand.
- Directions whose whole line of sight leaves the data use the smooth-sphere dip.
- Sites north of 80°S have no terrain data and use a smooth sphere.

**Orientation checks:**
- The model height at Connecting Ridge is 1944 m, against 1947 m published.
- The Shackleton floor sits 4.7 km lower.

## 3. Visibility

- **Sun:** the visible share of its disk is the area of the circular segment above the horizon at the Sun's azimuth. Any share above zero counts as sunlight.
- **Earth:** in view when at least half of its disk clears the terrain.
- **No refraction:** the Moon has no atmosphere, so light does not bend near the horizon.

## 4. Radio link to Earth

A direct-to-Earth link needs Earth in view from the site, and at least one Deep Space Network complex seeing the Moon at 10° or more above its local horizon:

| Complex | Latitude | Longitude |
|---|---|---|
| Goldstone | 35.43° N | 116.89° W |
| Madrid | 40.43° N | 4.25° W |
| Canberra | 35.40° S | 148.98° E |

Over a month each complex sees the Moon about 41% of the time, and together they see it about 98% of the time.

## 5. Power

P = 1361 W/m² × (1 AU / r)² × visible share × max(cos i, 0) × 1 m² × 30 %

Panel options:
- upright and turning to face the Sun: cos i = cos el;
- flat on the deck: cos i = sin el;
- upright, fixed facing north: cos i = cos el · cos(Δaz).

## 6. Sanity checks (tests)

**Shackleton crater floor:** 0% sunlight over December 2026.

**Connecting Ridge sunlight by season:**

| Month | Sunlight |
|---|---|
| Dec 2026 | 100% |
| Mar 2027 | 45% |
| Jun 2027 | 38% |
| Sep 2027 | 95% |

**Chang'e-4 (far side):** Earth in view 0%, radio link 0%.

**Apollo 11:** sunlight about 50% over a month; Earth always in view.

## 7. Limits

- **Small features:** anything smaller than the elevation grid, like boulders and small craters under 80 m, is not included.
- **Not modelled:** heat, dust, relay satellites, and the antennas' own schedules.
- **Partial far-field:** for sites north of about 84.95°S the farthest terrain is only partly covered by the data. The app labels these "partial far-field".
- **3D view:** an overview at about 720 m per pixel, for context only. The numbers come from the 80 m data.
