// Kenya forest loss per county (2001-2025)
// Paste into https://code.earthengine.google.com (free account).
// Hansen Global Forest Change v1.13 = loss years through 2025.

var hansen = ee.Image('UMD/hansen/global_forest_change_2025_v1_13');

// Forest = canopy >= 30% in 2000 (GFW standard; use 10 or 50 if you prefer).
var forest2000 = hansen.select('treecover2000').gte(30);

// Loss pixels, any year 2001-2025.
var loss = hansen.select('lossyear').gt(0).selfMask();

// Loss area in hectares (each pixel = 30 m x 30 m = 0.09 ha).
var lossHa = loss.multiply(ee.Image.pixelArea()).divide(10000);

// Kenya's 47 counties (admin level 1).
var counties = ee.FeatureCollection('FAO/GAUL/2015/level1')
  .filter(ee.Filter.eq('ADM0_NAME', 'Kenya'));

var perCounty = lossHa.reduceRegions({
  collection: counties,
  reducer: ee.Reducer.sum(),
  scale: 30
});

var result = perCounty.map(function (f) {
  return f.set({
    county: f.get('ADM1_NAME'),
    loss_ha: ee.Number(f.get('sum')).round()
  });
});

print(result);

// Interactive bar chart.
var chart = ui.Chart.feature.byFeature({
  features: result,
  xProperty: 'county',
  yProperties: ['loss_ha']
})
.setChartType('ColumnChart')
.setOptions({
  title: 'Forest loss by county, Kenya 2001-2025',
  hAxis: { title: 'County', slantedText: true },
  vAxis: { title: 'Hectares lost' }
});
print(chart);

// Export CSV: open the Tasks tab and hit Run.
Export.table.toDrive({
  collection: result,
  description: 'kenya_forest_loss_by_county',
  selectors: ['county', 'loss_ha'],
  fileFormat: 'CSV'
});
