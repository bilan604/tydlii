import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const sharedSrc = dirname(fileURLToPath(import.meta.url));
const mobileRoot = join(sharedSrc, "../..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".expo" || entry === "package-lock.json") continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

test("live visit map is MapLibre on OpenStreetMap with brand colours", () => {
  const html = readFileSync(join(sharedSrc, "live-map-html.ts"), "utf8");
  assert.match(html, /maplibre-gl@5\.6\.1/);
  assert.match(html, /tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/);
  assert.match(html, /#070707/);
  assert.match(html, /#04a3ac/);

  for (const app of ["customer", "cleaner"]) {
    for (const file of ["LiveVisitMap.tsx", "LiveVisitMap.web.tsx"]) {
      const source = readFileSync(join(mobileRoot, app, "components", file), "utf8");
      assert.match(source, /buildLiveMapHtml/);
      assert.doesNotMatch(source, /react-native-maps|MapStub|mapbox-gl/);
    }
    assert.equal(statExists(join(mobileRoot, app, "components", "LiveVisitMap.native.tsx")), false);
  }
  assert.equal(statExists(join(sharedSrc, "LiveVisitMap.tsx")), false);
  assert.equal(statExists(join(sharedSrc, "LiveVisitMap.native.tsx")), false);
});

test("store builds sketch preview and production and never submit or a live key", () => {
  const files = walk(mobileRoot);
  const easFiles = files.filter((path) => path.endsWith("eas.json"));
  assert.equal(easFiles.length, 2);
  for (const path of easFiles) {
    const json = JSON.parse(readFileSync(path, "utf8")) as {
      build?: { development?: unknown; preview?: unknown; production?: unknown };
      submit?: unknown;
    };
    assert.ok(json.build?.development);
    assert.ok(json.build?.preview);
    assert.ok(json.build?.production);
    assert.equal(json.submit, undefined);
    assert.doesNotMatch(readFileSync(path, "utf8"), /pk_live_[A-Za-z0-9]/);
  }

  for (const path of files) {
    if (!/\.(ts|tsx|js|json)$/.test(path) || path.endsWith(".test.ts")) continue;
    const text = readFileSync(path, "utf8");
    assert.doesNotMatch(text, /react-native-maps/);
    assert.doesNotMatch(text, /MapStub/);
    assert.doesNotMatch(text, /pk_live_[A-Za-z0-9]/);
    assert.doesNotMatch(text, /maps\.googleapis/);
  }
});

function statExists(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}
