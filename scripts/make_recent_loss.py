#!/usr/bin/env python3
"""Build a single Web Mercator image of recent forest loss (2022-2025).

Reads Hansen lossyear COGs (v1.13) covering Kenya, reprojects to Web Mercator
at 76 m/px, keeps only loss years 22-25 (2022-2025), and writes an indexed
PNG with a 4-colour ramp (2022..2025) plus transparency.

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
RES = 76.0  # metres/pixel (~zoom 11)

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

# Keep only 2022-2025 (lossyear 22..25), map to palette indices 1..4.
idx = np.zeros((height, width), dtype="uint8")
idx[dst == 22] = 1
idx[dst == 23] = 2
idx[dst == 24] = 3
idx[dst == 25] = 4

# Palette: 0=transparent, 1=2022 yellow, 2=2023 orange, 3=2024 red, 4=2025 dark red.
colors = [(0, 0, 0), (255, 213, 79), (255, 152, 0), (244, 67, 54), (183, 28, 28)]
palette = []
for c in colors:
    palette.extend(list(c))
palette += [0] * (768 - len(palette))

img = Image.fromarray(idx, mode="P")
img.putpalette(palette)
img.save(OUT, transparency=0)
print(f"wrote {OUT} ({os.path.getsize(OUT)} bytes)")
print(f"coordinates for app.js (NW, NE, SE, SW):")
print(f"  [[{left:.2f},{top:.2f}],[{right:.2f},{top:.2f}],[{right:.2f},{bottom:.2f}],[{left:.2f},{bottom:.2f}]]")
