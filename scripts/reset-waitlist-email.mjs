/**
 * Remove addresses from the waitlist JSON file.
 * Seeded addresses live in WAITLIST_SEED_EMAILS and are not changed here.
 *
 *   node scripts/reset-waitlist-email.mjs person@example.com
 *   node scripts/reset-waitlist-email.mjs --all
 *
 * On Render, run this in the service shell. A one-off job cannot see the disk.
 */
import { mkdir, open, readFile, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function storePath() {
  const configured = process.env.WAITLIST_STORE_PATH?.trim();
  if (configured) return configured;
  if (process.env.RENDER === "true") return "/var/data/waitlist-emails.json";
  return path.join(process.cwd(), "data", "waitlist-emails.json");
}

function normalize(email) {
  return email.trim().toLowerCase();
}

function seedSet() {
  const out = new Set();
  const raw = process.env.WAITLIST_SEED_EMAILS ?? "";
  for (const part of raw.split(/[\s,;]+/)) {
    const email = normalize(part);
    if (EMAIL.test(email)) out.add(email);
  }
  return out;
}

async function durable(filePath) {
  if (process.env.RENDER !== "true") return true;
  let current = path.dirname(filePath);
  let dirStat = null;
  for (;;) {
    try {
      dirStat = await stat(current);
      break;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      const parent = path.dirname(current);
      if (parent === current) return false;
      current = parent;
    }
  }
  const rootStat = await stat("/");
  return dirStat.dev !== rootStat.dev;
}

async function readStore(filePath) {
  try {
    const text = await readFile(filePath, "utf8");
    if (!text.trim()) return { version: 1, entries: {} };
    const data = JSON.parse(text);
    if (!data || data.version !== 1 || !data.entries || typeof data.entries !== "object") {
      throw new Error("invalid waitlist store");
    }
    return data;
  } catch (error) {
    if (error?.code === "ENOENT") return { version: 1, entries: {} };
    throw error;
  }
}

async function writeStore(filePath, data) {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  const handle = await open(tmp, "w", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(data, null, 2)}\n`);
    await handle.sync();
  } catch (error) {
    await handle.close();
    await unlink(tmp).catch(() => undefined);
    throw error;
  }
  await handle.close();
  try {
    await rename(tmp, filePath);
  } catch (error) {
    await unlink(tmp).catch(() => undefined);
    throw error;
  }
}

const arg = process.argv[2]?.trim();
const filePath = storePath();

if (!arg) {
  console.error("Usage: node scripts/reset-waitlist-email.mjs person@example.com");
  console.error("       node scripts/reset-waitlist-email.mjs --all");
  console.error(`Store: ${filePath}`);
  process.exit(1);
}

if (!(await durable(filePath))) {
  console.error(
    `Refusing to edit ${filePath}. On Render the file must sit on the persistent disk mounted at /var/data.`,
  );
  process.exit(1);
}

let data;
try {
  data = await readStore(filePath);
} catch (error) {
  console.error(`Could not read ${filePath}.`, error instanceof Error ? error.message : "");
  process.exit(1);
}

if (arg === "--all") {
  const count = Object.keys(data.entries).length;
  try {
    await writeStore(filePath, { version: 1, entries: {} });
  } catch (error) {
    console.error(`Could not clear ${filePath}.`, error instanceof Error ? error.message : "");
    process.exit(1);
  }
  console.log(
    `Cleared ${count} stored email${count === 1 ? "" : "s"} from ${filePath}. Addresses in WAITLIST_SEED_EMAILS were not changed.`,
  );
  process.exit(0);
}

const email = normalize(arg);
if (!EMAIL.test(email)) {
  console.error("Pass one email address, or --all.");
  process.exit(1);
}

if (seedSet().has(email)) {
  console.error(
    `${email} is in WAITLIST_SEED_EMAILS. Remove it from the environment and redeploy. The file was not changed.`,
  );
  process.exit(2);
}

const key = Object.keys(data.entries).find((item) => normalize(item) === email);
if (!key) {
  console.log(`${email} was not in ${filePath}.`);
  process.exit(0);
}

delete data.entries[key];
let dropped = 0;
if (Array.isArray(data.credits)) {
  data.credits = data.credits.filter((credit) => {
    if (!credit || typeof credit !== "object" || credit.referredEmail !== email) return true;
    dropped += 1;
    return false;
  });
}
try {
  await writeStore(filePath, data);
} catch (error) {
  console.error(`Could not update ${filePath}.`, error instanceof Error ? error.message : "");
  process.exit(1);
}
console.log(
  `Removed ${email} from ${filePath}.${
    dropped ? ` Dropped ${dropped} referral credit${dropped === 1 ? "" : "s"} for that referred email.` : ""
  }`,
);
