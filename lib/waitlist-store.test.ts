import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import type { WaitlistSignup } from "./waitlist";
import {
  CLAIM_TTL_MS,
  DEFAULT_WAITLIST_TEST_EMAILS,
  createWaitlistStore,
  parseSeedEmails,
  storeIsDurable,
  waitlistStorePath,
  waitlistTestEmails,
} from "./waitlist-store";

const signup = {
  type: "customer" as const,
  name: "Mina Chen",
  email: "mina@example.com",
  phone: "",
  neighbourhoods: ["CityPlace" as const],
  notes: "",
  consent: true as const,
  quote: null,
};

function storeAt(filePath: string, now = () => Date.parse("2026-10-26T00:00:00.000Z")) {
  return createWaitlistStore({ filePath, durable: true, seedEmails: [], testEmails: [], now });
}

async function tempFile() {
  const dir = await mkdtemp(path.join(tmpdir(), "tydlii-waitlist-"));
  return { dir, filePath: path.join(dir, "waitlist-emails.json") };
}

test("one email is a duplicate across customer and cleaner", async () => {
  const { dir, filePath } = await tempFile();
  try {
    const store = storeAt(filePath);
    const first = await store.claim(signup);
    assert.equal(first.status, "claimed");
    const second = await store.claim({ ...signup, type: "cleaner", name: "Mina C." });
    assert.deepEqual(second, { status: "duplicate", existingType: "customer" });
    const upper = await store.claim({ ...signup, email: "Mina@Example.com" });
    assert.deepEqual(upper, { status: "duplicate", existingType: "customer" });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a failed send can be released and tried again", async () => {
  const { dir, filePath } = await tempFile();
  try {
    const store = storeAt(filePath);
    const claimed = await store.claim(signup);
    assert.equal(claimed.status, "claimed");
    if (claimed.status !== "claimed") return;
    assert.equal(await store.release(signup.email, claimed.claimId), "released");
    const again = await store.claim(signup);
    assert.equal(again.status, "claimed");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("confirm keeps the address and release cannot drop it", async () => {
  const { dir, filePath } = await tempFile();
  try {
    const store = storeAt(filePath);
    const claimed = await store.claim(signup);
    assert.equal(claimed.status, "claimed");
    if (claimed.status !== "claimed") return;
    const confirmed = await store.confirm(signup.email, claimed.claimId);
    assert.equal(confirmed.status, "confirmed");
    if (confirmed.status !== "confirmed") return;
    assert.equal(confirmed.signup.name, "Mina Chen");
    assert.equal(await store.release(signup.email, claimed.claimId), "kept");
    assert.deepEqual(await store.claim({ ...signup, type: "cleaner" }), {
      status: "duplicate",
      existingType: "customer",
    });
    assert.deepEqual(await store.confirm(signup.email, claimed.claimId), { status: "already" });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("an expired reserve can be claimed again and the old id cannot release it", async () => {
  const { dir, filePath } = await tempFile();
  let clock = Date.parse("2026-10-26T00:00:00.000Z");
  try {
    const store = createWaitlistStore({
      filePath,
      durable: true,
      seedEmails: [],
      testEmails: [],
      now: () => clock,
    });
    const first = await store.claim(signup);
    assert.equal(first.status, "claimed");
    if (first.status !== "claimed") return;
    clock += CLAIM_TTL_MS + 1;
    const second = await store.claim(signup);
    assert.equal(second.status, "claimed");
    if (second.status !== "claimed") return;
    assert.notEqual(second.claimId, first.claimId);
    assert.equal(await store.release(signup.email, first.claimId), "kept");
    assert.deepEqual(await store.claim(signup), { status: "duplicate", existingType: "customer" });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("seeded addresses are duplicates and are not removed with the file", async () => {
  const { dir, filePath } = await tempFile();
  try {
    const store = createWaitlistStore({
      filePath,
      durable: true,
      seedEmails: ["Ada@Example.com"],
      testEmails: [],
    });
    assert.deepEqual(await store.claim({ ...signup, email: "ada@example.com" }), { status: "duplicate" });
    assert.equal(await store.forget("ada@example.com"), "seeded");
    await store.claim(signup);
    const cleared = await store.forgetAll();
    assert.deepEqual(cleared, { status: "cleared", count: 1 });
    assert.deepEqual(await store.claim({ ...signup, email: "ada@example.com" }), { status: "duplicate" });
    assert.equal((await store.claim(signup)).status, "claimed");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a corrupt store fails closed and is not overwritten", async () => {
  const { dir, filePath } = await tempFile();
  try {
    await writeFile(filePath, "{not json", "utf8");
    const store = storeAt(filePath);
    assert.deepEqual(await store.claim(signup), { status: "unavailable" });
    assert.equal(await readFile(filePath, "utf8"), "{not json");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("parallel claims reserve an address once", async () => {
  const { dir, filePath } = await tempFile();
  try {
    const store = storeAt(filePath);
    const [a, b] = await Promise.all([store.claim(signup), store.claim(signup)]);
    const statuses = [a.status, b.status].sort();
    assert.deepEqual(statuses, ["claimed", "duplicate"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("an undurable store does not create a file", async () => {
  const { dir, filePath } = await tempFile();
  try {
    const store = createWaitlistStore({ filePath, durable: false, seedEmails: [], testEmails: [] });
    assert.deepEqual(await store.claim(signup), { status: "unavailable" });
    await assert.rejects(stat(filePath));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("seed parsing and the default path", () => {
  assert.deepEqual(
    [...parseSeedEmails(" Mina@Example.com, bad, jordan@example.com\nada@example.com ")].sort(),
    ["ada@example.com", "jordan@example.com", "mina@example.com"],
  );
  assert.equal(parseSeedEmails(undefined).size, 0);
  assert.equal(parseSeedEmails(undefined).has("josephkocsisan2020@gmail.com"), false);
  const previous = process.env.WAITLIST_STORE_PATH;
  const render = process.env.RENDER;
  try {
    delete process.env.WAITLIST_STORE_PATH;
    delete process.env.RENDER;
    assert.match(waitlistStorePath(), /data\/waitlist-emails\.json$/);
    process.env.RENDER = "true";
    assert.equal(waitlistStorePath(), "/var/data/waitlist-emails.json");
    process.env.WAITLIST_STORE_PATH = "/mnt/list.json";
    assert.equal(waitlistStorePath(), "/mnt/list.json");
  } finally {
    if (previous === undefined) delete process.env.WAITLIST_STORE_PATH;
    else process.env.WAITLIST_STORE_PATH = previous;
    if (render === undefined) delete process.env.RENDER;
    else process.env.RENDER = render;
  }
});

test("Render refuses a store that sits on the root filesystem", async () => {
  const durable = await storeIsDurable("/tmp/waitlist-emails.json", { RENDER: "true" });
  const root = await stat("/");
  const tmp = await stat("/tmp");
  assert.equal(durable, tmp.dev !== root.dev);
  assert.equal(await storeIsDurable("/tmp/waitlist-emails.json", {}), true);
});

const founder = "josephkocsisan2020@gmail.com";

test("the founder is a default tester and extra env addresses are added", () => {
  assert.deepEqual([...DEFAULT_WAITLIST_TEST_EMAILS], [founder]);
  assert.deepEqual([...waitlistTestEmails({ NODE_ENV: "test" })], [founder]);
  assert.deepEqual(
    [...waitlistTestEmails({ NODE_ENV: "test", WAITLIST_TEST_EMAILS: " Ada@Example.com, bad " })].sort(),
    ["ada@example.com", founder],
  );
  assert.equal(waitlistTestEmails({ NODE_ENV: "test", WAITLIST_TEST_EMAILS: "" }).has(founder), true);
});

test("a tester can submit again, including when seeded, and is not stored", async () => {
  const { dir, filePath } = await tempFile();
  try {
    const store = createWaitlistStore({
      filePath,
      durable: true,
      seedEmails: [founder, "ada@example.com"],
      testEmails: [founder],
    });
    const first = await store.claim({ ...signup, type: "cleaner", name: "John", email: founder });
    assert.equal(first.status, "claimed");
    if (first.status !== "claimed") return;
    assert.equal(first.test, true);
    const confirmed = await store.confirm(founder, first.claimId);
    assert.equal(confirmed.status, "confirmed");
    if (confirmed.status !== "confirmed") return;
    assert.equal(confirmed.test, true);
    assert.equal(confirmed.signup.type, "cleaner");
    assert.equal(confirmed.referral, null);

    const again = await store.claim({ ...signup, email: founder, name: "John" });
    assert.equal(again.status, "claimed");
    if (again.status !== "claimed") return;
    assert.notEqual(again.claimId, first.claimId);
    const customer = await store.confirm(founder, again.claimId);
    assert.equal(customer.status, "confirmed");
    if (customer.status !== "confirmed") return;
    assert.equal(customer.signup.type, "customer");
    assert.equal(customer.referral?.creditsCreated, 0);
    assert.match(customer.referral?.shareUrl ?? "", /^https:\/\/tydlii\.com\/\?ref=/);

    const file = JSON.parse(await readFile(filePath, "utf8")) as {
      entries: Record<string, unknown>;
      credits: unknown[];
    };
    assert.deepEqual(file.entries, {});
    assert.deepEqual(file.credits, []);
    assert.deepEqual(await store.claim({ ...signup, email: "ada@example.com" }), { status: "duplicate" });
    assert.equal(await store.forget(founder), "missing");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a stored tester row is replaced and its referral credits are dropped", async () => {
  const { dir, filePath } = await tempFile();
  try {
    const stored = storeAt(filePath);
    const claimed = await stored.claim({ ...signup, email: founder, name: "John" });
    assert.equal(claimed.status, "claimed");
    if (claimed.status !== "claimed") return;
    const kept = await stored.confirm(founder, claimed.claimId);
    assert.equal(kept.status, "confirmed");
    if (kept.status !== "confirmed" || !kept.referral) return;
    const friend = await stored.claim(
      { ...signup, email: "friend@example.com", name: "Ari Cole" },
      { referralCode: kept.referral.code },
    );
    assert.equal(friend.status, "claimed");
    if (friend.status !== "claimed") return;
    await stored.confirm("friend@example.com", friend.claimId);

    const tester = createWaitlistStore({
      filePath,
      durable: true,
      seedEmails: [founder],
      testEmails: [founder],
    });
    const retry = await tester.claim({ ...signup, type: "cleaner", name: "John", email: founder });
    assert.equal(retry.status, "claimed");
    if (retry.status !== "claimed") return;
    const file = JSON.parse(await readFile(filePath, "utf8")) as {
      entries: Record<string, { pendingUntil: string | null }>;
      credits: { referrerEmail: string; referredEmail: string }[];
    };
    assert.equal(file.entries[founder].pendingUntil !== null, true);
    assert.equal(
      file.credits.some((credit) => credit.referrerEmail === founder || credit.referredEmail === founder),
      false,
    );
    assert.equal((await tester.confirm(founder, retry.claimId)).status, "confirmed");
    const after = JSON.parse(await readFile(filePath, "utf8")) as { entries: Record<string, unknown> };
    assert.equal(founder in after.entries, false);
    assert.equal("friend@example.com" in after.entries, true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the reset script removes one stored address and leaves a seed", async () => {
  const { dir, filePath } = await tempFile();
  const script = path.join(process.cwd(), "scripts", "reset-waitlist-email.mjs");
  try {
    const store = storeAt(filePath);
    const claimed = await store.claim(signup);
    assert.equal(claimed.status, "claimed");
    if (claimed.status !== "claimed") return;
    await store.confirm(signup.email, claimed.claimId);
    const other: WaitlistSignup = { ...signup, email: "jordan@example.com", name: "Jordan Hale" };
    await store.claim(other);

    const removed = spawnSync(process.execPath, [script, "Mina@Example.com"], {
      env: { ...process.env, WAITLIST_STORE_PATH: filePath, WAITLIST_SEED_EMAILS: "ada@example.com", RENDER: "" },
      encoding: "utf8",
    });
    assert.equal(removed.status, 0, removed.stderr);
    assert.match(removed.stdout, /Removed mina@example.com/);

    const seeded = spawnSync(process.execPath, [script, "ada@example.com"], {
      env: { ...process.env, WAITLIST_STORE_PATH: filePath, WAITLIST_SEED_EMAILS: "ada@example.com", RENDER: "" },
      encoding: "utf8",
    });
    assert.equal(seeded.status, 2, seeded.stderr);

    const again = storeAt(filePath);
    assert.equal((await again.claim(signup)).status, "claimed");
    assert.equal((await again.claim(other)).status, "duplicate");

    const founderClaim = await again.claim({ ...signup, email: founder, name: "John" });
    assert.equal(founderClaim.status, "claimed");
    if (founderClaim.status !== "claimed") return;
    await again.confirm(founder, founderClaim.claimId);
    const seededFounder = spawnSync(process.execPath, [script, founder], {
      env: {
        ...process.env,
        WAITLIST_STORE_PATH: filePath,
        WAITLIST_SEED_EMAILS: `${founder},ada@example.com`,
        WAITLIST_TEST_EMAILS: "",
        RENDER: "",
      },
      encoding: "utf8",
    });
    assert.equal(seededFounder.status, 0, seededFounder.stderr);
    assert.match(seededFounder.stdout, new RegExp(`Removed ${founder}`));
    const absent = spawnSync(process.execPath, [script, founder], {
      env: {
        ...process.env,
        WAITLIST_STORE_PATH: filePath,
        WAITLIST_SEED_EMAILS: founder,
        RENDER: "",
      },
      encoding: "utf8",
    });
    assert.equal(absent.status, 0, absent.stderr);
    assert.match(absent.stdout, /Tester addresses can submit again/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
