import assert from "node:assert/strict";
import { test } from "node:test";
import { quoteHome } from "./pricing";
import { summarizeQuote } from "./quote-summary";
import {
  WEB3FORMS_ENDPOINT,
  deliverWaitlist,
  quoteSummary,
  waitlistMessage,
  waitlistSubject,
  type WaitlistRecord,
} from "./waitlist-notify";

const quote = quoteHome({
  band: "A",
  bedrooms: 1,
  fullBaths: 1,
  halfBaths: 0,
  frequency: "biweekly",
  condition: "standard",
});

const customer: WaitlistRecord = {
  type: "customer",
  name: "Mina Chen",
  email: "mina@example.com",
  phone: "416-555-0148",
  neighbourhoods: ["CityPlace"],
  notes: "One bedroom\non Fort York.",
  consent: true,
  quote,
  createdAt: "2026-10-26T00:00:00.000Z",
  source: "tydlii.com",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push({ url, init });
    return handler(url, init);
  };
  return { calls, fetchImpl };
}

test("subject and message list the signup fields", () => {
  assert.equal(waitlistSubject(customer), "[Tydlii waitlist] customer — mina@example.com");
  const message = waitlistMessage(customer);
  assert.match(message, /^type: customer$/m);
  assert.match(message, /^name: Mina Chen$/m);
  assert.match(message, /^email: mina@example.com$/m);
  assert.match(message, /^phone: 416-555-0148$/m);
  assert.match(message, /^neighbourhoods: CityPlace$/m);
  assert.match(message, /^notes: One bedroom on Fort York\.$/m);
  assert.match(message, new RegExp(`^quote: ${quoteSummary(quote).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
  assert.equal(quoteSummary(quote), summarizeQuote(quote));
  assert.match(message, /^createdAt: 2026-10-26T00:00:00.000Z$/m);
  assert.match(message, /^source: tydlii.com$/m);
});

test("a cleaner signup with no quote still lists every field", () => {
  const message = waitlistMessage({
    ...customer,
    type: "cleaner",
    email: "jordan@example.com",
    phone: "",
    neighbourhoods: ["King West", "CityPlace"],
    notes: "",
    quote: null,
  });
  assert.match(message, /^type: cleaner$/m);
  assert.match(message, /^neighbourhoods: King West, CityPlace$/m);
  assert.match(message, /^phone: $/m);
  assert.match(message, /^notes: $/m);
  assert.match(message, /^quote: $/m);
});

test("a successful Web3Forms submit returns ok and then forwards the webhook", async () => {
  const { calls, fetchImpl } = mockFetch(async (url) => {
    if (url === WEB3FORMS_ENDPOINT) return jsonResponse({ success: true, message: "Email sent successfully!" });
    return jsonResponse({ ok: true });
  });

  const result = await deliverWaitlist(
    customer,
    {
      WAITLIST_WEB3FORMS_ACCESS_KEY: "test-access-key",
      WAITLIST_WEBHOOK_URL: "https://hooks.example/waitlist",
    },
    fetchImpl,
  );

  assert.deepEqual(result, { ok: true });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, WEB3FORMS_ENDPOINT);
  assert.equal(calls[0].init?.method, "POST");
  const mailed = JSON.parse(String(calls[0].init?.body)) as Record<string, string>;
  assert.deepEqual(mailed, {
    access_key: "test-access-key",
    subject: "[Tydlii waitlist] customer — mina@example.com",
    from_name: "Mina Chen",
    replyto: "mina@example.com",
    message: waitlistMessage(customer),
  });
  assert.equal(calls[1].url, "https://hooks.example/waitlist");
  const forwarded = JSON.parse(String(calls[1].init?.body)) as WaitlistRecord;
  assert.equal(forwarded.email, customer.email);
  assert.equal("access_key" in forwarded, false);
});

test("Web3Forms success:false fails the signup and skips the webhook", async () => {
  const { calls, fetchImpl } = mockFetch(async () =>
    jsonResponse({ success: false, body: { message: "Invalid access key" } }, 400),
  );
  const result = await deliverWaitlist(
    customer,
    {
      WAITLIST_WEB3FORMS_ACCESS_KEY: "test-access-key",
      WAITLIST_WEBHOOK_URL: "https://hooks.example/waitlist",
    },
    fetchImpl,
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.status, 502);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, WEB3FORMS_ENDPOINT);
});

test("a webhook failure after email is accepted still returns ok", async () => {
  const { calls, fetchImpl } = mockFetch(async (url) => {
    if (url === WEB3FORMS_ENDPOINT) return jsonResponse({ success: true });
    return jsonResponse({ ok: false }, 405);
  });
  const result = await deliverWaitlist(
    customer,
    {
      WAITLIST_WEB3FORMS_ACCESS_KEY: "test-access-key",
      WAITLIST_WEBHOOK_URL: "https://script.google.com/macros/s/example/exec",
    },
    fetchImpl,
  );
  assert.deepEqual(result, { ok: true });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].init?.redirect, "manual");
});

test("without an access key outside production the signup is logged and not posted to Web3Forms", async () => {
  const { calls, fetchImpl } = mockFetch(async () => jsonResponse({ ok: true }));
  const result = await deliverWaitlist(
    customer,
    { WAITLIST_WEBHOOK_URL: "not a url", NODE_ENV: "development" },
    fetchImpl,
  );
  assert.deepEqual(result, { ok: true });
  assert.equal(calls.length, 0);
});

test("production without an access key does not claim the signup was saved", async () => {
  const { calls, fetchImpl } = mockFetch(async () => jsonResponse({ ok: true }));
  const result = await deliverWaitlist(
    customer,
    { NODE_ENV: "production", WAITLIST_WEBHOOK_URL: "https://hooks.example/waitlist" },
    fetchImpl,
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.status, 500);
  assert.equal(calls.length, 0);
});
