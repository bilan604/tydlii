import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import type { WaitlistSignup } from "./waitlist";
import {
  CLAIM_TTL_MS,
  createWaitlistStore,
  parseSeedEmails,
  storeIsDurable,
  waitlistStorePath,
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
  return createWaitlistStore({ filePath, durable: true, seedEmails: [], now });
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
    assert.deepEqual(second, { status: "duplicate" });
    const upper = await store.claim({ ...signup, email: "Mina@Example.com" });
    assert.deepEqual(upper, { status: "duplicate" });
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
    assert.deepEqual(await store.claim({ ...signup, type: "cleaner" }), { status: "duplicate" });
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
    assert.deepEqual(await store.claim(signup), { status: "duplicate" });
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
    const store = createWaitlistStore({ filePath, durable: false, seedEmails: [] });
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
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
