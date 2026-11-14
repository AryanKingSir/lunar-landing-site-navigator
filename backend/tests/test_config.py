from app import config


def test_kernel_names_and_paths():
    assert set(config.KERNELS) == {
        "de440s.bsp",
        "moon_080317.tf",
        "pck00011.tpc",
        "moon_pa_de421_1900-2050.bpc",
    }
    assert config.RAW_DIR == config.DATA_DIR / "raw"
    assert config.DEM_RAW.name == "ldem_80s_80m.img"
    assert config.FRONTEND_TERRAIN_DIR.parts[-3:] == ("frontend", "public", "terrain")
