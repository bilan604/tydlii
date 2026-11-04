import type { BandId, Condition, Frequency } from "@/lib/pricing";

export const AREAS = ["CityPlace", "King West", "Liberty Village"] as const;
export type Area = (typeof AREAS)[number];

export const WINDOWS = [
  { id: "morning", label: "8:00–11:00" },
  { id: "midday", label: "11:00–2:00" },
  { id: "afternoon", label: "2:00–5:00" },
] as const;

export type WindowId = (typeof WINDOWS)[number]["id"];

export type Draft = {
  address: string;
  unit: string;
  area: Area;
  band: BandId;
  bedrooms: number;
  fullBaths: number;
  halfBaths: number;
  frequency: Frequency;
  condition: Condition;
  dayId: string;
  windowId: WindowId;
};

export const DEFAULT_DRAFT: Draft = {
  address: "",
  unit: "",
  area: "Liberty Village",
  band: "C",
  bedrooms: 2,
  fullBaths: 1,
  halfBaths: 0,
  frequency: "biweekly",
  condition: "standard",
  dayId: "",
  windowId: "morning",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type VisitDay = { id: string; label: string };

export function upcomingDays(count = 6): VisitDay[] {
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() + 1);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return {
      id: `${date.getFullYear()}-${month}-${day}`,
      label: `${WEEKDAYS[date.getDay()]} ${MONTHS[date.getMonth()]} ${date.getDate()}`,
    };
  });
}

export function windowLabel(id: WindowId): string {
  return WINDOWS.find((item) => item.id === id)?.label ?? "";
}

export const SAMPLE_ADDRESSES: { address: string; area: Area }[] = [
  { address: "88 Niagara Street", area: "Liberty Village" },
  { address: "25 Capreol Court", area: "CityPlace" },
  { address: "550 King Street West", area: "King West" },
];
