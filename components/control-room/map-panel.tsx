"use client";

import { useEffect, useRef, useState } from "react";
import { CANADA_BOUNDS, type MapPoint } from "@/lib/control-room/geo";

const MAP_JS = "https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.js";
const MAP_CSS = "https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.css";

type MapLibreMap = {
  remove: () => void;
  resize: () => void;
  fitBounds: (bounds: [[number, number], [number, number]], options: { padding: number; animate: boolean }) => void;
  on: (event: string, handler: () => void) => void;
};

type MapMarker = {
  setLngLat: (point: [number, number]) => MapMarker;
  addTo: (map: MapLibreMap) => MapMarker;
  remove: () => void;
};

type MapLibreApi = {
  Map: new (options: unknown) => MapLibreMap;
  Marker: new (options: { element: HTMLElement }) => MapMarker;
};

declare global {
  interface Window {
    maplibregl?: MapLibreApi;
  }
}

function loadCss(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function loadScript(src: string) {
  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing) {
    return window.maplibregl ? Promise.resolve() : new Promise<void>((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("map script")), { once: true });
    });
  }
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("map script"));
    document.body.appendChild(script);
  });
}

export function MapPanel({ cities, neighbourhoods, liveGps }: { cities: MapPoint[]; neighbourhoods: MapPoint[]; liveGps: string }) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef<MapMarker[]>([]);
  const [scope, setScope] = useState<"canada" | "toronto">("toronto");
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const points = scope === "canada" ? cities : neighbourhoods;

  useEffect(() => {
    let cancelled = false;
    const node = holder.current;
    if (!node) return;
    async function boot() {
      try {
        loadCss(MAP_CSS);
        await loadScript(MAP_JS);
        if (cancelled || !node || !window.maplibregl || mapRef.current) return;
        mapRef.current = new window.maplibregl.Map({
          container: node,
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
          center: [-79.39, 43.65],
          zoom: 11,
          bounds: [
            [-79.46, 43.6],
            [-79.35, 43.79],
          ],
          attributionControl: true,
        });
        mapRef.current.on("load", () => {
          mapRef.current?.resize();
          if (!cancelled) setReady(true);
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    }
    void boot();
    const observer = new ResizeObserver(() => mapRef.current?.resize());
    observer.observe(node);
    return () => {
      cancelled = true;
      observer.disconnect();
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const api = window.maplibregl;
    if (!map || !api || !ready || failed) return;
    map.resize();
    try {
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];
    for (const point of points) {
      const element = document.createElement("div");
      element.className = "cr-pin";
      element.title = `${point.name}. ${point.detail}. Not a live cleaner.`;
      element.style.width = "14px";
      element.style.height = "14px";
      element.style.borderRadius = "50%";
      element.style.background = point.detail === "Soft launch" || point.detail === "Launch neighbourhood" ? "#04a3ac" : "#5c9396";
      element.style.border = "2px solid #e5f3f4";
      markers.current.push(new api.Marker({ element }).setLngLat([point.longitude, point.latitude]).addTo(map));
    }
    if (scope === "canada") {
      map.fitBounds(
        [
          [CANADA_BOUNDS.west, CANADA_BOUNDS.south],
          [CANADA_BOUNDS.east, CANADA_BOUNDS.north],
        ],
        { padding: 24, animate: false },
      );
    } else {
      const lngs = neighbourhoods.map((point) => point.longitude);
      const lats = neighbourhoods.map((point) => point.latitude);
      map.fitBounds(
        [
          [Math.min(...lngs) - 0.04, Math.min(...lats) - 0.03],
          [Math.max(...lngs) + 0.04, Math.max(...lats) + 0.03],
        ],
        { padding: 28, animate: false },
      );
    }
    } catch {
      // The coverage list stays available if the map is not ready yet.
    }
  }, [cities, failed, neighbourhoods, points, ready, scope]);

  return (
    <div>
      <div className="cr-scope" role="group" aria-label="Map extent">
        <button className="cr-btn" type="button" aria-pressed={scope === "toronto"} onClick={() => setScope("toronto")}>
          Toronto
        </button>
        <button className="cr-btn" type="button" aria-pressed={scope === "canada"} onClick={() => setScope("canada")}>
          Canada
        </button>
      </div>
      {failed ? (
        <p className="cr-reason" role="status">Map tiles did not load. The coverage list below is still the source of truth.</p>
      ) : (
        <div ref={holder} className="cr-map" role="img" aria-label="OpenStreetMap of Tydlii coverage. Pins are public centres, not live cleaners." />
      )}
      <p className="cr-reason" style={{ marginTop: 8 }}>{liveGps} Map data © OpenStreetMap.</p>
      <ul className="cr-list">
        {points.map((point) => (
          <li key={point.id}>
            <strong>{point.name}</strong> <span className="cr-muted">· {point.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
