import type { LatLng } from "./gps";

export type MapPoint = { left: number; top: number };

const EARTH_M = 6_371_000;

export function distanceMeters(a: LatLng, b: LatLng): number {
  const φ1 = (a.latitude * Math.PI) / 180;
  const φ2 = (b.latitude * Math.PI) / 180;
  const Δφ = ((b.latitude - a.latitude) * Math.PI) / 180;
  const Δλ = ((b.longitude - a.longitude) * Math.PI) / 180;
  const h = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Minutes at a slow city pace. Zero means the cleaner is at the door. */
export function etaMinutes(remainingMeters: number, speedMps = 2): number {
  if (remainingMeters <= 45) return 0;
  return Math.max(1, Math.round(remainingMeters / speedMps / 60));
}

export function densify(route: LatLng[], count: number): LatLng[] {
  if (route.length === 0 || count <= 0) return [];
  if (route.length === 1 || count === 1) return [route[0]];

  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < route.length; i += 1) {
    const length = distanceMeters(route[i - 1], route[i]);
    lengths.push(length);
    total += length;
  }
  if (total === 0) return Array.from({ length: count }, () => route[0]);

  const points: LatLng[] = [];
  for (let step = 0; step < count; step += 1) {
    const target = (total * step) / (count - 1);
    let walked = 0;
    let placed = false;
    for (let i = 0; i < lengths.length; i += 1) {
      const length = lengths[i];
      if (walked + length >= target || i === lengths.length - 1) {
        const t = length === 0 ? 0 : Math.min(1, Math.max(0, (target - walked) / length));
        const start = route[i];
        const end = route[i + 1];
        points.push({
          latitude: start.latitude + (end.latitude - start.latitude) * t,
          longitude: start.longitude + (end.longitude - start.longitude) * t,
        });
        placed = true;
        break;
      }
      walked += length;
    }
    if (!placed) points.push(route[route.length - 1]);
  }
  return points;
}

/** Percent positions inside the live-visit map. East is to the right, north is up. */
export function layoutVisit(input: { home: LatLng; cleaner: LatLng | null; route: LatLng[] }): {
  home: MapPoint;
  cleaner: MapPoint | null;
  dots: MapPoint[];
} {
  const points = [...input.route, input.home, ...(input.cleaner ? [input.cleaner] : [])];
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const point of points) {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  }
  const spanLat = Math.max(0.0008, maxLat - minLat);
  const spanLng = Math.max(0.0008, maxLng - minLng);
  const project = (point: LatLng): MapPoint => ({
    left: ((point.longitude - minLng) / spanLng) * 80 + 10,
    top: ((maxLat - point.latitude) / spanLat) * 72 + 12,
  });

  return {
    home: project(input.home),
    cleaner: input.cleaner ? project(input.cleaner) : null,
    dots: densify(input.route, 18).map(project),
  };
}
