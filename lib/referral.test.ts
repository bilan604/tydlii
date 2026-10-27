import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { applyReferralCredit, earnReferralCreditsForFirstPaidClean } from "./referral-credits";
import {
  REFERRAL_ALPHABET,
  REFERRAL_CREDIT_CENTS,
  REFERRAL_CREDIT_PROMISE,
  REFERRAL_FRIEND_DISCOUNT_CENTS,
  REFERRAL_FRIEND_OFFER,
  decideReferral,
  earnPendingCredits,
  normalizeReferralCode,
  referralLandingUrl,
  referralManageUrl,
  referralShareUrl,
} from "./referral";
import { createWaitlistStore } from "./waitlist-store";
import type { WaitlistSignup } from "./waitlist";

const mina: WaitlistSignup = {
  type: "customer",
  name: "Mina Chen",
  email: "mina@example.com",
  phone: "",
  neighbourhoods: ["CityPlace"],
  notes: "",
  consent: true,
  quote: null,
};

const friend: WaitlistSignup = {
  ...mina,
  name: "Ari Patel",
  email: "ari@example.com",
};

function storeAt(filePath: string) {
  return createWaitlistStore({ filePath, durable: true, seedEmails: [], now: () => Date.parse("2026-10-26T12:00:00.000Z") });
}

async function tempFile() {
  const dir = await mkdtemp(path.join(tmpdir(), "tydlii-referral-"));
  return { dir, filePath: path.join(dir, "waitlist-emails.json") };
}

async function join(store: ReturnType<typeof storeAt>, signup: WaitlistSignup, referralCode?: string) {
  const claimed = await store.claim(signup, { referralCode });
  assert.equal(claimed.status, "claimed");
  if (claimed.status !== "claimed") throw new Error("expected claim");
  const confirmed = await store.confirm(signup.email, claimed.claimId);
  assert.equal(confirmed.status, "confirmed");
  if (confirmed.status !== "confirmed") throw new Error("expected confirm");
  return confirmed;
}

test("codes are normalized and links use the code", () => {
  assert.equal(normalizeReferralCode(" AbC23def "), "abc23def");
  assert.equal(normalizeReferralCode("abc23def0"), "");
  assert.equal(normalizeReferralCode("short"), "");
  const code = "k7m2pqrs";
  assert.equal(referralShareUrl(code), "https://tydlii.com/?ref=k7m2pqrs");
  assert.equal(referralManageUrl(code), "https://tydlii.com/refer?code=k7m2pqrs");
  assert.equal(referralLandingUrl("K7M2PQRS", "http://localhost:3000/r/K7M2PQRS"), "http://localhost:3000/?ref=k7m2pqrs");
  assert.equal(referralLandingUrl("nope", "http://localhost:3000/r/nope"), "http://localhost:3000/");
  assert.match(REFERRAL_CREDIT_PROMISE, /\$25 off their first clean/);
  assert.match(REFERRAL_CREDIT_PROMISE, /\$25 account credit after their first cleaning using Tydlii/);
  assert.doesNotMatch(REFERRAL_CREDIT_PROMISE, /after that clean is paid/);
  assert.doesNotMatch(REFERRAL_CREDIT_PROMISE, /It is not cash/);
  assert.equal(REFERRAL_FRIEND_OFFER, "You get $25 off your first clean.");
  assert.doesNotMatch(REFERRAL_FRIEND_OFFER, /It is not cash/);
  assert.doesNotMatch(REFERRAL_CREDIT_PROMISE, /Both get \$25/);
});

test("the refer page uses the shared offer and does not say it is not cash", async () => {
  const source = await readFile(new URL("../app/refer/page.tsx", import.meta.url), "utf8");
  assert.match(source, /REFERRAL_CREDIT_PROMISE/);
  assert.doesNotMatch(source, /It is not cash/);
  assert.doesNotMatch(source, /after that clean is paid/);
  assert.doesNotMatch(source, /Prices before HST/);
});

test("self-referral and a second credit for the same friend are refused", () => {
  assert.deepEqual(
    decideReferral({
      signupEmail: "ari@example.com",
      requestedCode: "k7m2pqrs",
      referrerEmail: "ari@example.com",
      alreadyCredited: false,
    }),
    { ok: false, reason: "self" },
  );
  assert.equal(
    decideReferral({
      signupEmail: "ari@example.com",
      requestedCode: "k7m2pqrs",
      referrerEmail: "mina@example.com",
      alreadyCredited: true,
    }).ok,
    false,
  );
  assert.equal(
    decideReferral({
      signupEmail: "ari@example.com",
      requestedCode: "k7m2pqrs",
      referrerEmail: "mina@example.com",
      alreadyCredited: false,
    }).ok,
    true,
  );
});

test("a legacy friend credit is not earned as account credit", () => {
  const pending = {
    id: "friend-row",
    beneficiaryEmail: "ari@example.com",
    referredEmail: "ari@example.com",
    referrerEmail: "mina@example.com",
    code: "k7m2pqrs",
    role: "friend" as const,
    amountCents: REFERRAL_CREDIT_CENTS,
    currency: "CAD" as const,
    status: "pending" as const,
    createdAt: "2026-10-26T12:00:00.000Z",
    earnedAt: null,
    appliedAt: null,
    earnedBookingId: null,
    appliedBookingId: null,
  };
  const referrer = { ...pending, id: "referrer-row", beneficiaryEmail: "mina@example.com", role: "referrer" as const };
  const earned = earnPendingCredits([referrer, pending], "ari@example.com", "booking-1", "2026-10-27T00:00:00.000Z");
  assert.equal(earned.earned, 1);
  assert.equal(earned.credits.find((credit) => credit.role === "referrer")?.status, "earned");
  assert.equal(earned.credits.find((credit) => credit.role === "friend")?.status, "pending");
});

test("a friend gets $25 off and the referrer credit stays pending until that clean is paid", async () => {
  const { dir, filePath } = await tempFile();
  try {
    const store = storeAt(filePath);
    const referrer = await join(store, mina);
    assert.ok(referrer.referral);
    const code = referrer.referral.code;
    assert.match(code, new RegExp(`^[${REFERRAL_ALPHABET}]{8}$`));
    assert.equal(referrer.referral.shareUrl, `https://tydlii.com/?ref=${code}`);
    assert.equal(referrer.referral.creditsCreated, 0);
    assert.equal(referrer.referral.referredByEmail, null);

    const referred = await join(store, friend, code);
    assert.ok(referred.referral);
    assert.equal(referred.referral.referredByEmail, "mina@example.com");
    assert.equal(referred.referral.referredByCode, code);
    assert.equal(referred.referral.creditsCreated, 1);
    assert.equal(referred.referral.friendDiscountCents, REFERRAL_FRIEND_DISCOUNT_CENTS);
    assert.notEqual(referred.referral.code, code);

    const file = JSON.parse(await readFile(filePath, "utf8")) as {
      entries: Record<string, { firstCleanDiscountCents: number | null }>;
      credits: {
        id: string;
        status: string;
        amountCents: number;
        referredEmail: string;
        beneficiaryEmail: string;
        role: string;
      }[];
    };
    assert.equal(file.entries["ari@example.com"].firstCleanDiscountCents, REFERRAL_FRIEND_DISCOUNT_CENTS);
    assert.equal(file.credits.length, 1);
    assert.equal(file.credits[0].status, "pending");
    assert.equal(file.credits[0].role, "referrer");
    assert.equal(file.credits[0].beneficiaryEmail, "mina@example.com");
    assert.equal(file.credits[0].referredEmail, "ari@example.com");
    assert.equal(file.credits[0].amountCents, REFERRAL_CREDIT_CENTS);

    const blocked = await applyReferralCredit(file.credits[0].id, "invoice-1", store);
    assert.equal(blocked.status, "not-earned");
    assert.equal((await applyReferralCredit("missing-credit", "invoice-1", store)).status, "missing");

    const earned = await earnReferralCreditsForFirstPaidClean("Ari@Example.com", "booking-1", store);
    assert.deepEqual(earned, { status: "ok", earned: 1 });
    const again = await earnReferralCreditsForFirstPaidClean("ari@example.com", "booking-2", store);
    assert.deepEqual(again, { status: "ok", earned: 0 });
    assert.deepEqual(await store.earnFirstPaidClean("ari@example.com", " "), { status: "invalid" });

    const after = JSON.parse(await readFile(filePath, "utf8")) as {
      credits: { id: string; status: string; earnedBookingId: string | null; role: string }[];
    };
    assert.deepEqual(
      after.credits.map((credit) => credit.status),
      ["earned"],
    );
    assert.equal(after.credits[0].role, "referrer");
    assert.ok(after.credits.every((credit) => credit.earnedBookingId === "booking-1"));

    const applied = await applyReferralCredit(after.credits[0].id, "invoice-9", store);
    assert.equal(applied.status, "applied");
    assert.equal((await applyReferralCredit(after.credits[0].id, "invoice-10", store)).status, "already");
    const stillEarned = JSON.parse(await readFile(filePath, "utf8")) as {
      credits: { id: string; status: string; role: string }[];
    };
    assert.equal(stillEarned.credits.length, 1);
    assert.equal(stillEarned.credits[0].role, "referrer");
    assert.equal(stillEarned.credits[0].status, "applied");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the same email cannot refer itself and an unknown code does not open a credit", async () => {
  const { dir, filePath } = await tempFile();
  try {
    const store = storeAt(filePath);
    const referrer = await join(store, mina);
    assert.ok(referrer.referral);
    const again = await store.claim(mina, { referralCode: referrer.referral.code });
    assert.deepEqual(again, { status: "duplicate" });

    const unknown = await join(store, friend, "zzzzzzzz");
    assert.ok(unknown.referral);
    assert.equal(unknown.referral.referredByEmail, null);
    assert.equal(unknown.referral.creditsCreated, 0);
    const file = JSON.parse(await readFile(filePath, "utf8")) as { credits: unknown[] };
    assert.equal(file.credits.length, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a second referrer does not open another credit for the same friend", async () => {
  const { dir, filePath } = await tempFile();
  try {
    const store = storeAt(filePath);
    const first = await join(store, mina);
    assert.ok(first.referral);
    const second: WaitlistSignup = { ...mina, name: "Sam Cole", email: "sam@example.com" };
    const other = await join(store, second);
    assert.ok(other.referral);
    await join(store, friend, first.referral.code);
    assert.equal((await store.forget(friend.email)), "removed");
    const rejoined = await join(store, friend, other.referral.code);
    assert.ok(rejoined.referral);
    assert.equal(rejoined.referral.creditsCreated, 0);
    assert.equal(rejoined.referral.referredByEmail, "mina@example.com");
    const file = JSON.parse(await readFile(filePath, "utf8")) as { credits: unknown[] };
    assert.equal(file.credits.length, 1);
    const lookup = await store.lookupReferral(first.referral.code.toUpperCase());
    assert.equal(lookup.status, "found");
    if (lookup.status === "found") assert.equal(lookup.name, "Mina Chen");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a cleaner signup does not get a referral code or a referred_by", async () => {
  const { dir, filePath } = await tempFile();
  try {
    const store = storeAt(filePath);
    const referrer = await join(store, mina);
    assert.ok(referrer.referral);
    const cleaner: WaitlistSignup = {
      ...friend,
      type: "cleaner",
      neighbourhoods: ["King West", "CityPlace"],
    };
    const joined = await join(store, cleaner, referrer.referral.code);
    assert.equal(joined.referral, null);
    const file = JSON.parse(await readFile(filePath, "utf8")) as {
      entries: Record<string, { referralCode: string | null; referredByEmail: string | null }>;
      credits: unknown[];
    };
    assert.equal(file.entries["ari@example.com"].referralCode, null);
    assert.equal(file.entries["ari@example.com"].referredByEmail, null);
    assert.equal(file.credits.length, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("an older waitlist file with no credit list still confirms", async () => {
  const { dir, filePath } = await tempFile();
  try {
    await writeFile(
      filePath,
      JSON.stringify({
        version: 1,
        entries: {
          "mina@example.com": {
            email: "mina@example.com",
            type: "customer",
            name: "Mina Chen",
            phone: "",
            neighbourhoods: ["CityPlace"],
            notes: "",
            quote: null,
            createdAt: "2026-10-01T00:00:00.000Z",
            source: "tydlii.com",
            claimId: "claim-old",
            pendingUntil: "2026-10-26T12:15:00.000Z",
          },
        },
      }),
    );
    const store = storeAt(filePath);
    const confirmed = await store.confirm("mina@example.com", "claim-old");
    assert.equal(confirmed.status, "confirmed");
    if (confirmed.status !== "confirmed") return;
    assert.match(confirmed.referral?.code ?? "", new RegExp(`^[${REFERRAL_ALPHABET}]{8}$`));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
