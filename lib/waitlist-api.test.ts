import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
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
    assert.deepEqual(again, { status: 200, body: { ok: true, duplicate: true } });
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
