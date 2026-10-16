#!/usr/bin/env python3
"""Build a single Web Mercator image of recent forest loss (2022-2025).

Reads Hansen lossyear COGs (v1.13) covering Kenya, reprojects to Web Mercator,
keeps only loss years 22-25 (2022-2025), and writes an indexed PNG showing the
cumulative 2022-2025 damage extent in a single colour.

Run:  python3 scripts/make_recent_loss.py
Requires: rasterio, numpy, Pillow
"""
import os
import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling, transform_bounds
from rasterio.crs import CRS
from rasterio.transform import from_origin
from PIL import Image

BASE = "https://storage.googleapis.com/earthenginepartners-hansen/GFC-2025-v1.13"
TILES = ["00N_030E", "00N_040E", "10N_030E", "10N_040E"]
COG_DIR = "/tmp/gfc"
OUT = os.path.join(os.path.dirname(__file__), "..", "recent-loss.png")

# Kenya extent (EPSG:4326): minx, miny, maxx, maxy
BOUNDS = (33.9, -4.7, 41.9, 4.6)
RES = 260.0  # metres/pixel (~zoom 9.5); sized to fit WebGL texture limit (<=8192)

src_crs = CRS.from_epsg(4326)
dst_crs = CRS.from_epsg(3857)
left, bottom, right, top = transform_bounds(src_crs, dst_crs, *BOUNDS)
width = int(round((right - left) / RES))
height = int(round((top - bottom) / RES))
transform = from_origin(left, top, RES, RES)
print(f"Web Mercator extent: left={left:.1f} bottom={bottom:.1f} right={right:.1f} top={top:.1f}")
print(f"Raster size: {width} x {height}")

# Reproject each source tile into a fresh array, then take the max (tiles are
# disjoint, so max == correct composite).
dst = np.zeros((height, width), dtype="uint8")
for t in TILES:
    path = os.path.join(COG_DIR, f"Hansen_GFC-2025-v1.13_lossyear_{t}.tif")
    tmp = np.zeros((height, width), dtype="uint8")
    with rasterio.open(path) as src:
        reproject(
            source=rasterio.band(src, 1),
            destination=tmp,
            src_transform=src.transform,
            src_crs=src.crs,
            dst_transform=transform,
            dst_crs=dst_crs,
            resampling=Resampling.nearest,
            dst_nodata=0,
        )
    np.maximum(dst, tmp, out=dst)
    print(f"  merged {t}: recent-loss pixels={int(((dst>=22)&(dst<=25)).sum())}")

# Keep only 2022-2025 (lossyear 22..25), map to a single damage colour (index 1).
idx = np.zeros((height, width), dtype="uint8")
idx[(dst >= 22) & (dst <= 25)] = 1

# Palette: 0=transparent, 1=damage orange (#ff6d00) for the 2022-2025 extent.
colors = [(0, 0, 0), (255, 109, 0)]
palette = []
for c in colors:
    palette.extend(list(c))
palette += [0] * (768 - len(palette))

img = Image.fromarray(idx, mode="P")
img.putpalette(palette)
img.save(OUT, transparency=0)
print(f"wrote {OUT} ({os.path.getsize(OUT)} bytes)")
minx, miny, maxx, maxy = BOUNDS
print("coordinates for app.js (NW, NE, SE, SW) in lng/lat:")
print(f"  [[{minx},{maxy}],[{maxx},{maxy}],[{maxx},{miny}],[{minx},{miny}]]")
