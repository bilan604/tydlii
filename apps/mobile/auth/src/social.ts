import { normalizeEmail, type ProviderIdentity } from "./model";

export const GOOGLE_IOS_CLIENT_ID_ENV = "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID";
export const GOOGLE_ANDROID_CLIENT_ID_ENV = "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID";
export const GOOGLE_WEB_CLIENT_ID_ENV = "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID";
export const APPLE_SERVICE_ID_ENV = "EXPO_PUBLIC_APPLE_SERVICE_ID";
export const APPLE_REDIRECT_URI_ENV = "EXPO_PUBLIC_APPLE_REDIRECT_URI";

/** Expo Go's iOS bundle id. A development build uses com.tydlii.customer or com.tydlii.cleaner. */
export const EXPO_GO_IOS_BUNDLE_ID = "host.exp.exponent";

export const GOOGLE_REDIRECT_PATH = "oauth2redirect";

const GOOGLE_CLIENT_ID = /^([0-9]+-[0-9A-Za-z_-]+)\.apps\.googleusercontent\.com$/;
const REVERSE_DNS = /^[A-Za-z][A-Za-z0-9-]*(\.[A-Za-z][A-Za-z0-9-]*)+$/;
const SUBJECT = /^[A-Za-z0-9._-]{1,256}$/;

export type SocialPlatform = "ios" | "android" | "web";

export type IdentityCheck =
  | { ok: true; identity: ProviderIdentity }
  | { ok: false; message: string };

export type GooglePlan =
  | { ready: true; platform: SocialPlatform; clientId: string; audiences: string[] }
  | { ready: false; message: string };

export type ApplePlan =
  | { ready: true; mode: "native"; bundleId: string; allowedAudiences: string[] }
  | {
      ready: true;
      mode: "browser";
      bundleId: string;
      serviceId: string;
      redirectUri: string;
      allowedAudiences: string[];
    }
  | { ready: false; message: string };

export function googleReversedScheme(clientId: string | null | undefined): string | null {
  const match = GOOGLE_CLIENT_ID.exec(clientId?.trim() ?? "");
  if (!match?.[1]) return null;
  return `com.googleusercontent.apps.${match[1]}`;
}

/** Redirect Google registers for an iOS or Android OAuth client. Not a web URL. */
export function googleNativeRedirectUri(clientId: string | null | undefined): string | null {
  const scheme = googleReversedScheme(clientId);
  if (!scheme) return null;
  return `${scheme}:/${GOOGLE_REDIRECT_PATH}`;
}

export function isGoogleClientId(value: string | null | undefined): boolean {
  return googleReversedScheme(value) !== null;
}

function validGoogleId(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return isGoogleClientId(trimmed) ? trimmed : null;
}

export function planGoogleAuth(input: {
  platform: SocialPlatform;
  iosClientId?: string | null;
  androidClientId?: string | null;
  webClientId?: string | null;
}): GooglePlan {
  const selected =
    input.platform === "ios"
      ? validGoogleId(input.iosClientId)
      : input.platform === "android"
        ? validGoogleId(input.androidClientId)
        : validGoogleId(input.webClientId);
  if (!selected) {
    const envName =
      input.platform === "ios"
        ? GOOGLE_IOS_CLIENT_ID_ENV
        : input.platform === "android"
          ? GOOGLE_ANDROID_CLIENT_ID_ENV
          : GOOGLE_WEB_CLIENT_ID_ENV;
    return {
      ready: false,
      message: `Continue with Google needs ${envName}. Create that OAuth client in Google Cloud, paste the client id, and do not put a client secret in the app.`,
    };
  }
  const audiences = [
    ...new Set(
      [input.iosClientId, input.androidClientId, input.webClientId]
        .map((value) => validGoogleId(value))
        .filter((value): value is string => value !== null),
    ),
  ];
  return { ready: true, platform: input.platform, clientId: selected, audiences };
}

export function isHttpsOrLocalRedirect(uri: string | null | undefined): boolean {
  const trimmed = uri?.trim() ?? "";
  if (!trimmed || trimmed.length > 2048 || /\s/.test(trimmed)) return false;
  if (/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?(?:\/[^\s]*)?$/.test(trimmed)) return true;
  return /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/[^\s]*)?$/.test(trimmed);
}

export function planAppleAuth(input: {
  platform: SocialPlatform;
  bundleId: string;
  serviceId?: string | null;
  redirectUri?: string | null;
}): ApplePlan {
  const bundleId = input.bundleId.trim();
  if (!REVERSE_DNS.test(bundleId)) {
    return { ready: false, message: "This app is missing its bundle id." };
  }
  if (input.platform === "ios") {
    return {
      ready: true,
      mode: "native",
      bundleId,
      allowedAudiences: [bundleId, EXPO_GO_IOS_BUNDLE_ID],
    };
  }
  const serviceId = input.serviceId?.trim() ?? "";
  const redirectUri = input.redirectUri?.trim() ?? "";
  if (!REVERSE_DNS.test(serviceId) || !isHttpsOrLocalRedirect(redirectUri)) {
    return {
      ready: false,
      message: `Continue with Apple on Android and web needs ${APPLE_SERVICE_ID_ENV} and ${APPLE_REDIRECT_URI_ENV}. Register an https return URL on the Apple Services ID. iOS uses the bundle id ${bundleId} and does not need those. Do not put an Apple private key in the app.`,
    };
  }
  return {
    ready: true,
    mode: "browser",
    bundleId,
    serviceId,
    redirectUri,
    allowedAudiences: [serviceId],
  };
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const json = decodeBase64Url(parts[1] ?? "");
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function nonceMatches(claim: unknown, expected: { raw: string; digest?: string | null }): boolean {
  if (typeof claim !== "string" || !claim) return false;
  if (claim === expected.raw) return true;
  return Boolean(expected.digest && claim === expected.digest);
}

export function identityFromGoogleTokenInfo(
  body: unknown,
  input: { audiences: readonly string[]; nonce?: { raw: string; digest?: string | null } | null; now?: number },
): IdentityCheck {
  const record = asRecord(body);
  if (!record || typeof record.error === "string") {
    return { ok: false, message: "Google did not confirm this sign-in." };
  }
  if (record.iss !== "https://accounts.google.com" && record.iss !== "accounts.google.com") {
    return { ok: false, message: "Google did not confirm this sign-in." };
  }
  const audOk = audienceMatches(record.aud, input.audiences);
  const azpOk = typeof record.azp === "string" && input.audiences.includes(record.azp);
  if (!audOk && !azpOk) return { ok: false, message: "Google signed this in for a different app." };
  if (!expiresInFuture(record.exp, input.now ?? Date.now())) {
    return { ok: false, message: "Google sign-in expired. Try again." };
  }
  if (input.nonce && !nonceMatches(record.nonce, input.nonce)) {
    return { ok: false, message: "Google sign-in did not match this request." };
  }
  return googleIdentity(record);
}

export function identityFromGoogleUserInfo(body: unknown): IdentityCheck {
  const record = asRecord(body);
  if (!record || typeof record.error === "string") {
    return { ok: false, message: "Google did not confirm this sign-in." };
  }
  return googleIdentity(record);
}

export function identityFromAppleToken(
  token: string,
  input: {
    allowedAudiences: readonly string[];
    nonce?: { raw: string; digest?: string | null } | null;
    now?: number;
    fullName?: string | null;
    expectedSubject?: string | null;
  },
): IdentityCheck {
  const record = decodeJwtPayload(token);
  if (!record) return { ok: false, message: "Apple did not return a usable token." };
  if (record.iss !== "https://appleid.apple.com") {
    return { ok: false, message: "Apple did not confirm this sign-in." };
  }
  if (!audienceMatches(record.aud, input.allowedAudiences)) {
    return { ok: false, message: "Apple signed this in for a different app." };
  }
  if (!expiresInFuture(record.exp, input.now ?? Date.now())) {
    return { ok: false, message: "Apple sign-in expired. Try again." };
  }
  if (input.nonce && !nonceMatches(record.nonce, input.nonce)) {
    return { ok: false, message: "Apple sign-in did not match this request." };
  }
  if (typeof record.sub !== "string" || !SUBJECT.test(record.sub)) {
    return { ok: false, message: "Apple did not return an account id." };
  }
  const expected = input.expectedSubject?.trim() ?? "";
  if (expected && record.sub !== expected) {
    return { ok: false, message: "Apple sign-in did not match this request." };
  }
  const email = readEmail(record.email);
  if (email === "invalid") return { ok: false, message: "Apple did not return a usable email." };
  if (email && !isVerified(record.email_verified)) {
    return { ok: false, message: "That Apple ID has not confirmed its email." };
  }
  return {
    ok: true,
    identity: {
      provider: "apple",
      subject: record.sub,
      email,
      emailVerified: Boolean(email),
      displayName: appleDisplayName({ fullName: input.fullName }),
    },
  };
}

export function acceptAppleNativeCredential(input: {
  user: string;
  email: string | null;
  fullName: string | null;
  identityToken: string | null;
  allowedAudiences: readonly string[];
  nonce: { raw: string; digest?: string | null };
  now?: number;
}): IdentityCheck {
  if (!input.identityToken) return { ok: false, message: "Apple did not return a sign-in token." };
  const parsed = identityFromAppleToken(input.identityToken, {
    allowedAudiences: input.allowedAudiences,
    nonce: input.nonce,
    now: input.now,
    fullName: input.fullName,
    expectedSubject: input.user,
  });
  if (!parsed.ok) return parsed;
  if (parsed.identity.email) return parsed;
  const email = readEmail(input.email);
  if (email === "invalid") return { ok: false, message: "Apple did not return a usable email." };
  if (!email) return parsed;
  return {
    ok: true,
    identity: {
      ...parsed.identity,
      email,
      emailVerified: true,
      displayName: parsed.identity.displayName ?? appleDisplayName({ fullName: input.fullName }),
    },
  };
}

export function appleDisplayName(input: { fullName?: string | null; userJson?: string | null }): string | null {
  const direct = readName(input.fullName ?? null);
  if (direct) return direct;
  if (!input.userJson) return null;
  try {
    const parsed = JSON.parse(input.userJson) as { name?: { firstName?: unknown; lastName?: unknown } };
    const full = [readName(parsed.name?.firstName), readName(parsed.name?.lastName)].filter(Boolean).join(" ");
    return readName(full);
  } catch {
    return null;
  }
}

function googleIdentity(record: Record<string, unknown>): IdentityCheck {
  if (typeof record.sub !== "string" || !SUBJECT.test(record.sub)) {
    return { ok: false, message: "Google did not return an account id." };
  }
  const email = readEmail(record.email);
  if (email === "invalid" || !email) return { ok: false, message: "Google did not share an email for this account." };
  if (!isVerified(record.email_verified)) {
    return { ok: false, message: "That Google account has not confirmed its email." };
  }
  return {
    ok: true,
    identity: {
      provider: "google",
      subject: record.sub,
      email,
      emailVerified: true,
      displayName: readName(record.name),
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function audienceMatches(aud: unknown, allowed: readonly string[]): boolean {
  const values = Array.isArray(aud) ? aud : [aud];
  return values.some((item) => typeof item === "string" && allowed.includes(item));
}

function expiresInFuture(value: unknown, nowMs: number): boolean {
  const exp = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  if (!Number.isFinite(exp)) return false;
  return exp * 1000 + 60_000 > nowMs;
}

function isVerified(value: unknown): boolean {
  return value === true || value === "true";
}

function readEmail(value: unknown): string | null | "invalid" {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return "invalid";
  try {
    return normalizeEmail(value);
  } catch {
    return "invalid";
  }
}

function readName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed.slice(0, 80);
}

function decodeBase64Url(segment: string): string | null {
  if (!segment || segment.length > 8192) return null;
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  if (!/^[A-Za-z0-9+/]+$/.test(normalized)) return null;
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const data = normalized + pad;
  const bytes: number[] = [];
  for (let index = 0; index < data.length; index += 4) {
    const a = alphabet.indexOf(data[index] ?? "");
    const b = alphabet.indexOf(data[index + 1] ?? "");
    const c = data[index + 2] === "=" ? 0 : alphabet.indexOf(data[index + 2] ?? "");
    const d = data[index + 3] === "=" ? 0 : alphabet.indexOf(data[index + 3] ?? "");
    if (a < 0 || b < 0 || c < 0 || d < 0) return null;
    bytes.push((a << 2) | (b >> 4));
    if (data[index + 2] !== "=") bytes.push(((b & 15) << 4) | (c >> 2));
    if (data[index + 3] !== "=") bytes.push(((c & 3) << 6) | d);
  }
  let out = "";
  for (let index = 0; index < bytes.length; ) {
    const byte = bytes[index] ?? 0;
    if (byte < 0x80) {
      out += String.fromCharCode(byte);
      index += 1;
    } else if (byte < 0xe0 && index + 1 < bytes.length) {
      out += String.fromCharCode(((byte & 31) << 6) | ((bytes[index + 1] ?? 0) & 63));
      index += 2;
    } else if (byte < 0xf0 && index + 2 < bytes.length) {
      out += String.fromCharCode(
        ((byte & 15) << 12) | (((bytes[index + 1] ?? 0) & 63) << 6) | ((bytes[index + 2] ?? 0) & 63),
      );
      index += 3;
    } else if (index + 3 < bytes.length) {
      const code =
        ((byte & 7) << 18) |
        (((bytes[index + 1] ?? 0) & 63) << 12) |
        (((bytes[index + 2] ?? 0) & 63) << 6) |
        ((bytes[index + 3] ?? 0) & 63);
      out += String.fromCodePoint(code);
      index += 4;
    } else {
      return null;
    }
  }
  return out;
}
