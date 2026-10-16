// Kenya Forest Loss — interactive before/after map
// Tree cover 2000 vs. annual forest loss (2001–2025).
// Data: Hansen Global Forest Change, served by Global Forest Watch public tiles.

import * as maplibregl from './vendor/maplibre-gl.mjs';

// Surface any runtime error on-screen, so a blank map is debuggable.
window.addEventListener('error', (e) => {
  const el = document.getElementById('errbox');
  if (el) {
    el.hidden = false;
    el.textContent = 'Error: ' + (e.message || (e.error && e.error.message) || 'unknown');
  }
});

const GFW = 'https://tiles.globalforestwatch.org';
const DENSITY_TILES = `${GFW}/umd_tree_cover_density_2000/v1.8/tcd_30/{z}/{x}/{y}.png`;
const LOSS_TILES = `${GFW}/umd_tree_cover_loss/v1.13/dynamic/{z}/{x}/{y}.png`;
const BASEMAP_TILES = 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
const DEM_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const LABELS_TILES = 'https://basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png';
const GLYPHS = 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf';

// Curated forest & highland names (not present in the CARTO label tiles).
const PLACES = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'Mau Forest', kind: 'forest' }, geometry: { type: 'Point', coordinates: [35.6, -0.6] } },
    { type: 'Feature', properties: { name: 'Kakamega Forest', kind: 'forest' }, geometry: { type: 'Point', coordinates: [34.85, 0.28] } },
    { type: 'Feature', properties: { name: 'Arabuko-Sokoke Forest', kind: 'forest' }, geometry: { type: 'Point', coordinates: [39.85, -3.35] } },
    { type: 'Feature', properties: { name: 'Shimba Hills', kind: 'forest' }, geometry: { type: 'Point', coordinates: [39.4, -4.25] } },
    { type: 'Feature', properties: { name: 'Loita Hills', kind: 'forest' }, geometry: { type: 'Point', coordinates: [35.85, -1.85] } },
    { type: 'Feature', properties: { name: 'Marsabit Forest', kind: 'forest' }, geometry: { type: 'Point', coordinates: [37.95, 2.32] } },
    { type: 'Feature', properties: { name: 'South Nandi Forest', kind: 'forest' }, geometry: { type: 'Point', coordinates: [35.05, 0.05] } },
    { type: 'Feature', properties: { name: 'Taita Hills', kind: 'forest' }, geometry: { type: 'Point', coordinates: [38.3, -3.4] } },
    { type: 'Feature', properties: { name: 'Aberdare Range', kind: 'mountain' }, geometry: { type: 'Point', coordinates: [36.7, -0.5] } },
    { type: 'Feature', properties: { name: 'Mount Kenya', kind: 'mountain' }, geometry: { type: 'Point', coordinates: [37.3, -0.15] } },
    { type: 'Feature', properties: { name: 'Cherangani Hills', kind: 'mountain' }, geometry: { type: 'Point', coordinates: [35.5, 1.1] } },
    { type: 'Feature', properties: { name: 'Mount Elgon', kind: 'mountain' }, geometry: { type: 'Point', coordinates: [34.55, 1.1] } },
    { type: 'Feature', properties: { name: 'Ngong Hills', kind: 'mountain' }, geometry: { type: 'Point', coordinates: [36.65, -1.42] } },
    { type: 'Feature', properties: { name: 'Matthews Range', kind: 'mountain' }, geometry: { type: 'Point', coordinates: [37.3, 1.2] } },
    { type: 'Feature', properties: { name: 'Chyulu Hills', kind: 'mountain' }, geometry: { type: 'Point', coordinates: [37.9, -2.6] } }
  ]
};

// Recent forest loss (2022–2025), precomputed from Hansen lossyear COGs.
const RECENT_LOSS_IMAGE = 'recent-loss.png';
const RECENT_LOSS_COORDS = [
  [3773730.74, 512620.65], [4664286.66, 512620.65],
  [4664286.66, -523789.37], [3773730.74, -523789.37]
];

const params = new URLSearchParams(window.location.search);
function parsePair(s, fallback) {
  if (!s) return fallback;
  const p = s.split(',').map(Number);
  return (p.length === 2 && p.every(Number.isFinite)) ? p : fallback;
}
const HOME = {
  center: parsePair(params.get('center'), [37.9, 0.2]),
  zoom: Number.isFinite(Number(params.get('zoom'))) ? Number(params.get('zoom')) : 5.5
};

const baseStyle = {
  version: 8,
  glyphs: GLYPHS,
  sources: {
    basemap: { type: 'raster', tiles: [BASEMAP_TILES], tileSize: 256, maxzoom: 20 }
  },
  layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }]
};

function createMap(container) {
  return new maplibregl.Map({
    container,
    style: baseStyle,
    center: HOME.center,
    zoom: HOME.zoom,
    minZoom: 3,
    maxZoom: 16,
    attributionControl: false
  });
}

const beforeMap = createMap('before');
const afterMap = createMap('after');

function addDensity(map, opacity) {
  map.addSource('density', {
    type: 'raster', tiles: [DENSITY_TILES], tileSize: 256, minzoom: 0, maxzoom: 12
  });
  map.addLayer({
    id: 'density', type: 'raster', source: 'density',
    paint: { 'raster-opacity': opacity, 'raster-resampling': 'linear' }
  });
}

function addLoss(map, opacity) {
  map.addSource('loss', {
    type: 'raster', tiles: [LOSS_TILES], tileSize: 256, minzoom: 0, maxzoom: 12
  });
  map.addLayer({
    id: 'loss', type: 'raster', source: 'loss',
    paint: { 'raster-opacity': opacity, 'raster-resampling': 'linear' }
  });
}

function addLabels(map) {
  // Place/area names (towns, counties, roads, water) drawn on top of the data.
  map.addSource('labels', {
    type: 'raster', tiles: [LABELS_TILES], tileSize: 256, maxzoom: 20
  });
  map.addLayer({
    id: 'labels', type: 'raster', source: 'labels',
    paint: { 'raster-opacity': 1, 'raster-resampling': 'linear' }
  });

  // Forest & highland names the label tiles omit.
  map.addSource('places', { type: 'geojson', data: PLACES });
  map.addLayer({
    id: 'places-forest', type: 'symbol', source: 'places',
    filter: ['==', ['get', 'kind'], 'forest'],
    minzoom: 4,
    layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Bold'], 'text-size': 12 },
    paint: { 'text-color': '#1b5e20', 'text-halo-color': '#ffffff', 'text-halo-width': 1.4 }
  });
  map.addLayer({
    id: 'places-mountain', type: 'symbol', source: 'places',
    filter: ['==', ['get', 'kind'], 'mountain'],
    minzoom: 4,
    layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Bold'], 'text-size': 11 },
    paint: { 'text-color': '#37474f', 'text-halo-color': '#ffffff', 'text-halo-width': 1.3 }
  });
}

function addRecentLoss(map) {
  map.addSource('recent', {
    type: 'image', url: RECENT_LOSS_IMAGE, coordinates: RECENT_LOSS_COORDS
  });
  map.addLayer({
    id: 'recent', type: 'raster', source: 'recent',
    layout: { visibility: 'none' },
    paint: { 'raster-opacity': 0.9, 'raster-resampling': 'linear' }
  });
}

beforeMap.on('load', () => {
  addDensity(beforeMap, 1.0);
  addLabels(beforeMap);
});
afterMap.on('load', () => {
  addDensity(afterMap, 0.45);
  addLoss(afterMap, 0.9);
  addRecentLoss(afterMap);
  addLabels(afterMap);
});

// Keep the two maps in lockstep.
let syncing = false;
function syncMaps(src, dst) {
  if (syncing) return;
  syncing = true;
  dst.jumpTo({
    center: src.getCenter(),
    zoom: src.getZoom(),
    bearing: src.getBearing(),
    pitch: src.getPitch()
  });
  syncing = false;
}
beforeMap.on('move', () => syncMaps(beforeMap, afterMap));
afterMap.on('move', () => syncMaps(afterMap, beforeMap));

// Divider swipe.
const compareEl = document.getElementById('compare');
const dividerEl = document.getElementById('divider');
const afterEl = document.getElementById('after');
let dragging = false;

function setDivider(clientX) {
  const rect = compareEl.getBoundingClientRect();
  let pct = ((clientX - rect.left) / rect.width) * 100;
  pct = Math.max(3, Math.min(97, pct));
  dividerEl.style.left = pct + '%';
  afterEl.style.clipPath = `inset(0 0 0 ${pct}%)`;
}

dividerEl.addEventListener('pointerdown', (e) => {
  dragging = true;
  dividerEl.setPointerCapture(e.pointerId);
  setDivider(e.clientX);
});
window.addEventListener('pointermove', (e) => { if (dragging) setDivider(e.clientX); });
window.addEventListener('pointerup', () => { dragging = false; });

// 3D terrain.
const btn3d = document.getElementById('btn-3d');
let is3d = false;

function ensureTerrain(map) {
  if (!map.getSource('dem')) {
    map.addSource('dem', {
      type: 'raster-dem', tiles: [DEM_TILES], encoding: 'terrarium',
      tileSize: 256, maxzoom: 15
    });
    map.setTerrain({ source: 'dem', exaggeration: 1.4 });
  }
}

btn3d.addEventListener('click', () => {
  is3d = !is3d;
  const pitch = is3d ? 55 : 0;
  [beforeMap, afterMap].forEach((m) => { if (is3d) ensureTerrain(m); });
  beforeMap.easeTo({ pitch });
  btn3d.textContent = is3d ? '2D view' : '3D view';
  btn3d.classList.toggle('active', is3d);
});

// Reset view.
document.getElementById('btn-reset').addEventListener('click', () => {
  beforeMap.easeTo({ center: HOME.center, zoom: HOME.zoom, bearing: 0, pitch: is3d ? 55 : 0 });
});

// Recent-loss (2022–2025) toggle.
const btnRecent = document.getElementById('btn-recent');
let showingRecent = false;
btnRecent.addEventListener('click', () => {
  showingRecent = !showingRecent;
  afterMap.setLayoutProperty('loss', 'visibility', showingRecent ? 'none' : 'visible');
  afterMap.setLayoutProperty('recent', 'visibility', showingRecent ? 'visible' : 'none');
  btnRecent.textContent = showingRecent ? 'All loss (2001–2025)' : 'Recent loss (2022–2025)';
  btnRecent.classList.toggle('active', showingRecent);
  document.getElementById('tag-right').textContent = showingRecent ? 'Loss · 2022–2025' : 'Loss · 2001–2025';
  document.getElementById('legend-all').hidden = showingRecent;
  document.getElementById('legend-recent').hidden = !showingRecent;
});

// Keep both maps sized to the container.
window.addEventListener('resize', () => {
  beforeMap.resize();
  afterMap.resize();
});
