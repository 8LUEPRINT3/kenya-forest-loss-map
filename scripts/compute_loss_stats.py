#!/usr/bin/env python3
"""Compute forest-loss hectares for named Kenya forests + national total.

Reads the Hansen lossyear COGs (v1.13) already cached in /tmp/gfc, and for
each region of interest (a bounding box in lng/lat) counts lossyear pixels
(1..25 = 2001..2025), converts to hectares (30 m pixel = 0.09 ha), and emits
JSON for the map's metrics panel + annual bar chart.

Run:  python3 scripts/compute_loss_stats.py
Requires: rasterio, numpy
"""
import json
import os
import numpy as np
import rasterio
from rasterio.windows import from_bounds

COG_DIR = "/tmp/gfc"
TILES = ["00N_030E", "00N_040E", "10N_030E", "10N_040E"]
HA_PER_PIXEL = 0.09

# Kenya extent used by the map (lng/lat): minx, miny, maxx, maxy
KENYA_BBOX = (33.9, -4.7, 41.9, 4.6)

# Named forests/highlands -> bounding box (minx, miny, maxx, maxy) in lng/lat.
REGIONS = {
    "Mau Forest": (35.0, -1.15, 36.3, -0.10),
    "Kakamega Forest": (34.65, 0.10, 35.05, 0.45),
    "Arabuko-Sokoke Forest": (39.60, -3.65, 40.15, -3.05),
    "Shimba Hills": (39.20, -4.40, 39.60, -4.05),
    "Loita Hills": (35.60, -2.05, 36.10, -1.60),
    "Marsabit Forest": (37.70, 2.10, 38.30, 2.65),
    "South Nandi Forest": (34.90, -0.05, 35.25, 0.25),
    "Taita Hills": (38.10, -3.60, 38.60, -3.10),
    "Aberdare Range": (36.30, -1.10, 37.10, -0.15),
    "Mount Kenya": (37.05, -0.60, 37.85, 0.35),
    "Cherangani Hills": (35.20, 0.80, 35.80, 1.45),
    "Mount Elgon": (34.45, 0.85, 34.85, 1.35),
    "Ngong Hills": (36.50, -1.55, 36.85, -1.25),
    "Matthews Range": (37.10, 1.00, 37.55, 1.45),
    "Chyulu Hills": (37.70, -2.85, 38.10, -2.30),
}

cogs = {}
for t in TILES:
    p = os.path.join(COG_DIR, f"Hansen_GFC-2025-v1.13_lossyear_{t}.tif")
    cogs[t] = rasterio.open(p)


def loss_counts_for_bbox(bbox):
    """Return dict {yearcode: pixel_count} summed across all source tiles."""
    minx, miny, maxx, maxy = bbox
    counts = {}
    for t, ds in cogs.items():
        w = from_bounds(minx, miny, maxx, maxy, ds.transform)
        left = max(0, int(np.floor(w.col_off)))
        top = max(0, int(np.floor(w.row_off)))
        right = min(ds.width, int(np.ceil(w.col_off + w.width)))
        bottom = min(ds.height, int(np.ceil(w.row_off + w.height)))
        if right <= left or bottom <= top:
            continue
        arr = ds.read(1, window=rasterio.windows.Window(left, top, right - left, bottom - top))
        arr = arr[np.isfinite(arr)]
        vals, cnts = np.unique(arr.astype("uint8"), return_counts=True)
        for v, c in zip(vals.tolist(), cnts.tolist()):
            if 1 <= v <= 25:
                counts[v] = counts.get(v, 0) + int(c)
    return counts


def counts_to_by_year(counts):
    return {str(2000 + code): round(n * HA_PER_PIXEL, 1) for code, n in sorted(counts.items())}


def split_ha(by_year):
    """Total hectares in two windows: 2001-2015 and 2016-2025."""
    early = sum(v for y, v in by_year.items() if 2001 <= int(y) <= 2015)
    late = sum(v for y, v in by_year.items() if 2016 <= int(y) <= 2025)
    return round(early, 1), round(late, 1)


result = {"regions": {}, "national_by_year": {}}
for name, bbox in REGIONS.items():
    by_year = counts_to_by_year(loss_counts_for_bbox(bbox))
    early, late = split_ha(by_year)
    result["regions"][name] = {
        "total_ha": round(sum(by_year.values()), 1),
        "ha_2001_2015": early,
        "ha_2016_2025": late,
        "by_year": by_year,
    }

result["national_by_year"] = counts_to_by_year(loss_counts_for_bbox(KENYA_BBOX))

out = os.path.join(os.path.dirname(__file__), "..", "loss-stats.json")
with open(out, "w") as f:
    json.dump(result, f, indent=2)

print(json.dumps(result, indent=2))
print(f"\nSaved {out} ({os.path.getsize(out)} bytes)")
for d in cogs.values():
    d.close()
