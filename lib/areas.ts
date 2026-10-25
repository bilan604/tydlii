export const AREAS = [
  { name: "CityPlace", wave: "launch" },
  { name: "King West", wave: "launch" },
  { name: "Liberty Village", wave: "launch" },
  { name: "Yonge–Eglinton", wave: "next" },
  { name: "North York Centre", wave: "next" },
  { name: "Other", wave: "other" },
] as const;

export type AreaName = (typeof AREAS)[number]["name"];

export const LAUNCH_AREAS = AREAS.filter((area) => area.wave === "launch").map(
  (area) => area.name,
);

const DASH = /[\u2010\u2011\u2012\u2013\u2014-]/g;

function areaKey(value: string): string {
  return value.trim().toLowerCase().replace(DASH, "-").replace(/\s+/g, " ");
}

/** Match a neighbourhood label, accepting hyphen or en dash. */
export function matchArea(value: string): AreaName | null {
  const key = areaKey(value);
  for (const area of AREAS) {
    if (areaKey(area.name) === key) return area.name;
  }
  return null;
}
