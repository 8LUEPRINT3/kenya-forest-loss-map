"""
Kenya forest loss per county, from downloaded Hansen tiles.

Requires:  pip install rasterio geopandas rasterstats
Run in QGIS's Python console or any Python 3.9+ environment.

The map itself is visual; this script produces the numbers (hectares lost
per county) from the raw GeoTIFFs listed in data/DATA-SOURCES.md.
"""

import geopandas as gpd
import pandas as pd
from rasterstats import zonal_stats

# Adjust these paths and the name column to your files.
COUNTIES = "kenya_counties.geojson"   # 47 counties, EPSG:4326
LOSS_TIF = "hansen_lossyear.tif"      # Hansen lossyear, EPSG:4326
NAME_COL = "county"                    # field holding the county name

counties = gpd.read_file(COUNTIES)

# categorical=True counts pixels for each unique loss-year value.
stats = zonal_stats(counties, LOSS_TIF, categorical=True, nodata=0)

# Each 30 m pixel = 0.09 ha.
HA_PER_PIXEL = 0.09

names = counties[NAME_COL].tolist()
rows = []
for name, s in zip(names, stats):
    # s is a dict like {"1": 123, "2": 45, ...} plus "min"/"max"/"mean".
    loss_ha = 0.0
    for key, val in s.items():
        if key.isdigit() and key != "0":   # loss-year pixel counts only
            loss_ha += int(val)
    loss_ha *= HA_PER_PIXEL
    rows.append({"county": name, "loss_ha": round(loss_ha, 1)})

df = pd.DataFrame(rows).sort_values("loss_ha", ascending=False)
print(df.to_string(index=False))
df.to_csv("kenya_forest_loss_by_county.csv", index=False)
print("\nSaved kenya_forest_loss_by_county.csv")
