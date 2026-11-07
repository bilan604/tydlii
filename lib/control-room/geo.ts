import { CITIES, NEIGHBOURHOODS, type CoverageStatus } from "../../apps/mobile/shared/src/coverage";

/**
 * Public city and neighbourhood centres for the coverage map.
 * These are not customer addresses and not live cleaner GPS.
 */

export type MapPoint = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: CoverageStatus | "launch" | "next";
  group: "city" | "neighbourhood";
  detail: string;
};

const CITY_POINTS: Record<string, { latitude: number; longitude: number }> = {
  toronto: { latitude: 43.6532, longitude: -79.3832 },
  mississauga: { latitude: 43.589, longitude: -79.6441 },
  ottawa: { latitude: 45.4215, longitude: -75.6972 },
  hamilton: { latitude: 43.2557, longitude: -79.8711 },
  vancouver: { latitude: 49.2827, longitude: -123.1207 },
  victoria: { latitude: 48.4284, longitude: -123.3656 },
  montreal: { latitude: 45.5017, longitude: -73.5673 },
  "quebec-city": { latitude: 46.8139, longitude: -71.208 },
  calgary: { latitude: 51.0447, longitude: -114.0719 },
  edmonton: { latitude: 53.5461, longitude: -113.4938 },
  winnipeg: { latitude: 49.8954, longitude: -97.1385 },
  halifax: { latitude: 44.6488, longitude: -63.5752 },
  saskatoon: { latitude: 52.1332, longitude: -106.67 },
  regina: { latitude: 50.4452, longitude: -104.6189 },
  "st-johns": { latitude: 47.5615, longitude: -52.7126 },
  fredericton: { latitude: 45.9636, longitude: -66.6431 },
  charlottetown: { latitude: 46.2382, longitude: -63.1311 },
  whitehorse: { latitude: 60.7212, longitude: -135.0568 },
  yellowknife: { latitude: 62.454, longitude: -114.3718 },
  iqaluit: { latitude: 63.7467, longitude: -68.517 },
};

const NEIGHBOURHOOD_POINTS: Record<string, { latitude: number; longitude: number }> = {
  CityPlace: { latitude: 43.6394, longitude: -79.3956 },
  "King West": { latitude: 43.6436, longitude: -79.4005 },
  "Liberty Village": { latitude: 43.638, longitude: -79.4195 },
  "Yonge–Eglinton": { latitude: 43.7064, longitude: -79.3986 },
  "North York Centre": { latitude: 43.7686, longitude: -79.4126 },
};

export const CANADA_BOUNDS = {
  west: -141,
  south: 41.6,
  east: -52.6,
  north: 70,
};

export function coverageCities(): MapPoint[] {
  return CITIES.map((city) => {
    const point = CITY_POINTS[city.id];
    if (!point) throw new Error(`Missing public centre for ${city.id}`);
    return {
      id: city.id,
      name: city.name,
      latitude: point.latitude,
      longitude: point.longitude,
      status: city.status,
      group: "city",
      detail: city.status === "soft-launch" ? "Soft launch" : "Planned",
    };
  });
}

export function coverageNeighbourhoods(): MapPoint[] {
  return NEIGHBOURHOODS.map((area) => {
    const point = NEIGHBOURHOOD_POINTS[area.name];
    if (!point) throw new Error(`Missing public centre for ${area.name}`);
    return {
      id: area.name,
      name: area.name,
      latitude: point.latitude,
      longitude: point.longitude,
      status: area.wave === "launch" ? "launch" : "next",
      group: "neighbourhood",
      detail: area.wave === "launch" ? "Launch neighbourhood" : "Later in Toronto",
    };
  });
}

export const LIVE_GPS_REASON =
  "No live cleaner locations. The apps simulate a sample trace, background location is blocked, and the customer app does not ask for GPS. This map shows public coverage centres only.";
