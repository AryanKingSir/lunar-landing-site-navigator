"""Filesystem paths and remote data sources."""
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
HORIZONS_DIR = DATA_DIR / "horizons"
SITES_JSON = DATA_DIR / "sites.json"
DEM_RAW = RAW_DIR / "ldem_80s_80m.img"
DEM_RUNTIME = DATA_DIR / "dem_240m.npz"
FRONTEND_TERRAIN_DIR = BACKEND_DIR.parent / "frontend" / "public" / "terrain"

_NAIF = "https://naif.jpl.nasa.gov/pub/naif/generic_kernels"
KERNELS: dict[str, tuple[str, int | None]] = {
    "de440s.bsp": (f"{_NAIF}/spk/planets/de440s.bsp", 32_726_016),
    "moon_080317.tf": (f"{_NAIF}/fk/satellites/moon_080317.tf", 21_437),
    "pck00011.tpc": (f"{_NAIF}/pck/pck00011.tpc", None),
    "moon_pa_de421_1900-2050.bpc": (f"{_NAIF}/pck/moon_pa_de421_1900-2050.bpc", 1_770_496),
}

DEM_DOWNLOAD: dict[str, tuple[str, int]] = {
    "ldem_80s_80m.img": (
        "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/"
        "data/lola_gdr/polar/img/ldem_80s_80m.img",
        115_520_000,
    ),
}
