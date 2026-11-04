import type { LatLng } from "./gps";

/** 88 Niagara Street, Liberty Village. Sample visit shared by both apps. */
export const LIBERTY_HOME: LatLng = { latitude: 43.64172, longitude: -79.40735 };

/** West-to-east approach so the preview pin travels toward the home. */
export const LIBERTY_ROUTE: LatLng[] = [
  { latitude: 43.63895, longitude: -79.4194 },
  { latitude: 43.63955, longitude: -79.4161 },
  { latitude: 43.64015, longitude: -79.413 },
  { latitude: 43.6407, longitude: -79.4104 },
  { latitude: 43.6412, longitude: -79.4087 },
  LIBERTY_HOME,
];

export const LIBERTY_JOB_ID = "sample-liberty";

/**
 * Unused. The live visit map is MapLibre with free OpenStreetMap tiles and does not call Google.
 */
export const MAPS_API_KEY_ENV = "EXPO_PUBLIC_MAPS_API_KEY";
