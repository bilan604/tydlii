import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import {
  REFERRAL_ALPHABET,
  REFERRAL_CODE_LENGTH,
  REFERRAL_CREDIT_CENTS,
  REFERRAL_CREDIT_CURRENCY,
  REFERRAL_FRIEND_DISCOUNT_CENTS,
  applyEarnedCredit,
  decideReferral,
  earnPendingCredits,
  normalizeReferralCode,
  parseCreditList,
  referralManageUrl,
  referralShareUrl,
  type CustomerReferral,
  type ReferralCredit,
} from "./referral";
import type { WaitlistSignup } from "./waitlist";

/**
 * One address for the whole waitlist (customer and cleaner share it).
 * A pending reserve expires so a closed tab can try again. Confirming after
 * Web3Forms accepts removes the expiry.
 */
export const CLAIM_TTL_MS = 15 * 60 * 1000;

const SOURCE = "tydlii.com";

export type StoreEntry = {
  email: string;
  type: WaitlistSignup["type"];
  name: string;
  phone: string;
  neighbourhoods: string[];
  notes: string;
  quote: unknown;
  createdAt: string;
  source: string;
  claimId: string;
  /** ISO time while the browser is still emailing. Null once the signup is kept. */
  pendingUntil: string | null;
  /** Set when a customer signup is kept. Null for cleaners and for rows saved before referrals. */
  referralCode: string | null;
  /** Code the customer submitted. Null when they were not referred, or the code was rejected. */
  referredByCode: string | null;
  /** Referrer email once a code matches a confirmed customer. */
  referredByEmail: string | null;
  /**
   * $25 off this friend's first booking, in cents. Null when they were not
   * referred. This is not an account credit and is not earned after the clean.
   */
  firstCleanDiscountCents: number | null;
};

type StoreFile = {
  version: 1;
  entries: Record<string, StoreEntry>;
  credits: ReferralCredit[];
};

export type ClaimOutcome =
  | { status: "claimed"; claimId: string }
  | { status: "duplicate" }
  | { status: "unavailable" };

export type ConfirmOutcome =
  | { status: "confirmed"; signup: WaitlistSignup; createdAt: string; referral: CustomerReferral | null }
  | { status: "already" }
  | { status: "missing" }
  | { status: "unavailable" };

export type EarnOutcome = { status: "ok"; earned: number } | { status: "invalid" } | { status: "unavailable" };

export type ApplyOutcome =
  | { status: "applied" }
  | { status: "already" }
  | { status: "not-earned" }
  | { status: "missing" }
  | { status: "invalid" }
  | { status: "unavailable" };

export type ReferralLookup =
  | { status: "found"; code: string; name: string }
  | { status: "missing" }
  | { status: "unavailable" };

export type ReleaseOutcome = "released" | "kept" | "missing" | "unavailable";

export type ForgetOutcome = "removed" | "missing" | "seeded" | "unavailable";

export type ForgetAllOutcome = { status: "cleared"; count: number } | { status: "unavailable" };

export type WaitlistStore = {
  claim(signup: WaitlistSignup, meta?: { referralCode?: string | null }): Promise<ClaimOutcome>;
  confirm(email: string, claimId: string): Promise<ConfirmOutcome>;
  release(email: string, claimId: string): Promise<ReleaseOutcome>;
  forget(email: string): Promise<ForgetOutcome>;
  forgetAll(): Promise<ForgetAllOutcome>;
  /**
   * Confirmed customer for a referral code. Does not return the email.
   * Pending reserves are ignored.
   */
  lookupReferral(code: string): Promise<ReferralLookup>;
  /**
   * Move pending credits for this referred email to `earned`.
   * See `earnReferralCreditsForFirstPaidClean` in `lib/referral-credits.ts`.
   * Idempotent: a second call earns 0. Refuses a blank booking id.
   */
  earnFirstPaidClean(email: string, bookingId: string): Promise<EarnOutcome>;
  /**
   * Mark one earned credit applied to an invoice.
   * Refuses `pending` credits. There is no cash path.
   */
  applyReferralCredit(creditId: string, bookingId: string): Promise<ApplyOutcome>;
};

export type StoreOptions = {
  filePath?: string;
  /** When set, used instead of WAITLIST_SEED_EMAILS. */
  seedEmails?: readonly string[];
  now?: () => number;
  /** Skip the Render disk check. Tests pass true. Production leaves this unset. */
  durable?: boolean;
};

const locks = new Map<string, Promise<unknown>>();

function withLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(filePath) ?? Promise.resolve();
  const run = previous.then(fn, fn);
  locks.set(
    filePath,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function parseSeedEmails(raw: string | undefined): Set<string> {
  const out = new Set<string>();
  if (!raw) return out;
  for (const part of raw.split(/[\s,;]+/)) {
    const email = normalizeEmail(part);
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) out.add(email);
  }
  return out;
}

/** Local file, or the Render disk path when the service is running there. */
export function waitlistStorePath(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.WAITLIST_STORE_PATH?.trim();
  if (configured) return configured;
  if (env.RENDER === "true") return "/var/data/waitlist-emails.json";
  return path.join(process.cwd(), "data", "waitlist-emails.json");
}

/**
 * On Render, only a separate mount survives deploys. The root filesystem does not.
 * Locally the project file is enough, so the check is skipped.
 */
export async function storeIsDurable(filePath: string, env?: { RENDER?: string }): Promise<boolean> {
  const render = (env ?? process.env).RENDER;
  if (render !== "true") return true;
  const dirStat = await statExistingAncestor(path.dirname(filePath));
  if (!dirStat) return false;
  const rootStat = await stat("/");
  return dirStat.dev !== rootStat.dev;
}

async function statExistingAncestor(start: string): Promise<{ dev: number } | null> {
  let current = start;
  for (;;) {
    try {
      return await stat(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const parent = path.dirname(current);
      if (parent === current) return null;
      current = parent;
    }
  }
}

function seedsOf(options: StoreOptions): Set<string> {
  if (options.seedEmails) return new Set(options.seedEmails.map((email) => normalizeEmail(email)));
  return parseSeedEmails(process.env.WAITLIST_SEED_EMAILS);
}

function emptyFile(): StoreFile {
  return { version: 1, entries: {}, credits: [] };
}

function randomReferralCode(length = REFERRAL_CODE_LENGTH): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += REFERRAL_ALPHABET[bytes[index] % REFERRAL_ALPHABET.length];
  }
  return code;
}

function uniqueReferralCode(file: StoreFile): string {
  const used = new Set(
    Object.values(file.entries)
      .map((entry) => entry.referralCode)
      .filter((code): code is string => typeof code === "string" && code.length > 0),
  );
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = randomReferralCode();
    if (!used.has(code)) return code;
  }
  const code = randomReferralCode(12);
  return used.has(code) ? `${code}${randomReferralCode(4)}` : code;
}

function confirmedCustomerByCode(file: StoreFile, code: string): StoreEntry | null {
  for (const entry of Object.values(file.entries)) {
    if (entry.type !== "customer" || entry.pendingUntil || entry.referralCode !== code) continue;
    return entry;
  }
  return null;
}

/**
 * Assign this customer's code and, when the friend code is valid, store
 * referredBy, record $25 off their first booking, and open one pending
 * referrer credit. A second credit for the same referred email is refused.
 * Self-referral (same email, same household) is refused. Cleaners never call this.
 */
function attachCustomerReferral(file: StoreFile, current: StoreEntry, at: string): CustomerReferral {
  const code = current.referralCode ?? uniqueReferralCode(file);
  current.referralCode = code;
  const existing = file.credits.filter((credit) => credit.referredEmail === current.email);
  const requested = current.referredByCode ?? "";
  const referrer = requested ? confirmedCustomerByCode(file, requested) : null;
  const decision = decideReferral({
    signupEmail: current.email,
    requestedCode: requested,
    referrerEmail: referrer?.email ?? null,
    alreadyCredited: existing.length > 0,
  });

  if (existing.length > 0) {
    current.referredByEmail = existing[0].referrerEmail;
    current.referredByCode = existing[0].code;
    console.log("[tydlii referral] credit already exists", current.email);
  } else if (!decision.ok) {
    if (decision.reason === "self") console.log("[tydlii referral] blocked self-referral", current.email);
    else if (decision.reason === "unknown" && requested) console.log("[tydlii referral] unknown code", requested);
    current.referredByCode = null;
    current.referredByEmail = null;
  } else {
    current.referredByCode = decision.referredByCode;
    current.referredByEmail = decision.referrerEmail;
    const shared = {
      referredEmail: current.email,
      referrerEmail: decision.referrerEmail,
      code: decision.referredByCode,
      amountCents: REFERRAL_CREDIT_CENTS,
      currency: REFERRAL_CREDIT_CURRENCY,
      status: "pending" as const,
      createdAt: at,
      earnedAt: null,
      appliedAt: null,
      earnedBookingId: null,
      appliedBookingId: null,
    };
    current.firstCleanDiscountCents = REFERRAL_FRIEND_DISCOUNT_CENTS;
    file.credits.push({
      ...shared,
      id: randomUUID(),
      beneficiaryEmail: decision.referrerEmail,
      role: "referrer",
    });
  }

  return {
    code,
    shareUrl: referralShareUrl(code),
    manageUrl: referralManageUrl(code),
    referredByCode: current.referredByCode,
    referredByEmail: current.referredByEmail,
    friendDiscountCents: decision.ok ? REFERRAL_FRIEND_DISCOUNT_CENTS : 0,
    creditsCreated: decision.ok ? 1 : 0,
  };
}

function asEntry(value: unknown): StoreEntry | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Partial<StoreEntry>;
  if (typeof entry.email !== "string" || typeof entry.claimId !== "string") return null;
  if (entry.type !== "customer" && entry.type !== "cleaner") return null;
  if (typeof entry.createdAt !== "string") return null;
  if (entry.pendingUntil !== null && typeof entry.pendingUntil !== "string") return null;
  return {
    email: normalizeEmail(entry.email),
    type: entry.type,
    name: typeof entry.name === "string" ? entry.name : "",
    phone: typeof entry.phone === "string" ? entry.phone : "",
    neighbourhoods: Array.isArray(entry.neighbourhoods)
      ? entry.neighbourhoods.filter((item): item is string => typeof item === "string")
      : [],
    notes: typeof entry.notes === "string" ? entry.notes : "",
    quote: entry.quote ?? null,
    createdAt: entry.createdAt,
    source: typeof entry.source === "string" ? entry.source : SOURCE,
    claimId: entry.claimId,
    pendingUntil: entry.pendingUntil ?? null,
    referralCode: normalizeReferralCode(entry.referralCode) || null,
    referredByCode: normalizeReferralCode(entry.referredByCode) || null,
    referredByEmail: typeof entry.referredByEmail === "string" ? normalizeEmail(entry.referredByEmail) : null,
    firstCleanDiscountCents:
      typeof entry.firstCleanDiscountCents === "number" && entry.firstCleanDiscountCents > 0
        ? entry.firstCleanDiscountCents
        : null,
  };
}

async function load(filePath: string): Promise<StoreFile> {
  let text: string;
  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyFile();
    throw error;
  }
  if (!text.trim()) return emptyFile();
  const data = JSON.parse(text) as Partial<StoreFile>;
  if (!data || data.version !== 1 || !data.entries || typeof data.entries !== "object") {
    throw new Error("invalid waitlist store");
  }
  const credits = parseCreditList(data.credits);
  if (!credits) throw new Error("invalid waitlist store");
  const entries: Record<string, StoreEntry> = {};
  for (const [key, value] of Object.entries(data.entries)) {
    const entry = asEntry(value);
    if (!entry) throw new Error(`invalid waitlist entry: ${key}`);
    entries[entry.email] = entry;
  }
  return { version: 1, entries, credits };
}

async function save(filePath: string, file: StoreFile): Promise<void> {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const handle = await open(tmp, "w", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(file, null, 2)}\n`);
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

function pendingActive(entry: StoreEntry, now: number): boolean {
  if (!entry.pendingUntil) return false;
  const expires = Date.parse(entry.pendingUntil);
  if (Number.isNaN(expires)) return false;
  return expires > now;
}

function toSignup(entry: StoreEntry): WaitlistSignup {
  return {
    type: entry.type,
    name: entry.name,
    email: entry.email,
    phone: entry.phone,
    neighbourhoods: entry.neighbourhoods as WaitlistSignup["neighbourhoods"],
    notes: entry.notes,
    consent: true,
    quote: entry.quote,
  };
}

function snapshot(
  signup: WaitlistSignup,
  claimId: string,
  now: number,
  referralCode: string | null,
): StoreEntry {
  return {
    email: normalizeEmail(signup.email),
    type: signup.type,
    name: signup.name,
    phone: signup.phone,
    neighbourhoods: [...signup.neighbourhoods],
    notes: signup.notes,
    quote: signup.quote ?? null,
    createdAt: new Date(now).toISOString(),
    source: SOURCE,
    claimId,
    pendingUntil: new Date(now + CLAIM_TTL_MS).toISOString(),
    referralCode: null,
    referredByCode: signup.type === "customer" ? referralCode : null,
    referredByEmail: null,
    firstCleanDiscountCents: null,
  };
}

export function createWaitlistStore(options: StoreOptions = {}): WaitlistStore {
  const filePath = () => options.filePath ?? waitlistStorePath();
  const now = () => options.now?.() ?? Date.now();

  async function ensureDurable(target: string): Promise<boolean> {
    if (options.durable === false) return false;
    if (options.durable === true) return true;
    return storeIsDurable(target);
  }

  function logUnavailable(target: string, error?: unknown) {
    console.error(
      "[tydlii waitlist] store unavailable",
      target,
      "On Render, mount a persistent disk and point WAITLIST_STORE_PATH at a file on that disk.",
      error instanceof Error ? error.message : "",
    );
  }

  return {
    async claim(signup, meta) {
      const email = normalizeEmail(signup.email);
      if (seedsOf(options).has(email)) return { status: "duplicate" };
      const target = filePath();
      if (!(await ensureDurable(target))) {
        logUnavailable(target);
        return { status: "unavailable" };
      }
      const referralCode = normalizeReferralCode(meta?.referralCode);
      try {
        return await withLock(target, async () => {
          const file = await load(target);
          const current = file.entries[email];
          if (current && (!current.pendingUntil || pendingActive(current, now()))) {
            console.log("[tydlii waitlist] duplicate", email);
            return { status: "duplicate" } as const;
          }
          const claimId = randomUUID();
          file.entries[email] = snapshot(signup, claimId, now(), referralCode || null);
          await save(target, file);
          return { status: "claimed", claimId } as const;
        });
      } catch (error) {
        logUnavailable(target, error);
        return { status: "unavailable" };
      }
    },

    async confirm(email, claimId) {
      const key = normalizeEmail(email);
      const id = claimId.trim();
      if (seedsOf(options).has(key)) return { status: "already" };
      const target = filePath();
      if (!(await ensureDurable(target))) {
        logUnavailable(target);
        return { status: "unavailable" };
      }
      try {
        return await withLock(target, async () => {
          const file = await load(target);
          const current = file.entries[key];
          if (!current || current.claimId !== id) return { status: "missing" } as const;
          if (!current.pendingUntil) return { status: "already" } as const;
          const at = new Date(now()).toISOString();
          const referral = current.type === "customer" ? attachCustomerReferral(file, current, at) : null;
          current.pendingUntil = null;
          await save(target, file);
          return {
            status: "confirmed",
            signup: toSignup(current),
            createdAt: current.createdAt,
            referral,
          } as const;
        });
      } catch (error) {
        logUnavailable(target, error);
        return { status: "unavailable" };
      }
    },

    async release(email, claimId) {
      const key = normalizeEmail(email);
      const id = claimId.trim();
      if (seedsOf(options).has(key)) return "kept";
      const target = filePath();
      if (!(await ensureDurable(target))) {
        logUnavailable(target);
        return "unavailable";
      }
      try {
        return await withLock(target, async () => {
          const file = await load(target);
          const current = file.entries[key];
          if (!current) return "missing" as const;
          if (current.claimId !== id || !current.pendingUntil) return "kept" as const;
          delete file.entries[key];
          await save(target, file);
          return "released" as const;
        });
      } catch (error) {
        logUnavailable(target, error);
        return "unavailable";
      }
    },

    async forget(email) {
      const key = normalizeEmail(email);
      if (seedsOf(options).has(key)) return "seeded";
      const target = filePath();
      if (!(await ensureDurable(target))) {
        logUnavailable(target);
        return "unavailable";
      }
      try {
        return await withLock(target, async () => {
          const file = await load(target);
          if (!file.entries[key]) return "missing" as const;
          delete file.entries[key];
          await save(target, file);
          return "removed" as const;
        });
      } catch (error) {
        logUnavailable(target, error);
        return "unavailable";
      }
    },

    async forgetAll() {
      const target = filePath();
      if (!(await ensureDurable(target))) {
        logUnavailable(target);
        return { status: "unavailable" };
      }
      try {
        return await withLock(target, async () => {
          const file = await load(target);
          const count = Object.keys(file.entries).length;
          await save(target, emptyFile());
          return { status: "cleared", count } as const;
        });
      } catch (error) {
        logUnavailable(target, error);
        return { status: "unavailable" };
      }
    },

    async lookupReferral(code) {
      const normalized = normalizeReferralCode(code);
      if (!normalized) return { status: "missing" };
      const target = filePath();
      if (!(await ensureDurable(target))) {
        logUnavailable(target);
        return { status: "unavailable" };
      }
      try {
        const file = await load(target);
        const entry = confirmedCustomerByCode(file, normalized);
        if (!entry) return { status: "missing" };
        return { status: "found", code: entry.referralCode ?? normalized, name: entry.name };
      } catch (error) {
        logUnavailable(target, error);
        return { status: "unavailable" };
      }
    },

    async earnFirstPaidClean(email, bookingId) {
      const key = normalizeEmail(email);
      const booking = bookingId.trim();
      if (!key || !booking) return { status: "invalid" };
      const target = filePath();
      if (!(await ensureDurable(target))) {
        logUnavailable(target);
        return { status: "unavailable" };
      }
      try {
        return await withLock(target, async () => {
          const file = await load(target);
          const at = new Date(now()).toISOString();
          const earned = earnPendingCredits(file.credits, key, booking, at);
          if (earned.earned > 0) {
            file.credits = earned.credits;
            await save(target, file);
          }
          return { status: "ok", earned: earned.earned } as const;
        });
      } catch (error) {
        logUnavailable(target, error);
        return { status: "unavailable" };
      }
    },

    async applyReferralCredit(creditId, bookingId) {
      const id = creditId.trim();
      const booking = bookingId.trim();
      if (!id || !booking) return { status: "invalid" };
      const target = filePath();
      if (!(await ensureDurable(target))) {
        logUnavailable(target);
        return { status: "unavailable" };
      }
      try {
        return await withLock(target, async () => {
          const file = await load(target);
          const at = new Date(now()).toISOString();
          const applied = applyEarnedCredit(file.credits, id, booking, at);
          if (applied.result === "applied") {
            file.credits = applied.credits;
            await save(target, file);
          }
          return { status: applied.result } as const;
        });
      } catch (error) {
        logUnavailable(target, error);
        return { status: "unavailable" };
      }
    },
  };
}

export const waitlistStore = createWaitlistStore();
