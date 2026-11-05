import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PrivacyPage from "../app/privacy/page";
import TermsPage from "../app/terms/page";
import { CONTACT_EMAIL, accountDeletionMailto } from "../apps/mobile/shared/src/legal";
import { LEGAL_EMAIL, LEGAL_UPDATED, LOCATION_PURPOSE } from "./legal";

const SUPPORT_EMAIL = "teamtydlii@gmail.com";
const OUTBOUND_FROM = ["hello", "tydlii.com"].join("@");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function escaped(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
  assert.equal(LEGAL_EMAIL, SUPPORT_EMAIL);
  assert.match(html, new RegExp(`mailto:${escaped(SUPPORT_EMAIL)}`));
  assert.doesNotMatch(html, new RegExp(escaped(OUTBOUND_FROM)));
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
  assert.equal(LEGAL_EMAIL, SUPPORT_EMAIL);
  assert.match(html, new RegExp(`mailto:${escaped(SUPPORT_EMAIL)}`));
  assert.doesNotMatch(html, new RegExp(escaped(OUTBOUND_FROM)));
  assert.match(copy, /laws of Ontario/);
  assert.match(copy, /cancellation fee that was not shown/);
  assert.doesNotMatch(copy, /\[TODO/);
});

test("apps and the site share one support inbox", () => {
  assert.equal(LEGAL_EMAIL, SUPPORT_EMAIL);
  assert.equal(CONTACT_EMAIL, LEGAL_EMAIL);
  for (const app of ["customer", "cleaner"]) {
    for (const screen of ["privacy.tsx", "terms.tsx", "delete-account.tsx", "settings.tsx"]) {
      const source = readFileSync(path.join(ROOT, "apps/mobile", app, "app", screen), "utf8");
      assert.match(source, /CONTACT_EMAIL/);
      assert.match(source, /mailto:\$\{CONTACT_EMAIL\}/);
      assert.doesNotMatch(source, new RegExp(escaped(OUTBOUND_FROM)));
    }
    const settings = readFileSync(path.join(ROOT, "apps/mobile", app, "app", "settings.tsx"), "utf8");
    assert.match(settings, /openLivePage\(PRIVACY_URL\)/);
    assert.match(settings, /openLivePage\(TERMS_URL\)/);
    assert.match(settings, /\/delete-account/);
    const home = readFileSync(path.join(ROOT, "apps/mobile", app, "app", "index.tsx"), "utf8");
    assert.match(home, /openLivePage\(PRIVACY_URL\)/);
    assert.match(home, /openLivePage\(TERMS_URL\)/);
    assert.ok((home.match(/<LegalRow/g) ?? []).length >= 2, `${app} home shows legal links in both modes`);
    const deletion = readFileSync(path.join(ROOT, "apps/mobile", app, "app", "delete-account.tsx"), "utf8");
    assert.match(deletion, /accountDeletionMailto\(role\)/);
    assert.match(deletion, /openLivePage\(DELETE_ACCOUNT_URL\)/);
  }

  const authScreens = readFileSync(path.join(ROOT, "apps/mobile/auth/src/react/screens.tsx"), "utf8");
  assert.match(authScreens, /openLivePage\(PRIVACY_URL\)/);
  assert.match(authScreens, /openLivePage\(TERMS_URL\)/);
  assert.match(authScreens, /accountDeletionMailto\(/);
  assert.match(authScreens, /CONTACT_EMAIL/);
  assert.doesNotMatch(authScreens, new RegExp(escaped(OUTBOUND_FROM)));
  const gate = readFileSync(path.join(ROOT, "apps/mobile/auth/src/react/gate.tsx"), "utf8");
  assert.match(gate, /"privacy"/);
  assert.match(gate, /"terms"/);

  for (const role of ["customer", "cleaner"] as const) {
    const href = accountDeletionMailto(role);
    assert.match(href, new RegExp(`^mailto:${escaped(SUPPORT_EMAIL)}\\?`));
    const text = decodeURIComponent(href);
    assert.match(text, /Delete my Tydlii account/);
    assert.match(text, new RegExp(`${role} app`));
    assert.match(text, /customer and as a cleaner/);
    assert.doesNotMatch(href, new RegExp(escaped(OUTBOUND_FROM)));
  }
});

test("the domain address appears only as the Resend From identity", () => {
  const hits: { file: string; line: string }[] = [];
  const skip = new Set(["node_modules", ".git", ".next", "dist", "coverage"]);
  const textName = /\.(tsx?|jsx?|mjs|cjs|md|json|ya?ml|html|css|txt|example)$/;

  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      if (skip.has(entry) || entry === "package-lock.json") continue;
      const full = path.join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
        continue;
      }
      if (!textName.test(entry) && entry !== ".env.example") continue;
      const text = readFileSync(full, "utf8");
      if (!text.includes(OUTBOUND_FROM)) continue;
      const relative = path.relative(ROOT, full);
      for (const line of text.split("\n")) {
        if (line.includes(OUTBOUND_FROM)) hits.push({ file: relative, line });
      }
    }
  }

  walk(ROOT);
  assert.ok(hits.length > 0);
  for (const hit of hits) {
    assert.match(hit.line, /EMAIL_FROM|body\.from/, `${hit.file}: ${hit.line}`);
    assert.doesNotMatch(hit.line, /mailto:hello@tydlii\.com/, hit.file);
  }
});
