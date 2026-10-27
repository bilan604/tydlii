import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Footer } from "../components/Footer";

const FOOTER_LINE = "Tydlii clean guaranteed. · Toronto, Ontario · Est. 2026";

test("the site footer states the Tydlii guarantee, city, and founding year", () => {
  const html = renderToStaticMarkup(createElement(Footer));
  assert.match(html, /Tydlii clean guaranteed\./);
  assert.match(html, /Toronto, Ontario/);
  assert.match(html, /Est\. 2026/);
  assert.ok(html.includes(FOOTER_LINE));
  assert.doesNotMatch(html, /Prices before HST/);
  assert.doesNotMatch(html, /Every clean, guaranteed/);
  assert.doesNotMatch(html, /guranteed/);
});

test("the shared footer source does not keep the old HST line", async () => {
  const source = await readFile(new URL("../components/Footer.tsx", import.meta.url), "utf8");
  assert.match(source, /Tydlii clean guaranteed\. · Toronto, Ontario · Est\. 2026/);
  assert.doesNotMatch(source, /Prices before HST/);
  assert.doesNotMatch(source, /Every clean, guaranteed/);
});
