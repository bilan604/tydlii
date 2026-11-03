import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { CLEANER_ONBOARDING_FORM_URL } from "./cleaner-onboarding";
import {
  CLEANER_WELCOME_SUBJECT,
  renderCleanerWelcomeEmail,
  sendCleanerWelcome,
} from "./cleaner-welcome-email";
import { RESEND_ENDPOINT } from "./welcome-email";

const FORM_PATH = "/forms/d/e/1FAIpQLScFjcV_SMcGR5GdX0IndQtlBRbLOA5DQhexki3ic75Ne-JjjQ/viewform";

test("the cleaner welcome Start onboarding link is the live form", () => {
  const message = renderCleanerWelcomeEmail();
  assert.equal(message.subject, CLEANER_WELCOME_SUBJECT);
  const links = [...message.html.matchAll(/<a href="([^"]+)"[^>]*>Start onboarding<\/a>/g)];
  assert.equal(links.length, 1);
  assert.equal(links[0][1], CLEANER_ONBOARDING_FORM_URL);
  assert.ok(links[0][1].includes(FORM_PATH));
  assert.equal(links[0][1], `https://docs.google.com${FORM_PATH}`);
  const allLinks = [...message.html.matchAll(/<a href="([^"]+)"/g)];
  assert.equal(allLinks.length, 1);
  assert.match(message.text, new RegExp(`Start onboarding: ${CLEANER_ONBOARDING_FORM_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.doesNotMatch(message.html, /Get your referral link/);
  assert.doesNotMatch(message.html, /\$25/);
  assert.doesNotMatch(message.text, /\?ref=/);
});

test("the cleaner waitlist success CTA uses the same form constant", async () => {
  const source = await readFile(new URL("../components/Waitlist.tsx", import.meta.url), "utf8");
  assert.match(source, /cta=\{\{ href: CLEANER_ONBOARDING_FORM_URL, label: "Start onboarding" \}\}/);
  assert.equal((source.match(/Start onboarding/g) || []).length, 1);
  assert.doesNotMatch(source, /1FAIpQLS/);
  assert.doesNotMatch(source, /docs\.google\.com/);
});

test("a missing Resend key skips the cleaner welcome and does not call the network", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return new Response("nope", { status: 500 });
  };
  const result = await sendCleanerWelcome(
    { to: "jordan@example.com", name: "Jordan Hale" },
    { RESEND_API_KEY: " ", EMAIL_FROM: "Tydlii <hello@tydlii.com>" },
    fetchImpl,
  );
  assert.deepEqual(result, { sent: false });
  assert.equal(calls, 0);
});

test("the cleaner welcome posts the form link only when Resend is configured", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push({ url, init });
    return new Response(JSON.stringify({ id: "email_1" }), { status: 200 });
  };
  const result = await sendCleanerWelcome(
    { to: "jordan@example.com", name: "Jordan Hale" },
    { RESEND_API_KEY: "re_test_key", EMAIL_FROM: "Tydlii <hello@tydlii.com>" },
    fetchImpl,
  );
  assert.deepEqual(result, { sent: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, RESEND_ENDPOINT);
  const body = JSON.parse(String(calls[0].init?.body)) as { html: string; text: string; subject: string };
  assert.equal(body.subject, CLEANER_WELCOME_SUBJECT);
  assert.match(body.html, new RegExp(`href="${CLEANER_ONBOARDING_FORM_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  assert.match(body.html, /Start onboarding/);
  assert.ok(body.text.includes(FORM_PATH));
});
