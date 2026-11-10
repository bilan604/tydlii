import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { claimWaitlistRequest, confirmWaitlistRequest, releaseWaitlistRequest } from "./waitlist-api";
import { createWaitlistStore } from "./waitlist-store";

const customer = {
  type: "customer",
  name: "Mina Chen",
  email: "mina@example.com",
  phone: "",
  neighbourhoods: ["CityPlace"],
  notes: "",
  consent: true,
  quote: null,
};

async function tempStore() {
  const dir = await mkdtemp(path.join(tmpdir(), "tydlii-api-"));
  const store = createWaitlistStore({
    filePath: path.join(dir, "waitlist-emails.json"),
    durable: true,
    seedEmails: ["ada@example.com"],
    testEmails: [],
  });
  return { dir, store };
}

test("claim then confirm keeps the signup and a second claim is a duplicate", async () => {
  const { dir, store } = await tempStore();
  try {
    const claimed = await claimWaitlistRequest(customer, store);
    assert.equal(claimed.status, 200);
    assert.equal(claimed.body.claimed, true);
    const claimId = claimed.body.claimId;
    assert.equal(typeof claimId, "string");

    const confirmed = await confirmWaitlistRequest(
      { email: "Mina@Example.com", claimId },
      store,
      undefined,
    );
    assert.deepEqual(confirmed, { status: 200, body: { ok: true } });

    const again = await claimWaitlistRequest({ ...customer, type: "cleaner" }, store);
    assert.deepEqual(again, {
      status: 200,
      body: { ok: true, duplicate: true, existingType: "customer" },
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a honeypot is not stored and a seeded address is a duplicate", async () => {
  const { dir, store } = await tempStore();
  try {
    const spam = await claimWaitlistRequest({ ...customer, tyd_check: "bot" }, store);
    assert.deepEqual(spam, { status: 200, body: { ok: true, spam: true } });
    const real = await claimWaitlistRequest(customer, store);
    assert.equal(real.body.claimed, true);

    const seeded = await claimWaitlistRequest({ ...customer, email: "ada@example.com" }, store);
    assert.deepEqual(seeded, { status: 200, body: { ok: true, duplicate: true } });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("release lets the same email claim again", async () => {
  const { dir, store } = await tempStore();
  try {
    const claimed = await claimWaitlistRequest(customer, store);
    const released = await releaseWaitlistRequest(
      { email: customer.email, claimId: claimed.body.claimId },
      store,
    );
    assert.deepEqual(released, { status: 200, body: { ok: true } });
    const again = await claimWaitlistRequest(customer, store);
    assert.equal(again.body.claimed, true);
    assert.notEqual(again.body.claimId, claimed.body.claimId);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("confirming a customer sends the welcome and a cleaner gets the onboarding welcome", async () => {
  const { dir, store } = await tempStore();
  const welcomes: { to: string; shareUrl: string }[] = [];
  const cleanerWelcomes: { to: string; name: string }[] = [];
  const welcome = async (input: { to: string; shareUrl: string }) => {
    welcomes.push(input);
    return { sent: true };
  };
  const cleanerWelcome = async (input: { to: string; name: string }) => {
    cleanerWelcomes.push(input);
    return { sent: true };
  };
  try {
    const claimed = await claimWaitlistRequest({ ...customer, ref: "not-a-code" }, store);
    assert.equal(claimed.body.claimed, true);
    const confirmed = await confirmWaitlistRequest(
      { email: customer.email, claimId: claimed.body.claimId },
      store,
      undefined,
      welcome,
      cleanerWelcome,
    );
    assert.equal(confirmed.status, 200);
    assert.equal(welcomes.length, 1);
    assert.equal(cleanerWelcomes.length, 0);
    assert.equal(welcomes[0].to, "mina@example.com");
    assert.match(welcomes[0].shareUrl, /^https:\/\/tydlii\.com\/\?ref=[a-z2-9]+$/);

    const cleaner = await claimWaitlistRequest(
      {
        ...customer,
        type: "cleaner",
        name: "Jordan Hale",
        email: "jordan@example.com",
        neighbourhoods: ["King West", "CityPlace"],
      },
      store,
    );
    assert.equal(cleaner.body.claimed, true);
    await confirmWaitlistRequest(
      { email: "jordan@example.com", claimId: cleaner.body.claimId },
      store,
      undefined,
      welcome,
      cleanerWelcome,
    );
    assert.equal(welcomes.length, 1);
    assert.deepEqual(cleanerWelcomes, [{ to: "jordan@example.com", name: "Jordan Hale" }]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a tester receives each welcome and is not stored, and a honeypot is still dropped", async () => {
  const { dir } = await tempStore();
  const founder = "josephkocsisan2020@gmail.com";
  const tester = createWaitlistStore({
    filePath: path.join(dir, "waitlist-emails.json"),
    durable: true,
    seedEmails: [founder],
    testEmails: [founder],
  });
  const welcomes: string[] = [];
  const cleanerWelcomes: { to: string; name: string }[] = [];
  const welcome = async (input: { to: string }) => {
    welcomes.push(input.to);
    return { sent: true };
  };
  const cleanerWelcome = async (input: { to: string; name: string }) => {
    cleanerWelcomes.push(input);
    return { sent: true };
  };
  try {
    const spam = await claimWaitlistRequest(
      { ...customer, email: founder, name: "John", tyd_check: "bot" },
      tester,
    );
    assert.deepEqual(spam, { status: 200, body: { ok: true, spam: true } });

    const cleaner = await claimWaitlistRequest(
      {
        ...customer,
        type: "cleaner",
        name: "John",
        email: founder,
        neighbourhoods: ["King West"],
      },
      tester,
    );
    assert.equal(cleaner.body.test, true);
    assert.equal(cleaner.body.claimed, true);
    await confirmWaitlistRequest(
      { email: founder, claimId: cleaner.body.claimId },
      tester,
      undefined,
      welcome,
      cleanerWelcome,
    );
    const again = await claimWaitlistRequest(
      {
        ...customer,
        type: "cleaner",
        name: "John",
        email: "JosephKocsisan2020@gmail.com",
        neighbourhoods: ["CityPlace"],
      },
      tester,
    );
    assert.equal(again.body.claimed, true);
    assert.notEqual(again.body.claimId, cleaner.body.claimId);
    await confirmWaitlistRequest(
      { email: founder, claimId: again.body.claimId },
      tester,
      undefined,
      welcome,
      cleanerWelcome,
    );
    const asCustomer = await claimWaitlistRequest(
      { ...customer, name: "John", email: founder },
      tester,
    );
    assert.equal(asCustomer.body.test, true);
    await confirmWaitlistRequest(
      { email: founder, claimId: asCustomer.body.claimId },
      tester,
      undefined,
      welcome,
      cleanerWelcome,
    );

    assert.deepEqual(cleanerWelcomes, [
      { to: founder, name: "John" },
      { to: founder, name: "John" },
    ]);
    assert.deepEqual(welcomes, [founder]);
    const file = JSON.parse(await readFile(path.join(dir, "waitlist-emails.json"), "utf8")) as {
      entries: Record<string, unknown>;
    };
    assert.equal(founder in file.entries, false);

    const real = await claimWaitlistRequest(customer, tester);
    const repeat = await claimWaitlistRequest({ ...customer, type: "cleaner" }, tester);
    assert.equal(real.body.claimed, true);
    assert.deepEqual(repeat.body, { ok: true, duplicate: true, existingType: "customer" });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("confirm without a matching reserve is rejected", async () => {
  const { dir, store } = await tempStore();
  try {
    const confirmed = await confirmWaitlistRequest({ email: customer.email, claimId: "nope" }, store, undefined);
    assert.equal(confirmed.status, 409);
    assert.equal(confirmed.body.ok, false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
