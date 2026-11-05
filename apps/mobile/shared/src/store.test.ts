import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { MAPLIBRE_JS, OSM_TILE_URL } from "./live-map-html";
import { applyTydliiNativeConfig } from "../../native-config.js";
import { STRIPE_PUBLISHABLE_KEY_ENV, STRIPE_TEST_KEY_PLACEHOLDER } from "./payments";

const mobileRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

const EAS_PROJECT_IDS = {
  customer: "ed30d1f1-b1a8-479f-8309-a8ebd04a4cbe",
  cleaner: "26014761-9e69-40e9-bc62-f71e1aa8e5fe",
} as const;

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

  it("defines development, preview, and production builds and has no submit profile", () => {
    for (const app of ["customer", "cleaner"]) {
      const eas = readJson(`${app}/eas.json`);
      assert.deepEqual(Object.keys(eas).sort(), ["build", "cli"]);
      assert.equal("submit" in eas, false);
      const cli = eas.cli as {
        version: string;
        appVersionSource: string;
        promptToConfigurePushNotifications: boolean;
      };
      assert.equal(cli.version, ">= 16.0.0");
      assert.equal(cli.appVersionSource, "remote");
      assert.equal(cli.promptToConfigurePushNotifications, false);

      const build = eas.build as Record<
        string,
        {
          distribution?: string;
          autoIncrement?: boolean;
          node?: string;
          developmentClient?: boolean;
          ios?: { simulator?: boolean };
          android?: { buildType?: string };
          env?: Record<string, string>;
        }
      >;
      assert.deepEqual(Object.keys(build).sort(), ["development", "preview", "production"]);
      assert.equal(build.development?.distribution, "internal");
      assert.equal(build.development?.ios?.simulator, true);
      assert.equal(build.development?.android?.buildType, "apk");
      assert.equal(build.development?.developmentClient, undefined);
      assert.equal(build.preview?.distribution, "internal");
      assert.equal(build.preview?.ios, undefined);
      assert.equal(build.preview?.android?.buildType, "apk");
      assert.equal(build.production?.distribution, "store");
      assert.equal(build.production?.autoIncrement, true);
      assert.equal(build.production?.android?.buildType, "app-bundle");
      for (const profile of ["development", "preview", "production"]) {
        assert.equal(build[profile]?.node, "22.23.4");
      }
      const blob = JSON.stringify(eas);
      assert.doesNotMatch(blob, /pk_live_/);
      assert.doesNotMatch(blob, /"submit"/);
      assert.doesNotMatch(blob, /developmentClient|appleTeamId|ascAppId|keystore/i);

      const appJson = readJson(`${app}/app.json`) as {
        expo: {
          slug?: string;
          owner?: string;
          extra?: { eas?: { projectId?: string } };
          ios: {
            bundleIdentifier: string;
            buildNumber: string;
            config?: { usesNonExemptEncryption?: boolean };
          };
          android: { package: string; versionCode: number };
        };
      };
      assert.equal(appJson.expo.owner, "tydlii");
      assert.equal(appJson.expo.slug, `tydlii-${app}`);
      assert.equal(appJson.expo.extra?.eas?.projectId, EAS_PROJECT_IDS[app]);
      assert.equal(appJson.expo.ios.bundleIdentifier, `com.tydlii.${app}`);
      assert.equal(appJson.expo.android.package, `com.tydlii.${app}`);
      assert.equal(appJson.expo.ios.buildNumber, "1");
      assert.equal(appJson.expo.android.versionCode, 1);
      assert.equal(appJson.expo.ios.config?.usesNonExemptEncryption, false);
    }

    const customer = readJson("customer/eas.json");
    const build = customer.build as Record<string, { env: Record<string, string> }>;
    for (const profile of ["development", "preview", "production"]) {
      assert.equal(build[profile]?.env[STRIPE_PUBLISHABLE_KEY_ENV], STRIPE_TEST_KEY_PLACEHOLDER);
    }

    const cleaner = JSON.stringify(readJson("cleaner/eas.json"));
    assert.doesNotMatch(cleaner, /STRIPE|pk_test_|pk_live_/);
  });
});

describe("expo project link", () => {
  const base = {
    scheme: "tydlii-customer",
    owner: "tydlii",
    ios: { bundleIdentifier: "com.tydlii.customer" },
    plugins: ["expo-router"],
  };

  it("leaves the project id unset and enables Sign in with Apple", () => {
    const next = applyTydliiNativeConfig(base, {});
    assert.equal(next.extra, undefined);
    assert.equal(next.ios?.usesAppleSignIn, true);
    assert.equal(next.scheme, "tydlii-customer");
    assert.equal(next.plugins?.filter((plugin) => plugin === "expo-apple-authentication").length, 1);
  });

  it("copies a real project UUID and the reversed Google scheme", () => {
    const id = "11111111-2222-4333-8444-555555555555";
    const next = applyTydliiNativeConfig(base, {
      EXPO_PUBLIC_EAS_PROJECT_ID: ` ${id} `,
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: "123456789012-abcdef.apps.googleusercontent.com",
    });
    assert.equal(next.extra?.eas?.projectId, id);
    assert.deepEqual(next.scheme, ["tydlii-customer", "com.googleusercontent.apps.123456789012-abcdef"]);
  });

  it("drops a placeholder project id and ignores a placeholder client id", () => {
    const next = applyTydliiNativeConfig(
      { ...base, extra: { eas: { projectId: "eas-init-later" } } },
      { EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: "your-client-id", EXPO_PUBLIC_EAS_PROJECT_ID: "not-a-uuid" },
    );
    assert.equal(next.extra?.eas?.projectId, undefined);
    assert.equal(next.scheme, "tydlii-customer");
  });

  it("keeps a project id eas init already wrote", () => {
    const id = "11111111-2222-4333-8444-555555555555";
    const next = applyTydliiNativeConfig({ ...base, extra: { eas: { projectId: id } } }, {});
    assert.equal(next.extra?.eas?.projectId, id);
    const again = applyTydliiNativeConfig(
      { ...base, plugins: ["expo-apple-authentication"] },
      {},
    );
    assert.equal(again.plugins?.filter((plugin) => plugin === "expo-apple-authentication").length, 1);
  });

  it("prefers EXPO_PUBLIC_EAS_PROJECT_ID and keeps the committed UUID otherwise", () => {
    const override = "11111111-2222-4333-8444-555555555555";
    for (const app of ["customer", "cleaner"] as const) {
      const appJson = readJson(`${app}/app.json`) as { expo: Record<string, unknown> };
      const kept = applyTydliiNativeConfig(appJson.expo, {});
      assert.equal(kept.extra?.eas?.projectId, EAS_PROJECT_IDS[app]);
      const invalidEnv = applyTydliiNativeConfig(appJson.expo, {
        EXPO_PUBLIC_EAS_PROJECT_ID: "not-a-uuid",
      });
      assert.equal(invalidEnv.extra?.eas?.projectId, EAS_PROJECT_IDS[app]);
      const replaced = applyTydliiNativeConfig(appJson.expo, {
        EXPO_PUBLIC_EAS_PROJECT_ID: ` ${override} `,
      });
      assert.equal(replaced.extra?.eas?.projectId, override);
    }
  });

  it("points both apps at the shared config and does not invent a project id", () => {
    for (const app of ["customer", "cleaner"]) {
      const source = readFileSync(join(mobileRoot, `${app}/app.config.ts`), "utf8");
      assert.match(source, /applyTydliiNativeConfig/);
      assert.doesNotMatch(source, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      const appJson = readJson(`${app}/app.json`) as { expo: { plugins: unknown[]; ios: { usesAppleSignIn?: boolean } } };
      assert.equal(appJson.expo.ios.usesAppleSignIn, true);
      assert.equal(appJson.expo.plugins.includes("expo-apple-authentication"), true);
    }
  });
});
