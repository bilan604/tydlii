import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createAuthClient } from "./client";
import {
  AuthError,
  MAGIC_CODE_TTL_MS,
  MAGIC_REPLAY_MS,
  SECURE_STORE_VALUE_LIMIT,
  VAULT_KEY,
  memoryStore,
  resolveAuthMode,
  sessionKey,
  withQuery,
  type CryptoPort,
} from "./model";

function nodeCrypto(): CryptoPort {
  return {
    async digest(value) {
      return createHash("sha256").update(value).digest("hex");
    },
    async random(bytes) {
      return randomBytes(bytes).toString("hex");
    },
  };
}

function client(role: "customer" | "cleaner" = "customer", extras: Record<string, unknown> = {}) {
  const store = memoryStore();
  const auth = createAuthClient({
    store,
    crypto: nodeCrypto(),
    role,
    ...extras,
  });
  return { store, auth };
}

test("sign up normalizes the email and keeps the password out of the vault", async () => {
  const { store, auth } = client();
  const session = await auth.signUp({
    email: "  Ada@Example.com ",
    password: "password1",
    displayName: "  Ada   Lovelace ",
  });
  assert.equal(session.email, "ada@example.com");
  assert.equal(session.displayName, "Ada Lovelace");
  assert.equal(session.signedInAs, "customer");
  assert.deepEqual(session.roles, ["customer"]);
  assert.equal(session.method, "password");
  const restored = await auth.loadSession();
  assert.equal(restored?.token, session.token);
  const vault = store.dump()[VAULT_KEY] ?? "";
  assert.equal(vault.includes("password1"), false);
  assert.match(vault, /passwordHash/);
  assert.ok(utf8Of(JSON.stringify(session)) < SECURE_STORE_VALUE_LIMIT);
});

test("rejects a bad email, a short password, a wrong password, and a second password", async () => {
  const { auth } = client();
  await assert.rejects(() => auth.signUp({ email: "not-an-email", password: "password1", displayName: "Ada" }), (error) => {
    assert.ok(error instanceof AuthError);
    assert.equal(error.code, "invalid_email");
    return true;
  });
  await assert.rejects(() => auth.signUp({ email: "ada@example.com", password: "short", displayName: "Ada" }), (error) => {
    assert.ok(error instanceof AuthError);
    assert.equal(error.code, "weak_password");
    return true;
  });
  await auth.signUp({ email: "ada@example.com", password: "password1", displayName: "Ada" });
  await assert.rejects(
    () => auth.signInWithPassword({ email: "ada@example.com", password: "password2" }),
    (error) => {
      assert.ok(error instanceof AuthError);
      assert.equal(error.code, "wrong_password");
      return true;
    },
  );
  await assert.rejects(
    () => auth.signUp({ email: "ada@example.com", password: "password1", displayName: "Ada" }),
    (error) => {
      assert.ok(error instanceof AuthError);
      assert.equal(error.code, "email_taken");
      return true;
    },
  );
});

test("sign out keeps the account and a later sign-in restores a session", async () => {
  const { store, auth } = client();
  await auth.signUp({ email: "ada@example.com", password: "password1", displayName: "Ada" });
  await auth.signOut();
  assert.equal(await auth.loadSession(), null);
  assert.equal(store.dump()[sessionKey("customer")], undefined);
  assert.match(store.dump()[VAULT_KEY] ?? "", /ada@example.com/);
  const again = await auth.signInWithPassword({ email: "ada@example.com", password: "password1" });
  assert.equal(again.email, "ada@example.com");
  assert.equal((await auth.loadSession())?.accountId, again.accountId);
});

test("an email code signs in, replays once, then expires", async () => {
  let now = 1_700_000_000_000;
  const { auth } = client("customer", { now: () => now });
  const issued = await auth.requestMagicCode({ email: "Mina@Example.com" });
  assert.match(issued.code, /^\d{6}$/);
  await assert.rejects(() => auth.redeemMagicCode({ email: issued.email, code: "000000" }), (error) => {
    assert.ok(error instanceof AuthError);
    assert.equal(error.code, "invalid_code");
    return true;
  });
  const session = await auth.redeemMagicCode({ email: issued.email, code: issued.code });
  assert.equal(session.method, "magic-link");
  assert.equal(session.displayName, "mina");
  const replay = await auth.redeemMagicCode({ email: issued.email, code: issued.code });
  assert.equal(replay.token, session.token);
  now += MAGIC_REPLAY_MS + 1;
  await assert.rejects(() => auth.redeemMagicCode({ email: issued.email, code: issued.code }), (error) => {
    assert.ok(error instanceof AuthError);
    assert.equal(error.code, "invalid_code");
    return true;
  });
});

test("an unused email code expires", async () => {
  let now = 1_700_000_000_000;
  const { auth } = client("cleaner", { now: () => now });
  const issued = await auth.requestMagicCode({ email: "mina@example.com" });
  now += MAGIC_CODE_TTL_MS + 1;
  await assert.rejects(() => auth.redeemMagicCode({ email: issued.email, code: issued.code }), (error) => {
    assert.ok(error instanceof AuthError);
    assert.equal(error.code, "expired_code");
    return true;
  });
});

test("the same vault adds the cleaner role without a second account", async () => {
  const store = memoryStore();
  const customer = createAuthClient({ store, crypto: nodeCrypto(), role: "customer" });
  const cleaner = createAuthClient({ store, crypto: nodeCrypto(), role: "cleaner" });
  const created = await customer.signUp({
    email: "ada@example.com",
    password: "password1",
    displayName: "Ada",
  });
  const cleanerSession = await cleaner.signInWithPassword({
    email: "Ada@Example.com",
    password: "password1",
  });
  assert.equal(cleanerSession.signedInAs, "cleaner");
  assert.deepEqual(cleanerSession.roles, ["customer", "cleaner"]);
  const customerSession = await customer.loadSession();
  assert.equal(customerSession?.token, created.token);
  assert.deepEqual(customerSession?.roles, ["customer", "cleaner"]);
  assert.equal(store.dump()[sessionKey("customer")]?.includes(created.token), true);
  const accounts = JSON.parse(store.dump()[VAULT_KEY] ?? "{}").accounts as unknown[];
  assert.equal(accounts.length, 1);
});

test("a code-only account can add a password from sign-up", async () => {
  const { auth } = client();
  const issued = await auth.requestMagicCode({ email: "ada@example.com" });
  await auth.redeemMagicCode({ email: issued.email, code: issued.code });
  await auth.signOut();
  await assert.rejects(
    () => auth.signInWithPassword({ email: "ada@example.com", password: "password1" }),
    (error) => {
      assert.ok(error instanceof AuthError);
      assert.equal(error.code, "needs_code");
      return true;
    },
  );
  const session = await auth.signUp({
    email: "ada@example.com",
    password: "password1",
    displayName: "Ada Lovelace",
  });
  assert.equal(session.method, "password");
  assert.equal(session.displayName, "Ada Lovelace");
  await auth.signOut();
  const signedIn = await auth.signInWithPassword({ email: "ada@example.com", password: "password1" });
  assert.equal(signedIn.accountId, session.accountId);
});

test("delete account stays on the device and is not sent", async () => {
  const { store, auth } = client();
  await auth.signUp({ email: "ada@example.com", password: "password1", displayName: "Ada" });
  await assert.rejects(() => auth.deleteAccount({ confirmed: false }), (error) => {
    assert.ok(error instanceof AuthError);
    assert.equal(error.code, "not_confirmed");
    return true;
  });
  assert.match(store.dump()[VAULT_KEY] ?? "", /ada@example.com/);
  const receipt = await auth.deleteAccount({ confirmed: true });
  assert.equal(receipt.status, "not_sent");
  assert.equal(receipt.localCleared, true);
  assert.match(receipt.detail, /^Not sent\./);
  assert.equal(await auth.loadSession(), null);
  assert.equal(JSON.parse(store.dump()[VAULT_KEY] ?? "{}").accounts.length, 0);
  await assert.rejects(
    () => auth.signInWithPassword({ email: "ada@example.com", password: "password1" }),
    (error) => {
      assert.ok(error instanceof AuthError);
      assert.equal(error.code, "unknown_account");
      return true;
    },
  );
});

test("a full local vault is refused without replacing the saved account", async () => {
  const { store, auth } = client("customer", { valueLimit: 420 });
  await auth.signUp({ email: "ada@example.com", password: "password1", displayName: "Ada" });
  const before = store.dump()[VAULT_KEY];
  await assert.rejects(
    () => auth.signUp({ email: "mina@example.com", password: "password1", displayName: "Mina" }),
    (error) => {
      assert.ok(error instanceof AuthError);
      assert.equal(error.code, "vault_too_large");
      return true;
    },
  );
  assert.equal(store.dump()[VAULT_KEY], before);
  assert.equal((await auth.loadSession())?.email, "ada@example.com");
});

test("the same account switches between customer and cleaner", async () => {
  const { auth } = client();
  const created = await auth.signUp({
    email: "ada@example.com",
    password: "password1",
    displayName: "Ada",
  });
  const cleaner = await auth.switchRole("cleaner");
  assert.equal(cleaner.accountId, created.accountId);
  assert.equal(cleaner.token, created.token);
  assert.equal(cleaner.signedInAs, "cleaner");
  assert.deepEqual(cleaner.roles, ["customer", "cleaner"]);
  const loaded = await auth.loadSession();
  assert.equal(loaded?.signedInAs, "cleaner");
  const back = await auth.switchRole("customer");
  assert.equal(back.signedInAs, "customer");
  assert.deepEqual(back.roles, ["customer", "cleaner"]);
});

test("deletion points at the live privacy section and is not sent", async () => {
  const { auth } = client();
  await auth.signUp({ email: "ada@example.com", password: "password1", displayName: "Ada" });
  await auth.switchRole("cleaner");
  const receipt = await auth.deleteAccount({ confirmed: true });
  assert.equal(receipt.status, "not_sent");
  assert.equal(receipt.signedInAs, "cleaner");
  assert.match(receipt.detail, /https:\/\/tydlii.com\/privacy#delete-account/);
});

test("hosted sign-in stays off unless both env values are set", () => {
  assert.deepEqual(resolveAuthMode({}), { mode: "local", misconfigured: false });
  assert.deepEqual(resolveAuthMode({ issuer: " ", clientId: "" }), { mode: "local", misconfigured: false });
  assert.deepEqual(resolveAuthMode({ issuer: "https://auth.example.com" }), {
    mode: "local",
    misconfigured: true,
  });
  assert.deepEqual(
    resolveAuthMode({ issuer: "https://auth.example.com", clientId: "tydlii" }),
    {
      mode: "hosted",
      issuer: "https://auth.example.com",
      clientId: "tydlii",
      scopes: ["openid", "email", "profile"],
    },
  );
});

test("magic redirect keeps the scheme and encodes the email", () => {
  assert.equal(
    withQuery("tydlii-customer://auth/callback", { email: "a@b.co", code: "123456" }),
    "tydlii-customer://auth/callback?email=a%40b.co&code=123456",
  );
  assert.equal(
    withQuery("https://localhost:8081/auth/callback?from=app", { code: "123456" }),
    "https://localhost:8081/auth/callback?from=app&code=123456",
  );
});

test("auth source does not request location or call an account API", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
  const files = await walk(root);
  const banned = [
    "expo-location",
    "requestForegroundPermissionsAsync",
    "NSLocation",
    "ACCESS_FINE_LOCATION",
    "ACCESS_COARSE_LOCATION",
    "ACCESS_BACKGROUND_LOCATION",
  ];
  for (const file of files) {
    if (file.endsWith("auth.test.ts")) continue;
    const source = await readFile(file, "utf8");
    for (const phrase of banned) assert.equal(source.includes(phrase), false, `${file} mentions ${phrase}`);
  }
  const clientSource = await readFile(path.join(root, "client.ts"), "utf8");
  assert.equal(clientSource.includes("fetch("), false);
  assert.match(clientSource, /status: "not_sent"/);
});

function utf8Of(value: string): number {
  return Buffer.byteLength(value);
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) files.push(full);
  }
  return files;
}
