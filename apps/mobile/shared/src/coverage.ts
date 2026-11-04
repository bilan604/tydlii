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

/** Every province and territory. Only Ontario has a soft-launch city today. */
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

export function bookableCities(): City[] {
  return CITIES.filter((city) => city.status === "soft-launch");
}

export function citiesInProvince(code: ProvinceCode): City[] {
  return CITIES.filter((city) => city.province === code);
}

export function launchNeighbourhoods(cityId = "toronto"): Neighbourhood[] {
  return NEIGHBOURHOODS.filter((item) => item.cityId === cityId && item.wave === "launch");
}

export function isBookableCity(cityId: string): boolean {
  return CITIES.some((city) => city.id === cityId && city.status === "soft-launch");
}
