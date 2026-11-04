import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { MAPLIBRE_JS, OSM_TILE_URL } from "./live-map-html";
import { STRIPE_PUBLISHABLE_KEY_ENV, STRIPE_TEST_KEY_PLACEHOLDER } from "./payments";

const mobileRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readJson(relativePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(mobileRoot, relativePath), "utf8")) as Record<string, unknown>;
}

describe("store sketches", () => {
  it("keeps MapLibre and OpenStreetMap and does not add a paid map SDK", () => {
    assert.match(OSM_TILE_URL, /^https:\/\/tile\.openstreetmap\.org\//);
    assert.match(MAPLIBRE_JS, /maplibre-gl/);
    assert.doesNotMatch(`${OSM_TILE_URL} ${MAPLIBRE_JS}`, /google|mapbox/i);
    for (const app of ["customer", "cleaner"]) {
      const pkg = readJson(`${app}/package.json`);
      const deps = {
        ...(pkg.dependencies as object),
        ...(pkg.devDependencies as object),
      };
      for (const name of Object.keys(deps)) {
        assert.doesNotMatch(name, /react-native-maps|mapbox|@stripe\/stripe-react-native/);
      }
      const appJson = JSON.stringify(readJson(`${app}/app.json`));
      assert.doesNotMatch(appJson, /googleMaps|mapbox|pk_live_/i);
    }
  });

  it("sketches preview and production builds and has no submit profile", () => {
    for (const app of ["customer", "cleaner"]) {
      const eas = readJson(`${app}/eas.json`);
      assert.deepEqual(Object.keys(eas).sort(), ["build", "cli"]);
      assert.equal("submit" in eas, false);
      const build = eas.build as Record<string, { distribution?: string; env?: Record<string, string> }>;
      assert.deepEqual(Object.keys(build).sort(), ["preview", "production"]);
      assert.equal(build.preview?.distribution, "internal");
      assert.equal(build.production?.distribution, "store");
      const blob = JSON.stringify(eas);
      assert.doesNotMatch(blob, /pk_live_/);
      assert.doesNotMatch(blob, /"submit"/);
    }

    const customer = readJson("customer/eas.json");
    const build = customer.build as Record<string, { env: Record<string, string> }>;
    for (const profile of ["preview", "production"]) {
      assert.equal(build[profile]?.env[STRIPE_PUBLISHABLE_KEY_ENV], STRIPE_TEST_KEY_PLACEHOLDER);
    }

    const cleaner = JSON.stringify(readJson("cleaner/eas.json"));
    assert.doesNotMatch(cleaner, /STRIPE|pk_test_|pk_live_/);
  });
});
