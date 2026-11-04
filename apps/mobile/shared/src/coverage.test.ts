import assert from "node:assert/strict";
import { test } from "node:test";
import { brand } from "./brand";
import {
  CITIES,
  PROVINCES,
  bookableCities,
  isBookableCity,
  launchNeighbourhoods,
} from "./coverage";

test("Canada model soft-launches Toronto and lists every province", () => {
  assert.equal(PROVINCES.length, 13);
  assert.deepEqual(
    bookableCities().map((city) => city.name),
    ["Toronto"],
  );
  assert.equal(isBookableCity("toronto"), true);
  assert.equal(isBookableCity("vancouver"), false);
  assert.equal(PROVINCES.find((province) => province.code === "ON")?.status, "soft-launch");
  assert.ok(PROVINCES.filter((province) => province.status === "soft-launch").length === 1);
  assert.deepEqual(
    launchNeighbourhoods().map((item) => item.name),
    ["CityPlace", "King West", "Liberty Village"],
  );
  assert.equal(CITIES.filter((city) => city.province === "BC").length >= 2, true);
});

test("brand tokens match tydlii.com", () => {
  assert.equal(brand.ink, "#070707");
  assert.equal(brand.teal, "#04a3ac");
  assert.equal(brand.sage, "#5c9396");
  assert.equal(brand.mist, "#e5f3f4");
});
