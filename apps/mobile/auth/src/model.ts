export type AppRole = "customer" | "cleaner";

export type AuthMethod = "password" | "magic-link";

export const brand = {
  ink: "#070707",
  teal: "#04a3ac",
  sage: "#5c9396",
  mist: "#e5f3f4",
  white: "#ffffff",
} as const;

export const VAULT_KEY = "tydlii.auth.vault.v1";

/** Live privacy page. The in-app delete control links here and does not call an API. */
export const DELETE_ACCOUNT_URL = "https://tydlii.com/privacy#delete-account";

/** Web redirects can reload the page. The sign-out and deletion lines live here for that reload. */
export const NOTICE_STORAGE_KEY = "tydlii.auth.notice.v1";

export function sessionKey(role: AppRole): string {
  return `tydlii.auth.session.v1.${role}`;
}

/** iOS SecureStore rejects a value larger than this. The local vault is one value. */
export const SECURE_STORE_VALUE_LIMIT = 2048;

export const MAGIC_CODE_TTL_MS = 15 * 60 * 1000;

/** Second redeem of the same code, so the redirect screen can retry once. */
export const MAGIC_REPLAY_MS = 30 * 1000;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export type Session = {
  v: 1;
  accountId: string;
  email: string;
  displayName: string;
  roles: AppRole[];
  signedInAs: AppRole;
  method: AuthMethod;
  token: string;
  issuedAt: string;
};

export type DeletionReceipt = {
  status: "not_sent";
  localCleared: true;
  email: string;
  signedInAs: AppRole;
  requestedAt: string;
  detail: string;
};

export type MagicCode = {
  email: string;
  code: string;
  expiresAt: string;
};

export type AuthErrorCode =
  | "invalid_email"
  | "invalid_name"
  | "weak_password"
  | "wrong_password"
  | "unknown_account"
  | "needs_code"
  | "email_taken"
  | "invalid_code"
  | "expired_code"
  | "not_confirmed"
  | "no_session"
  | "vault_too_large"
  | "unavailable";

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL.test(trimmed)) {
    throw new AuthError("invalid_email", "Enter a valid email address.");
  }
  return trimmed;
}

export function normalizeName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (trimmed.length < 1 || trimmed.length > 80) {
    throw new AuthError("invalid_name", "Enter your name.");
  }
  return trimmed;
}

export function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const cleaned = local.replace(/[._+-]+/g, " ").trim();
  if (!cleaned) return "Tydlii";
  return cleaned.slice(0, 80);
}

export function assertPassword(password: string): void {
  if (password.length < PASSWORD_MIN) {
    throw new AuthError("weak_password", "Use at least 8 characters.");
  }
  if (password.length > PASSWORD_MAX) {
    throw new AuthError("weak_password", "Use 128 characters or fewer.");
  }
}

export type CryptoPort = {
  digest(value: string): Promise<string>;
  random(bytes: number): Promise<string>;
};

export type KeyValueStore = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
};

export function memoryStore(initial: Record<string, string> = {}): KeyValueStore & {
  dump(): Record<string, string>;
} {
  const data = { ...initial };
  return {
    async get(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    async set(key, value) {
      data[key] = value;
    },
    async remove(key) {
      delete data[key];
    },
    dump() {
      return { ...data };
    },
  };
}

export function utf8Size(value: string): number {
  let size = 0;
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x7f) size += 1;
    else if (code <= 0x7ff) size += 2;
    else if (code <= 0xffff) size += 3;
    else size += 4;
  }
  return size;
}

export function sameSecret(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

export type AuthMode =
  | { mode: "local"; misconfigured: false }
  | { mode: "local"; misconfigured: true }
  | { mode: "hosted"; issuer: string; clientId: string; scopes: ["openid", "email", "profile"] };

export function resolveAuthMode(env: {
  issuer?: string | null;
  clientId?: string | null;
}): AuthMode {
  const issuer = env.issuer?.trim() ?? "";
  const clientId = env.clientId?.trim() ?? "";
  if (issuer && clientId) {
    return { mode: "hosted", issuer, clientId, scopes: ["openid", "email", "profile"] };
  }
  if (issuer || clientId) return { mode: "local", misconfigured: true };
  return { mode: "local", misconfigured: false };
}

export function withQuery(base: string, query: Record<string, string>): string {
  const encoded = Object.entries(query)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  if (!encoded) return base;
  const hashIndex = base.indexOf("#");
  const hash = hashIndex >= 0 ? base.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? base.slice(0, hashIndex) : base;
  const join = withoutHash.includes("?") ? "&" : "?";
  return `${withoutHash}${join}${encoded}${hash}`;
}

export function persistenceLabel(kind: "secure-store" | "web-local"): string {
  if (kind === "secure-store") {
    return "SecureStore on this phone. The session stays on the device.";
  }
  return "localStorage in this web preview. A phone build uses SecureStore.";
}
