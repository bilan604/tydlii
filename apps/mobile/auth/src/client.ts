import { CONTACT_EMAIL } from "../../shared/src/legal";
import {
  AuthError,
  DELETE_ACCOUNT_URL,
  MAGIC_CODE_TTL_MS,
  MAGIC_REPLAY_MS,
  VAULT_KEY,
  assertPassword,
  displayNameFromEmail,
  normalizeEmail,
  normalizeName,
  sameSecret,
  sessionKey,
  utf8Size,
  type AppRole,
  type AuthMethod,
  type AuthProviderName,
  type CryptoPort,
  type DeletionReceipt,
  type KeyValueStore,
  type MagicCode,
  type ProviderIdentity,
  type Session,
} from "./model";

export type SignUpInput = {
  email: string;
  password: string;
  displayName: string;
};

export type PasswordInput = {
  email: string;
  password: string;
};

export type IdentityInput = ProviderIdentity;

export type AuthClient = {
  loadSession(): Promise<Session | null>;
  signUp(input: SignUpInput): Promise<Session>;
  signInWithPassword(input: PasswordInput): Promise<Session>;
  signInWithIdentity(input: IdentityInput): Promise<Session>;
  requestMagicCode(input: { email: string }): Promise<MagicCode>;
  redeemMagicCode(input: { email: string; code: string }): Promise<Session>;
  switchRole(next: AppRole): Promise<Session>;
  signOut(): Promise<void>;
  deleteAccount(input: { confirmed: boolean }): Promise<DeletionReceipt>;
};

type IdentityLink = {
  provider: AuthProviderName;
  subject: string;
};

type AccountRecord = {
  id: string;
  email: string;
  displayName: string;
  passwordSalt: string | null;
  passwordHash: string | null;
  identities: IdentityLink[];
  roles: AppRole[];
  createdAt: string;
};

const SUBJECT = /^[A-Za-z0-9._-]{1,256}$/;

function readIdentities(value: unknown): IdentityLink[] {
  if (!Array.isArray(value)) return [];
  const links: IdentityLink[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const provider = (item as { provider?: unknown }).provider;
    const subject = (item as { subject?: unknown }).subject;
    if ((provider !== "google" && provider !== "apple") || typeof subject !== "string") continue;
    if (!SUBJECT.test(subject)) continue;
    if (links.some((link) => link.provider === provider && link.subject === subject)) continue;
    links.push({ provider, subject });
  }
  return links;
}

type ChallengeRecord = {
  email: string;
  salt: string;
  codeHash: string;
  expiresAt: number;
  consumedAt: number | null;
  sessionToken: string | null;
  role: AppRole;
};

type Vault = {
  v: 1;
  accounts: AccountRecord[];
  challenges: ChallengeRecord[];
};

const DELETION_DETAIL = `Not sent. No account API was called. This device's copy of the account was removed, including customer and cleaner on this email. To ask Tydlii to delete records it holds, email ${CONTACT_EMAIL}. Deletion section: ${DELETE_ACCOUNT_URL}`;

const VAULT_FULL =
  "This device's local account store is full. A server is required before more accounts can be saved here.";

export function createAuthClient(options: {
  store: KeyValueStore;
  crypto: CryptoPort;
  role: AppRole;
  now?: () => number;
  valueLimit?: number;
}): AuthClient {
  const { store, crypto, role } = options;
  const now = options.now ?? (() => Date.now());
  const valueLimit = options.valueLimit ?? 2048;
  const sessionStorageKey = sessionKey(role);
  const redeeming = new Map<string, Promise<Session>>();

  function emptyVault(): Vault {
    return { v: 1, accounts: [], challenges: [] };
  }

  async function loadVault(): Promise<Vault> {
    const raw = await store.get(VAULT_KEY);
    if (!raw) return emptyVault();
    try {
      const parsed = JSON.parse(raw) as Partial<Vault>;
      if (parsed.v !== 1 || !Array.isArray(parsed.accounts) || !Array.isArray(parsed.challenges)) {
        return emptyVault();
      }
      return {
        v: 1,
        accounts: parsed.accounts.map((account) => ({
          ...account,
          identities: readIdentities(account.identities),
        })),
        challenges: parsed.challenges,
      };
    } catch {
      return emptyVault();
    }
  }

  function prune(vault: Vault): Vault {
    const time = now();
    return {
      v: 1,
      accounts: vault.accounts,
      challenges: vault.challenges.filter((item) => {
        if (item.consumedAt == null) return item.expiresAt > time;
        return time - item.consumedAt <= MAGIC_REPLAY_MS;
      }),
    };
  }

  function assertFits(value: string): void {
    if (utf8Size(value) > valueLimit) throw new AuthError("vault_too_large", VAULT_FULL);
  }

  async function commit(vault: Vault, session: Session | null): Promise<void> {
    const vaultJson = JSON.stringify(prune(vault));
    assertFits(vaultJson);
    const sessionJson = session ? JSON.stringify(session) : null;
    if (sessionJson) assertFits(sessionJson);
    await store.set(VAULT_KEY, vaultJson);
    if (sessionJson) await store.set(sessionStorageKey, sessionJson);
  }

  function withRole(account: AccountRecord): AccountRecord {
    const identities = account.identities ?? [];
    const next = identities === account.identities ? account : { ...account, identities };
    if (next.roles.includes(role)) return next;
    return { ...next, roles: [...next.roles, role] };
  }

  function findByIdentity(vault: Vault, provider: AuthProviderName, subject: string): AccountRecord | undefined {
    return vault.accounts.find((item) =>
      item.identities.some((link) => link.provider === provider && link.subject === subject),
    );
  }

  async function hashPassword(password: string, salt: string): Promise<string> {
    return crypto.digest(`tydlii.password.v1:${salt}:${password}`);
  }

  async function hashCode(email: string, code: string, salt: string): Promise<string> {
    return crypto.digest(`tydlii.magic.v1:${salt}:${email}:${code}`);
  }

  async function buildSession(
    account: AccountRecord,
    method: AuthMethod,
    signedInAs: AppRole = role,
  ): Promise<Session> {
    return {
      v: 1,
      accountId: account.id,
      email: account.email,
      displayName: account.displayName,
      roles: account.roles,
      signedInAs,
      method,
      token: `tok_${await crypto.random(32)}`,
      issuedAt: new Date(now()).toISOString(),
    };
  }

  function readSession(raw: string): Session | null {
    try {
      const parsed = JSON.parse(raw) as Partial<Session>;
      if (parsed.v !== 1 || (parsed.signedInAs !== "customer" && parsed.signedInAs !== "cleaner")) return null;
      if (typeof parsed.accountId !== "string" || typeof parsed.email !== "string") return null;
      if (typeof parsed.token !== "string" || typeof parsed.displayName !== "string") return null;
      if (
        parsed.method !== "password" &&
        parsed.method !== "magic-link" &&
        parsed.method !== "google" &&
        parsed.method !== "apple"
      ) {
        return null;
      }
      if (!Array.isArray(parsed.roles) || typeof parsed.issuedAt !== "string") return null;
      return parsed as Session;
    } catch {
      return null;
    }
  }

  function findAccount(vault: Vault, email: string): AccountRecord | undefined {
    return vault.accounts.find((item) => item.email === email);
  }

  function replaceAccount(vault: Vault, account: AccountRecord): Vault {
    const exists = vault.accounts.some((item) => item.id === account.id);
    return {
      ...vault,
      accounts: exists
        ? vault.accounts.map((item) => (item.id === account.id ? account : item))
        : [...vault.accounts, account],
    };
  }

  async function loadSession(): Promise<Session | null> {
    const raw = await store.get(sessionStorageKey);
    if (!raw) return null;
    const parsed = readSession(raw);
    if (!parsed) {
      await store.remove(sessionStorageKey);
      return null;
    }
    const vault = await loadVault();
    const account = findAccount(vault, parsed.email);
    if (!account || account.id !== parsed.accountId) {
      await store.remove(sessionStorageKey);
      return null;
    }
    const refreshed: Session = {
      ...parsed,
      email: account.email,
      displayName: account.displayName,
      roles: account.roles,
    };
    if (JSON.stringify(refreshed) !== JSON.stringify(parsed)) {
      const sessionJson = JSON.stringify(refreshed);
      assertFits(sessionJson);
      await store.set(sessionStorageKey, sessionJson);
    }
    return refreshed;
  }

  async function signUp(input: SignUpInput): Promise<Session> {
    const email = normalizeEmail(input.email);
    const displayName = normalizeName(input.displayName);
    assertPassword(input.password);
    const vault = await loadVault();
    const existing = findAccount(vault, email);
    if (existing?.passwordHash) {
      throw new AuthError("email_taken", "This email already has a password on this device. Sign in.");
    }
    const salt = existing?.passwordSalt ?? (await crypto.random(16));
    const passwordHash = await hashPassword(input.password, salt);
    const account: AccountRecord = existing
      ? withRole({ ...existing, displayName, passwordSalt: salt, passwordHash })
      : {
          id: `acc_${await crypto.random(16)}`,
          email,
          displayName,
          passwordSalt: salt,
          passwordHash,
          identities: [],
          roles: [role],
          createdAt: new Date(now()).toISOString(),
        };
    const session = await buildSession(account, "password");
    await commit(replaceAccount(vault, account), session);
    return session;
  }

  async function signInWithPassword(input: PasswordInput): Promise<Session> {
    const email = normalizeEmail(input.email);
    assertPassword(input.password);
    const vault = await loadVault();
    const existing = findAccount(vault, email);
    if (!existing) {
      throw new AuthError(
        "unknown_account",
        "No account on this device for that email. Create one, or use an email code.",
      );
    }
    if (!existing.passwordHash || !existing.passwordSalt) {
      if (existing.identities.length > 0) {
        throw new AuthError(
          "needs_code",
          "This email uses Google or Apple on this device. Continue with that provider.",
        );
      }
      throw new AuthError("needs_code", "This email uses a sign-in code on this device.");
    }
    const passwordHash = await hashPassword(input.password, existing.passwordSalt);
    if (!sameSecret(passwordHash, existing.passwordHash)) {
      throw new AuthError("wrong_password", "That password does not match this device's account.");
    }
    const account = withRole(existing);
    const session = await buildSession(account, "password");
    await commit(replaceAccount(vault, account), session);
    return session;
  }

  async function requestMagicCode(input: { email: string }): Promise<MagicCode> {
    const email = normalizeEmail(input.email);
    const vault = await loadVault();
    let account = findAccount(vault, email);
    if (!account) {
      account = {
        id: `acc_${await crypto.random(16)}`,
        email,
        displayName: displayNameFromEmail(email),
        passwordSalt: null,
        passwordHash: null,
        identities: [],
        roles: [role],
        createdAt: new Date(now()).toISOString(),
      };
    } else {
      account = withRole(account);
    }
    const salt = await crypto.random(16);
    const bytes = await crypto.random(4);
    const parsed = Number.parseInt(bytes.slice(0, 8), 16);
    const code = (Number.isFinite(parsed) ? parsed % 1_000_000 : 0).toString().padStart(6, "0");
    const challenge: ChallengeRecord = {
      email,
      salt,
      codeHash: await hashCode(email, code, salt),
      expiresAt: now() + MAGIC_CODE_TTL_MS,
      consumedAt: null,
      sessionToken: null,
      role,
    };
    const next: Vault = {
      ...replaceAccount(vault, account),
      challenges: [...vault.challenges.filter((item) => item.email !== email), challenge],
    };
    await commit(next, null);
    return { email, code, expiresAt: new Date(challenge.expiresAt).toISOString() };
  }

  async function redeemOnce(input: { email: string; code: string }): Promise<Session> {
    const email = normalizeEmail(input.email);
    const code = input.code.trim();
    if (!/^\d{6}$/.test(code)) throw new AuthError("invalid_code", "Enter the 6-digit code.");
    const vault = await loadVault();
    const challenge = vault.challenges.find((item) => item.email === email);
    if (!challenge) throw new AuthError("invalid_code", "That code does not match. Request a new one.");
    const time = now();
    if (challenge.consumedAt != null) {
      const current = await loadSession();
      if (
        time - challenge.consumedAt <= MAGIC_REPLAY_MS &&
        current &&
        current.token === challenge.sessionToken
      ) {
        return current;
      }
      throw new AuthError("invalid_code", "That code was already used. Request a new one.");
    }
    if (challenge.expiresAt <= time) {
      throw new AuthError("expired_code", "That code expired. Request a new one.");
    }
    const codeHash = await hashCode(email, code, challenge.salt);
    if (!sameSecret(codeHash, challenge.codeHash)) {
      throw new AuthError("invalid_code", "That code does not match. Request a new one.");
    }
    const existing = findAccount(vault, email);
    if (!existing) throw new AuthError("unknown_account", "No account on this device for that email.");
    const account = withRole(existing);
    const session = await buildSession(account, "magic-link");
    const consumed: ChallengeRecord = { ...challenge, consumedAt: time, sessionToken: session.token };
    await commit(
      {
        ...replaceAccount(vault, account),
        challenges: vault.challenges.map((item) => (item.email === email ? consumed : item)),
      },
      session,
    );
    return session;
  }

  async function signInWithIdentity(input: IdentityInput): Promise<Session> {
    if (input.provider !== "google" && input.provider !== "apple") {
      throw new AuthError("invalid_identity", "Choose Google or Apple.");
    }
    const subject = input.subject.trim();
    if (!SUBJECT.test(subject)) {
      throw new AuthError("invalid_identity", "The provider did not return a usable account id.");
    }
    const email = input.email ? normalizeEmail(input.email) : null;
    if (email && !input.emailVerified) {
      throw new AuthError("unverified_email", "That provider has not confirmed this email.");
    }
    const displayName = input.displayName?.trim() ? normalizeName(input.displayName) : null;
    const vault = await loadVault();
    const linked = findByIdentity(vault, input.provider, subject);
    if (linked && email && linked.email !== email) {
      throw new AuthError("invalid_identity", "This provider is already linked to a different email on this device.");
    }
    let account = linked ?? (email ? findAccount(vault, email) : undefined);
    if (!account && !email) {
      throw new AuthError(
        "missing_email",
        "The provider did not share an email. Try again, or use email on this device.",
      );
    }
    if (!account && email) {
      account = {
        id: `acc_${await crypto.random(16)}`,
        email,
        displayName: displayName ?? displayNameFromEmail(email),
        passwordSalt: null,
        passwordHash: null,
        identities: [{ provider: input.provider, subject }],
        roles: [role],
        createdAt: new Date(now()).toISOString(),
      };
    } else if (account) {
      const identities = account.identities.some((item) => item.provider === input.provider && item.subject === subject)
        ? account.identities
        : [...account.identities, { provider: input.provider, subject }];
      const nextName =
        displayName && (account.displayName === displayNameFromEmail(account.email) || account.displayName === "Tydlii")
          ? displayName
          : account.displayName;
      account = withRole({ ...account, identities, displayName: nextName });
    }
    if (!account) {
      throw new AuthError("missing_email", "The provider did not share an email. Try again, or use email on this device.");
    }
    const session = await buildSession(account, input.provider);
    await commit(replaceAccount(vault, account), session);
    return session;
  }

  function redeemMagicCode(input: { email: string; code: string }): Promise<Session> {
    let email = input.email;
    try {
      email = normalizeEmail(input.email);
    } catch (error) {
      return Promise.reject(error);
    }
    const key = `${email}:${input.code.trim()}`;
    const pending = redeeming.get(key);
    if (pending) return pending;
    const promise = redeemOnce(input).finally(() => {
      redeeming.delete(key);
    });
    redeeming.set(key, promise);
    return promise;
  }

  async function switchRole(next: AppRole): Promise<Session> {
    if (next !== "customer" && next !== "cleaner") {
      throw new AuthError("invalid_name", "Choose customer or cleaner.");
    }
    const current = await loadSession();
    if (!current) throw new AuthError("no_session", "Sign in before switching.");
    const vault = await loadVault();
    const existing = findAccount(vault, current.email);
    if (!existing || existing.id !== current.accountId) {
      throw new AuthError("unknown_account", "No account on this device for that email.");
    }
    const account = existing.roles.includes(next)
      ? existing
      : { ...existing, roles: [...existing.roles, next] };
    const session: Session = {
      ...current,
      displayName: account.displayName,
      email: account.email,
      roles: account.roles,
      signedInAs: next,
    };
    await commit(replaceAccount(vault, account), session);
    return session;
  }

  async function signOut(): Promise<void> {
    await store.remove(sessionStorageKey);
  }

  async function deleteAccount(input: { confirmed: boolean }): Promise<DeletionReceipt> {
    if (!input.confirmed) throw new AuthError("not_confirmed", "Confirm deletion to continue.");
    const session = await loadSession();
    if (!session) throw new AuthError("no_session", "Sign in before deleting an account.");
    const vault = await loadVault();
    const next: Vault = {
      v: 1,
      accounts: vault.accounts.filter((item) => item.email !== session.email),
      challenges: vault.challenges.filter((item) => item.email !== session.email),
    };
    const vaultJson = JSON.stringify(prune(next));
    assertFits(vaultJson);
    await store.set(VAULT_KEY, vaultJson);
    await store.remove(sessionStorageKey);
    return {
      status: "not_sent",
      localCleared: true,
      email: session.email,
      signedInAs: session.signedInAs,
      requestedAt: new Date(now()).toISOString(),
      detail: DELETION_DETAIL,
    };
  }

  return {
    loadSession,
    signUp,
    signInWithPassword,
    signInWithIdentity,
    requestMagicCode,
    redeemMagicCode,
    switchRole,
    signOut,
    deleteAccount,
  };
}
