# Data sources and direct image links

Everything this map uses is public and freely downloadable. No API keys.

## Web tiles (what the map streams)

Web Mercator PNG tiles, served by Global Forest Watch's public tile cache.

| Layer | URL template |
|-------|--------------|
| Tree cover 2000 (canopy ≥ 30%) | `https://tiles.globalforestwatch.org/umd_tree_cover_density_2000/v1.8/tcd_30/{z}/{x}/{y}.png` |
| Tree cover loss year (2001–2023) | `https://tiles.globalforestwatch.org/umd_tree_cover_loss/v1.11/default/{z}/{x}/{y}.png` |

Alternate density thresholds are available by swapping `tcd_30` for
`tcd_10`, `tcd_15`, `tcd_20`, `tcd_25`, `tcd_50`, or `tcd_75`.

Basemap: `https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png`
Terrain: `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`

## Raw Hansen GeoTIFFs (COGs) covering Kenya

The source 30 m data, hosted by Google on Cloud Storage. These are
Cloud-Optimized GeoTIFFs, so they can be opened directly in QGIS, or
streamed by any COG-aware tool via range requests.

Base URL:

```
https://storage.googleapis.com/earthenginepartners-hansen/GFC-2023-v1.11/
```

Kenya falls inside four 10×10° tiles: `00N_030E`, `00N_040E`, `10S_030E`, `10S_040E`.

For each tile, the files are named like:

```
Hansen_GFC-2023-v1.11_treecover2000_00N_030E.tif
Hansen_GFC-2023-v1.11_lossyear_00N_030E.tif
Hansen_GFC-2023-v1.11_gain_00N_030E.tif
```

Full download list (Kenya):

- treecover2000: `..._treecover2000_00N_030E.tif`, `..._00N_040E.tif`, `..._10S_030E.tif`, `..._10S_040E.tif`
- lossyear: `..._lossyear_00N_030E.tif`, `..._00N_040E.tif`, `..._10S_030E.tif`, `..._10S_040E.tif`
- gain: `..._gain_00N_030E.tif`, `..._00N_040E.tif`, `..._10S_030E.tif`, `..._10S_040E.tif`

Notes:

- `treecover2000` = percent canopy cover in 2000 (0–100).
- `lossyear` = 0 (no loss) or 1–23 (year of loss, 2001–2023).
- `gain` = 0/1 (gained forest 2000–2012).

## Attribution

Hansen, M. C., et al. "High-Resolution Global Maps of 21st-Century Forest
Cover Change." Science 342 (2013). Data by UMD / Google / USGS / NASA,
distributed by Global Forest Watch (WRI).
