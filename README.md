# Kenya Forest Loss Map

Interactive before/after map of forest loss in Kenya, 2001–2023. Drag the
slider to reveal where tree cover has been cleared since 2000, and switch to
3D to see how the loss follows the topography.

Live demo: https://8lueprint3.github.io/kenya-forest-loss-map/

## What it shows

- Left side (before): tree cover in 2000 (forest = canopy ≥ 30%).
- Right side (after): the same forest cover, overlaid with annual tree-cover
  loss (2001–2023).
- 3D terrain toggle to relate loss to elevation (Mau Forest, Aberdare Range,
  Mount Kenya, coastal forests).

Data: Hansen Global Forest Change (UMD / Google / USGS / NASA), served as
public Web Mercator tiles by Global Forest Watch.

## Run locally

Any static file server works, no build step and no API keys:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

The MapLibre GL JS runtime is vendored in `vendor/` (ESM + worker + CSS), so
the app is fully self-contained and works offline apart from the map tiles.

## How it works

- Two MapLibre GL JS maps stay in sync; a CSS `clip-path` divider reveals the
  second map along a draggable line (the "before/after" swipe).
- Raster layers stream from Global Forest Watch's public tile cache.
- Terrain uses AWS Terrain Tiles (terrarium encoding) as a `raster-dem` source.

## Repo layout

```
index.html             App shell
app.js                 Map + swipe + 3D logic
style.css              Layout
vendor/                Vendored MapLibre GL JS (ESM + worker + CSS)
data/DATA-SOURCES.md   Direct image/tile/COG download links
scripts/               Zonal-statistics scripts (per-county loss)
```

## Per-county statistics

The map is visual. For numbers (hectares lost per county):

- `scripts/zonal_stats_gee.js` — Google Earth Engine, no downloads, exports a
  CSV and an interactive bar chart.
- `scripts/zonal_stats_local.py` — QGIS / Python on downloaded Hansen tiles.

## Data access

All imagery is public and freely downloadable. See `data/DATA-SOURCES.md` for
direct tile URLs and the raw Hansen GeoTIFF (COG) links covering Kenya.

## Attribution & license

- Forest data: Hansen / UMD / Google / USGS / NASA, via Global Forest Watch.
- Basemap: © OpenStreetMap contributors © CARTO.
- Terrain: AWS Terrain Tiles (Mapzen / Joerd).
- Code: MIT.
