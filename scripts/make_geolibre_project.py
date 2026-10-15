#!/usr/bin/env python3
"""Generate kenya-forest-loss.geolibre.json from a GeoLibre template.

Uses the Nepal flash-floods shared project as a structural template and swaps
in Kenya forest-loss data: Hansen/UMD tree cover + loss, served as public
Web Mercator tiles by Global Forest Watch.

Run:  python3 scripts/make_geolibre_project.py
"""
import json
import copy

TEMPLATE = "/tmp/nepal.geolibre.json"
OUT = "/home/asauce/projects/kenya-forest-loss-map/kenya-forest-loss.geolibre.json"

DENSITY_TILES = "https://tiles.globalforestwatch.org/umd_tree_cover_density_2000/v1.8/tcd_30/{z}/{x}/{y}.png"
LOSS_TILES = "https://tiles.globalforestwatch.org/umd_tree_cover_loss/v1.13/dynamic/{z}/{x}/{y}.png"
ATTR = "Hansen/UMD/Google/USGS/NASA via Global Forest Watch"

with open(TEMPLATE) as f:
    d = json.load(f)

# Structural template: any existing raster tile layer.
template = None
for L in d["layers"]:
    if L.get("type") == "raster":
        template = L
        break
assert template is not None, "no raster layer found in template"


def raster_layer(lid, name, tiles, opacity=1.0):
    L = copy.deepcopy(template)
    L["id"] = lid
    L["name"] = name
    L["source"] = {
        "type": "raster",
        "tiles": [tiles],
        "tileSize": 256,
        "maxzoom": 12,
        "attribution": ATTR,
        "sourceId": lid,
    }
    L["visible"] = True
    L["opacity"] = opacity
    return L


d["name"] = "Kenya-Forest-Loss"
d["mapView"] = {
    "center": [37.9, 0.2],
    "zoom": 6.0,
    "bearing": 0,
    "pitch": 0,
    "bbox": [33.9, -4.7, 41.9, 4.6],
}
d["layers"] = [
    raster_layer("tree-cover-2000", "Tree cover 2000 (canopy \u2265 30%)", DENSITY_TILES, 1.0),
    raster_layer("tree-cover-loss", "Tree cover loss 2001-2025", LOSS_TILES, 0.9),
]
d["selectedLayerId"] = "tree-cover-loss"
d["layerGroups"] = [
    {"id": "group-forest-2000", "name": "Forest cover 2000", "collapsed": False, "visible": True, "opacity": 1},
    {"id": "group-loss", "name": "Forest loss 2001-2025", "collapsed": False, "visible": True, "opacity": 1},
]
d["legend"] = {"title": "Legend", "groupByLayer": True, "order": [], "overrides": {}}

md = d.get("metadata")
if isinstance(md, dict):
    for k in ("name", "title"):
        if k in md:
            md[k] = "Kenya-Forest-Loss"

with open(OUT, "w") as f:
    json.dump(d, f, indent=2)

print("wrote", OUT)
print("layers:", [L["name"] for L in d["layers"]])
print("basemap:", d.get("basemapStyleUrl"))
