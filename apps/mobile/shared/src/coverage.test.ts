import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { LAUNCH_AREAS } from "../../../../lib/areas.ts";
import { brand } from "./brand";
import {
  CITIES,
  PROVINCES,
  bookableCities,
  defaultBookableCity,
  isBookableCity,
  laterNeighbourhoods,
  launchNeighbourhoods,
  provinceCoverage,
} from "./coverage";

const PROVINCE_CODES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"];

describe("Canada coverage", () => {
  it("soft-launches Toronto and lists every province and territory", () => {
    assert.equal(PROVINCES.length, 13);
    assert.deepEqual(
      PROVINCES.map((province) => province.code),
      PROVINCE_CODES,
    );
    assert.deepEqual(
      bookableCities().map((city) => city.name),
      ["Toronto"],
    );
    assert.equal(defaultBookableCity().id, "toronto");
    assert.equal(defaultBookableCity().province, "ON");
    assert.equal(isBookableCity("toronto"), true);
    assert.equal(isBookableCity("vancouver"), false);
    assert.equal(isBookableCity("ottawa"), false);
    assert.equal(PROVINCES.find((province) => province.code === "ON")?.status, "soft-launch");
    assert.equal(PROVINCES.filter((province) => province.status === "soft-launch").length, 1);
    assert.equal(provinceCoverage().length, 13);
    assert.equal(CITIES.filter((city) => city.province === "BC").length >= 2, true);
    for (const code of PROVINCE_CODES) {
      assert.ok(CITIES.some((city) => city.province === code), `${code} has a city`);
    }
  });

  it("keeps Toronto launch neighbourhoods aligned with the website", () => {
    assert.deepEqual(
      launchNeighbourhoods().map((item) => item.name),
      [...LAUNCH_AREAS],
    );
    assert.deepEqual(
      laterNeighbourhoods().map((item) => item.name),
      ["Yonge–Eglinton", "North York Centre"],
    );
    const draft = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../customer/lib/draft.ts"),
      "utf8",
    );
    for (const name of launchNeighbourhoods()) {
      assert.match(draft, new RegExp(`"${name.name}"`));
    }
  });

  it("brand tokens match tydlii.com", () => {
    assert.equal(brand.ink, "#070707");
    assert.equal(brand.teal, "#04a3ac");
    assert.equal(brand.sage, "#5c9396");
    assert.equal(brand.mist, "#e5f3f4");
  });
});
