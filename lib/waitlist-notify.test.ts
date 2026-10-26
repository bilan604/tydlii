import assert from "node:assert/strict";
import { test } from "node:test";
import { quoteHome } from "./pricing";
import { summarizeQuote } from "./quote-summary";
import {
  WEB3FORMS_ENDPOINT,
  configuredAccessKey,
  quoteSummary,
  recordWaitlist,
  sendWaitlistEmail,
  submitWeb3Forms,
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

test("the browser submit posts the Web3Forms payload and not our API", async () => {
  const { calls, fetchImpl } = mockFetch(async () =>
    jsonResponse({ success: true, message: "Email sent successfully!" }),
  );

  const result = await sendWaitlistEmail(
    {
      type: customer.type,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      neighbourhoods: customer.neighbourhoods,
      notes: customer.notes,
      consent: true,
      quote: customer.quote,
    },
    "test-access-key",
    fetchImpl,
  );

  assert.deepEqual(result, { ok: true, emailed: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, WEB3FORMS_ENDPOINT);
  assert.equal(calls[0].init?.method, "POST");
  const mailed = JSON.parse(String(calls[0].init?.body)) as Record<string, string>;
  assert.equal(mailed.access_key, "test-access-key");
  assert.equal(mailed.subject, "[Tydlii waitlist] customer — mina@example.com");
  assert.equal(mailed.from_name, "Mina Chen");
  assert.equal(mailed.replyto, "mina@example.com");
  assert.match(mailed.message, /^type: customer$/m);
  assert.match(mailed.message, /^source: tydlii.com$/m);
  assert.match(mailed.message, /quote: /);
  assert.equal(calls.some((call) => call.url.includes("/api/waitlist")), false);
});

test("submitWeb3Forms sends the full field list", async () => {
  const { calls, fetchImpl } = mockFetch(async () => jsonResponse({ success: true }));
  const result = await submitWeb3Forms(customer, "test-access-key", fetchImpl);
  assert.deepEqual(result, { ok: true });
  const mailed = JSON.parse(String(calls[0].init?.body)) as Record<string, string>;
  assert.equal(mailed.message, waitlistMessage(customer));
});

test("Web3Forms success:false does not count as sent", async () => {
  const { calls, fetchImpl } = mockFetch(async () =>
    jsonResponse({ success: false, body: { message: "Invalid access key" } }, 400),
  );
  const result = await sendWaitlistEmail(
    {
      type: "cleaner",
      name: "Jordan Hale",
      email: "jordan@example.com",
      neighbourhoods: ["King West"],
      consent: true,
    },
    "test-access-key",
    fetchImpl,
  );
  assert.equal(result.ok, false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, WEB3FORMS_ENDPOINT);
});

test("a honeypot is not emailed", async () => {
  const { calls, fetchImpl } = mockFetch(async () => jsonResponse({ success: true }));
  const result = await sendWaitlistEmail(
    {
      type: customer.type,
      name: customer.name,
      email: customer.email,
      neighbourhoods: customer.neighbourhoods,
      consent: true,
      website: "https://spam.example",
    },
    "test-access-key",
    fetchImpl,
  );
  assert.deepEqual(result, { ok: true, emailed: false });
  assert.equal(calls.length, 0);
});

test("a missing access key does not post", async () => {
  const { calls, fetchImpl } = mockFetch(async () => jsonResponse({ success: true }));
  const result = await sendWaitlistEmail(
    {
      type: customer.type,
      name: customer.name,
      email: customer.email,
      neighbourhoods: customer.neighbourhoods,
      consent: true,
    },
    "  ",
    fetchImpl,
  );
  assert.equal(result.ok, false);
  assert.equal(calls.length, 0);
});

test("the server record logs and forwards the webhook without calling Web3Forms", async () => {
  const { calls, fetchImpl } = mockFetch(async () => jsonResponse({ ok: false }, 405));
  const result = await recordWaitlist(customer, "https://hooks.example/waitlist", fetchImpl);
  assert.deepEqual(result, { ok: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://hooks.example/waitlist");
  assert.equal(calls[0].init?.redirect, "manual");
  const forwarded = JSON.parse(String(calls[0].init?.body)) as WaitlistRecord;
  assert.equal(forwarded.email, customer.email);
  assert.equal("access_key" in forwarded, false);
});

test("configuredAccessKey prefers the public variable, then the server fallback", () => {
  const previous = process.env.NEXT_PUBLIC_WAITLIST_WEB3FORMS_ACCESS_KEY;
  process.env.NEXT_PUBLIC_WAITLIST_WEB3FORMS_ACCESS_KEY = "public-key";
  try {
    assert.equal(configuredAccessKey("server-key"), "public-key");
    delete process.env.NEXT_PUBLIC_WAITLIST_WEB3FORMS_ACCESS_KEY;
    assert.equal(configuredAccessKey("server-key"), "server-key");
    assert.equal(configuredAccessKey("  "), "");
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_WAITLIST_WEB3FORMS_ACCESS_KEY;
    else process.env.NEXT_PUBLIC_WAITLIST_WEB3FORMS_ACCESS_KEY = previous;
  }
});

test("a bad webhook URL still accepts the server record", async () => {
  const { calls, fetchImpl } = mockFetch(async () => jsonResponse({ ok: true }));
  const result = await recordWaitlist(customer, "not a url", fetchImpl);
  assert.deepEqual(result, { ok: true });
  assert.equal(calls.length, 0);
});
