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

beforeMap.on('load', () => addDensity(beforeMap, 1.0));
afterMap.on('load', () => {
  addDensity(afterMap, 0.45);
  addLoss(afterMap, 0.9);
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

// Keep both maps sized to the container.
window.addEventListener('resize', () => {
  beforeMap.resize();
  afterMap.resize();
});
