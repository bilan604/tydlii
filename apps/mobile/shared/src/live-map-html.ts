import type { LatLng } from "./gps";

/** Pinned MapLibre GL JS. Loaded inside the map document so Metro does not bundle its worker. */
export const MAPLIBRE_JS = "https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.js";
export const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.css";

/**
 * Standard OpenStreetMap raster tiles. Free, no API key.
 * Zoom 15–17 shows streets and building footprints.
 */
export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

const INK = "#070707";
const TEAL = "#04a3ac";
const MIST = "#e5f3f4";

export function liveMapCleanerMessage(point: LatLng): string {
  return JSON.stringify({
    type: "cleaner",
    longitude: point.longitude,
    latitude: point.latitude,
  });
}

/** MapLibre document shared by Expo web (iframe) and native (WebView). */
export function buildLiveMapHtml(input: { home: LatLng; route: LatLng[]; cleaner: LatLng | null }): string {
  const cleaner = input.cleaner ?? input.route[0] ?? input.home;
  const payload = JSON.stringify({
    home: [input.home.longitude, input.home.latitude],
    route: input.route.map((point) => [point.longitude, point.latitude]),
    cleaner: [cleaner.longitude, cleaner.latitude],
  }).replaceAll("<", "\\u003c");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<link rel="stylesheet" href="${MAPLIBRE_CSS}" />
<style>
  html, body, #map { margin: 0; height: 100%; background: ${MIST}; }
  body { overflow: hidden; }
  .pin {
    border: 3px solid #ffffff;
    border-radius: 50%;
    box-sizing: border-box;
  }
  .pin-home { width: 16px; height: 16px; background: ${INK}; }
  .pin-cleaner {
    width: 18px; height: 18px; background: ${TEAL};
    box-shadow: 0 0 0 8px rgba(4, 163, 172, 0.28);
  }
  .maplibregl-ctrl-attrib {
    font-size: 10px;
    background: rgba(229, 243, 244, 0.92);
  }
  .maplibregl-ctrl-attrib a { color: ${INK}; }
</style>
</head>
<body>
<div id="map"></div>
<script src="${MAPLIBRE_JS}"></script>
<script>
const data = ${payload};
const map = new maplibregl.Map({
  container: "map",
  style: {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 19,
        attribution: "© OpenStreetMap",
      },
    },
    layers: [{ id: "osm", type: "raster", source: "osm" }],
  },
  center: data.cleaner,
  zoom: 16,
  attributionControl: false,
  fadeDuration: 0,
});
map.addControl(new maplibregl.AttributionControl({
  compact: false,
  customAttribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
}), "bottom-right");
map.dragRotate.disable();
map.touchZoomRotate.disableRotation();

function pin(kind) {
  const el = document.createElement("div");
  el.className = "pin " + (kind === "home" ? "pin-home" : "pin-cleaner");
  return el;
}
const homeMarker = new maplibregl.Marker({ element: pin("home"), anchor: "center" })
  .setLngLat(data.home)
  .addTo(map);
const cleanerMarker = new maplibregl.Marker({ element: pin("cleaner"), anchor: "center" })
  .setLngLat(data.cleaner)
  .addTo(map);

let ready = false;
let pending = null;
let anim = 0;
function moveTo(lng, lat) {
  const from = cleanerMarker.getLngLat();
  const start = performance.now();
  const id = ++anim;
  map.easeTo({ center: [lng, lat], zoom: 16, duration: 640, essential: true });
  function frame(now) {
    if (id !== anim) return;
    const t = Math.min(1, (now - start) / 640);
    cleanerMarker.setLngLat([
      from.lng + (lng - from.lng) * t,
      from.lat + (lat - from.lat) * t,
    ]);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
function apply(lng, lat) {
  if (!ready) { pending = [lng, lat]; return; }
  moveTo(lng, lat);
}
function onMessage(event) {
  let payload = event.data;
  if (typeof payload === "string") {
    try { payload = JSON.parse(payload); } catch (error) { return; }
  }
  if (!payload || payload.type !== "cleaner") return;
  if (typeof payload.longitude !== "number" || typeof payload.latitude !== "number") return;
  apply(payload.longitude, payload.latitude);
}
window.addEventListener("message", onMessage);
document.addEventListener("message", onMessage);

map.on("load", function () {
  map.addSource("visit", {
    type: "geojson",
    data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: data.route } },
  });
  map.addLayer({
    id: "visit-casing",
    type: "line",
    source: "visit",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#ffffff", "line-width": 8, "line-opacity": 0.95 },
  });
  map.addLayer({
    id: "visit-route",
    type: "line",
    source: "visit",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "${TEAL}", "line-width": 5 },
  });
  map.jumpTo({ center: data.cleaner, zoom: 16 });
  map.resize();
  ready = true;
  if (pending) moveTo(pending[0], pending[1]);
});
</script>
</body>
</html>`;
}
