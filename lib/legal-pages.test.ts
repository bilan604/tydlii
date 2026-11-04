import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PrivacyPage from "../app/privacy/page";
import TermsPage from "../app/terms/page";
import { LEGAL_EMAIL, LEGAL_UPDATED, LOCATION_PURPOSE } from "./legal";

function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

test("privacy page is the hosted policy the apps open", () => {
  const html = renderToStaticMarkup(createElement(PrivacyPage));
  const copy = text(html);
  assert.match(html, /src="\/brand\/wordmark-light\.png"/);
  assert.match(html, /href="\/terms"/);
  assert.match(html, /href="\/privacy#delete-account"/);
  assert.match(html, new RegExp(LEGAL_EMAIL.replace(".", "\\.")));
  assert.match(copy, new RegExp(LEGAL_UPDATED));
  assert.match(copy, new RegExp(LOCATION_PURPOSE.replace(/[().]/g, "\\$&")));
  assert.match(copy, /customer app does not collect location/i);
  assert.match(copy, /background/);
  assert.match(copy, /Stripe/);
  assert.match(copy, /do not sell personal information/i);
  assert.match(copy, /delete-account control/);
  assert.doesNotMatch(copy, /\[TODO/);
});

test("terms page is the hosted agreement the apps open", () => {
  const html = renderToStaticMarkup(createElement(TermsPage));
  const copy = text(html);
  assert.match(html, /src="\/brand\/wordmark-light\.png"/);
  assert.match(html, /href="\/privacy"/);
  assert.match(html, /href="\/privacy#location"/);
  assert.match(html, /href="\/privacy#delete-account"/);
  assert.match(copy, /not taking bookings yet/i);
  assert.match(copy, /13% Ontario HST/);
  assert.match(copy, /within 48 hours/);
  assert.match(copy, /sample visits/);
  assert.match(copy, /Stripe/);
  assert.match(copy, /67%/);
  assert.match(copy, /\$25 off their first clean/);
  assert.match(copy, /laws of Ontario/);
  assert.match(copy, /cancellation fee that was not shown/);
  assert.doesNotMatch(copy, /\[TODO/);
});
