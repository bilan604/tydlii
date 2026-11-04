export type ProvinceCode =
  | "AB"
  | "BC"
  | "MB"
  | "NB"
  | "NL"
  | "NS"
  | "NT"
  | "NU"
  | "ON"
  | "PE"
  | "QC"
  | "SK"
  | "YT";

export type CoverageStatus = "soft-launch" | "planned";

export type Province = {
  code: ProvinceCode;
  name: string;
  status: CoverageStatus;
};

export type City = {
  id: string;
  name: string;
  province: ProvinceCode;
  status: CoverageStatus;
};

export type Neighbourhood = {
  cityId: string;
  name: string;
  wave: "launch" | "next" | "later";
};

/** Toronto is the only bookable city. Ontario carries the soft-launch status because of it. */
export const SOFT_LAUNCH_CITY_ID = "toronto";

/** Every province and territory, so a later Canada-wide open does not need a new model. */
export const PROVINCES: readonly Province[] = [
  { code: "AB", name: "Alberta", status: "planned" },
  { code: "BC", name: "British Columbia", status: "planned" },
  { code: "MB", name: "Manitoba", status: "planned" },
  { code: "NB", name: "New Brunswick", status: "planned" },
  { code: "NL", name: "Newfoundland and Labrador", status: "planned" },
  { code: "NS", name: "Nova Scotia", status: "planned" },
  { code: "NT", name: "Northwest Territories", status: "planned" },
  { code: "NU", name: "Nunavut", status: "planned" },
  { code: "ON", name: "Ontario", status: "soft-launch" },
  { code: "PE", name: "Prince Edward Island", status: "planned" },
  { code: "QC", name: "Quebec", status: "planned" },
  { code: "SK", name: "Saskatchewan", status: "planned" },
  { code: "YT", name: "Yukon", status: "planned" },
];

export const CITIES: readonly City[] = [
  { id: "toronto", name: "Toronto", province: "ON", status: "soft-launch" },
  { id: "mississauga", name: "Mississauga", province: "ON", status: "planned" },
  { id: "ottawa", name: "Ottawa", province: "ON", status: "planned" },
  { id: "hamilton", name: "Hamilton", province: "ON", status: "planned" },
  { id: "vancouver", name: "Vancouver", province: "BC", status: "planned" },
  { id: "victoria", name: "Victoria", province: "BC", status: "planned" },
  { id: "montreal", name: "Montreal", province: "QC", status: "planned" },
  { id: "quebec-city", name: "Quebec City", province: "QC", status: "planned" },
  { id: "calgary", name: "Calgary", province: "AB", status: "planned" },
  { id: "edmonton", name: "Edmonton", province: "AB", status: "planned" },
  { id: "winnipeg", name: "Winnipeg", province: "MB", status: "planned" },
  { id: "halifax", name: "Halifax", province: "NS", status: "planned" },
  { id: "saskatoon", name: "Saskatoon", province: "SK", status: "planned" },
  { id: "regina", name: "Regina", province: "SK", status: "planned" },
  { id: "st-johns", name: "St. John's", province: "NL", status: "planned" },
  { id: "fredericton", name: "Fredericton", province: "NB", status: "planned" },
  { id: "charlottetown", name: "Charlottetown", province: "PE", status: "planned" },
  { id: "whitehorse", name: "Whitehorse", province: "YT", status: "planned" },
  { id: "yellowknife", name: "Yellowknife", province: "NT", status: "planned" },
  { id: "iqaluit", name: "Iqaluit", province: "NU", status: "planned" },
];

/** Toronto launch neighbourhoods match the website waitlist. Other waves are not bookable yet. */
export const NEIGHBOURHOODS: readonly Neighbourhood[] = [
  { cityId: "toronto", name: "CityPlace", wave: "launch" },
  { cityId: "toronto", name: "King West", wave: "launch" },
  { cityId: "toronto", name: "Liberty Village", wave: "launch" },
  { cityId: "toronto", name: "Yonge–Eglinton", wave: "next" },
  { cityId: "toronto", name: "North York Centre", wave: "next" },
];

export function coverageStatusLabel(status: CoverageStatus): string {
  return status === "soft-launch" ? "Soft launch" : "Planned";
}

export function cityStatusLabel(status: CoverageStatus): string {
  return status === "soft-launch" ? "Open" : "Coming soon";
}

export function bookableCities(): City[] {
  return CITIES.filter((city) => city.status === "soft-launch");
}

export function defaultBookableCity(): City {
  const city = CITIES.find((item) => item.id === SOFT_LAUNCH_CITY_ID && item.status === "soft-launch");
  if (!city) throw new Error("Toronto soft launch is missing from the coverage model");
  return city;
}

export function citiesInProvince(code: ProvinceCode): City[] {
  return CITIES.filter((city) => city.province === code);
}

export function provinceCoverage(): { province: Province; cities: City[] }[] {
  return [...PROVINCES]
    .sort((a, b) => a.name.localeCompare(b.name, "en-CA"))
    .map((province) => ({ province, cities: citiesInProvince(province.code) }));
}

export function launchNeighbourhoods(cityId = SOFT_LAUNCH_CITY_ID): Neighbourhood[] {
  return NEIGHBOURHOODS.filter((item) => item.cityId === cityId && item.wave === "launch");
}

export function laterNeighbourhoods(cityId = SOFT_LAUNCH_CITY_ID): Neighbourhood[] {
  return NEIGHBOURHOODS.filter((item) => item.cityId === cityId && item.wave !== "launch");
}

export function isBookableCity(cityId: string): boolean {
  return CITIES.some((city) => city.id === cityId && city.status === "soft-launch");
}
