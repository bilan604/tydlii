import assert from "node:assert/strict";
import { test } from "node:test";
import { REFERRAL_CREDIT_PROMISE } from "./referral";
import {
  RESEND_ENDPOINT,
  WELCOME_SUBJECT,
  renderWelcomeEmail,
  sendCustomerWelcome,
} from "./welcome-email";

const shareUrl = "https://tydlii.com/?ref=k7m2pqrs";
const manageUrl = "https://tydlii.com/refer?code=k7m2pqrs";

test("the welcome matches the locked creative and the credit rules", () => {
  const message = renderWelcomeEmail({
    shareUrl,
    manageUrl,
    heroSrc: "cid:tydlii-welcome-hero",
    wordmarkSrc: "cid:tydlii-wordmark",
  });
  assert.equal(message.subject, WELCOME_SUBJECT);
  assert.match(message.html, /More living\. Less cleaning\./);
  assert.match(message.html, /Experience the ultimate clean/);
  assert.match(message.html, /Sparkling<br>Results/);
  assert.match(message.html, /Eco-Friendly/);
  assert.match(message.html, /On-Demand<br>Booking/);
  assert.match(message.html, /You get \$25\./);
  assert.match(message.html, /Your friend gets \$25\./);
  assert.match(message.html, new RegExp(REFERRAL_CREDIT_PROMISE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(message.html, new RegExp(`href="${shareUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  assert.match(message.html, />Get your referral link</);
  assert.match(message.html, /#070707/);
  assert.match(message.html, /#5c9396/);
  const header = message.html.slice(0, message.html.indexOf("cid:tydlii-welcome-hero"));
  assert.match(header, /cid:tydlii-wordmark/);
  assert.match(header, /background-color:#070707/);
  assert.match(header, /linear-gradient\(#070707,#070707\)/);
  assert.equal((header.match(/bgcolor="#070707"/g) || []).length, 3);
  assert.match(header, /class="header-ink"/);
  assert.match(message.html, /name="color-scheme" content="light dark"/);
  assert.match(message.html, /name="supported-color-schemes" content="light dark"/);
  assert.match(message.html, /prefers-color-scheme: dark/);
  assert.match(message.html, /\[data-ogsc\] \.header-ink/);
  assert.match(message.html, /u \+ \.body \.header-ink/);
  const pillTags = [...message.html.matchAll(/<td class="feature-pill"[^>]*>/g)].map((match) => match[0]);
  assert.equal(pillTags.length, 3);
  assert.equal(pillTags[0], pillTags[1]);
  assert.equal(pillTags[1], pillTags[2]);
  assert.match(pillTags[0], /width="32%"/);
  assert.match(pillTags[0], /width:32%/);
  assert.match(pillTags[0], /height="76"/);
  assert.match(pillTags[0], /min-height:76px/);
  assert.match(pillTags[0], /valign="middle"/);
  assert.match(pillTags[0], /bgcolor="#ffffff"/);
  assert.match(pillTags[0], /background-color:#ffffff/);
  assert.match(pillTags[0], /border:1px solid #ffffff/);
  assert.match(pillTags[0], /padding:16px 8px/);
  assert.match(pillTags[0], /border-radius:16px/);
  assert.equal((message.html.match(/class="feature-gap" width="2%"/g) || []).length, 2);
  assert.match(
    message.html,
    /<img src="cid:tydlii-welcome-hero" width="600" alt="A customer with her dog on the couch after a Tydlii clean"/,
  );
  assert.match(message.html, /You get \$25\.<br>Your friend gets \$25\./);
  assert.match(message.html, /background:#e5f3f4;border-radius:28px;/);
  assert.doesNotMatch(message.html, /neighbourhood/i);
  assert.doesNotMatch(message.html, /\$25 off/);
  assert.ok(message.text.includes(REFERRAL_CREDIT_PROMISE));
  assert.ok(message.text.includes(shareUrl));
  const hostile = renderWelcomeEmail({
    shareUrl: "https://tydlii.com/?ref=k7m2pqrs",
    manageUrl: "https://tydlii.com/refer?code=k7m2pqrs&amp;x=<script>",
    heroSrc: "cid:tydlii-welcome-hero",
    wordmarkSrc: "cid:tydlii-wordmark",
  });
  assert.match(hostile.html, /&amp;amp;x=&lt;script&gt;/);
  assert.doesNotMatch(hostile.html, /<script>/);
});

test("a missing Resend key skips the send and does not call the network", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return new Response("nope", { status: 500 });
  };
  const result = await sendCustomerWelcome(
    { to: "mina@example.com", name: "Mina Chen", code: "k7m2pqrs", shareUrl, manageUrl },
    { RESEND_API_KEY: " ", EMAIL_FROM: "Tydlii <hello@tydlii.com>" },
    fetchImpl,
  );
  assert.deepEqual(result, { sent: false });
  assert.equal(calls, 0);

  const missingFrom = await sendCustomerWelcome(
    { to: "mina@example.com", name: "Mina Chen", code: "k7m2pqrs", shareUrl, manageUrl },
    { RESEND_API_KEY: "re_test", EMAIL_FROM: "" },
    fetchImpl,
  );
  assert.deepEqual(missingFrom, { sent: false });
  assert.equal(calls, 0);
});

test("Resend is posted only when both env vars are set, and a non-2xx does not throw", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push({ url, init });
    return new Response(JSON.stringify({ message: "domain is not verified" }), { status: 403 });
  };
  const result = await sendCustomerWelcome(
    { to: "mina@example.com", name: "Mina Chen", code: "k7m2pqrs", shareUrl, manageUrl },
    { RESEND_API_KEY: "re_test_key", EMAIL_FROM: "Tydlii <hello@tydlii.com>" },
    fetchImpl,
  );
  assert.deepEqual(result, { sent: false });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, RESEND_ENDPOINT);
  const headers = calls[0].init?.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer re_test_key");
  const body = JSON.parse(String(calls[0].init?.body)) as {
    from: string;
    to: string[];
    subject: string;
    html: string;
    text: string;
    attachments: { content_id: string; filename: string }[];
  };
  assert.equal(body.from, "Tydlii <hello@tydlii.com>");
  assert.deepEqual(body.to, ["mina@example.com"]);
  assert.equal(body.subject, WELCOME_SUBJECT);
  assert.match(body.html, /Get your referral link/);
  assert.match(body.html, /cid:tydlii-welcome-hero/);
  assert.match(body.text, /Both get \$25 credit after their first paid clean\./);
  assert.deepEqual(
    body.attachments.map((item) => item.content_id).sort(),
    ["tydlii-welcome-hero", "tydlii-wordmark"],
  );
});
