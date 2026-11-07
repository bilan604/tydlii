import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "tydlii_control_session";
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const PASSWORD_MIN = 12;
const PASSWORD_MAX = 200;
const SESSION_SECRET_MIN = 32;

export type AuthStatus = {
  configured: boolean;
  missing: string[];
};

export function authStatus(env: NodeJS.ProcessEnv = process.env): AuthStatus {
  const missing: string[] = [];
  const password = env.CONTROL_ROOM_OWNER_PASSWORD ?? "";
  const secret = env.CONTROL_ROOM_SESSION_SECRET ?? "";
  if (password.trim().length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    missing.push("CONTROL_ROOM_OWNER_PASSWORD");
  }
  if (secret.trim().length < SESSION_SECRET_MIN) missing.push("CONTROL_ROOM_SESSION_SECRET");
  return { configured: missing.length === 0, missing };
}

function passwordDigest(password: string, secret: string): Buffer {
  return scryptSync(password, `tydlii-control:${secret}`, 32, { N: 16384, r: 8, p: 1 });
}

export function passwordsMatch(input: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const status = authStatus(env);
  if (!status.configured) return false;
  if (input.length < PASSWORD_MIN || input.length > PASSWORD_MAX) return false;
  const secret = env.CONTROL_ROOM_SESSION_SECRET ?? "";
  const expected = env.CONTROL_ROOM_OWNER_PASSWORD ?? "";
  const left = passwordDigest(input, secret);
  const right = passwordDigest(expected, secret);
  return timingSafeEqual(left, right);
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function issueSession(env: NodeJS.ProcessEnv = process.env, now = Date.now()): string | null {
  if (!authStatus(env).configured) return null;
  const secret = env.CONTROL_ROOM_SESSION_SECRET ?? "";
  const exp = now + SESSION_TTL_MS;
  const nonce = randomBytes(16).toString("base64url");
  const body = `v1.${exp}.${nonce}`;
  return `${body}.${sign(body, secret)}`;
}

export function verifySession(token: string | null | undefined, env: NodeJS.ProcessEnv = process.env, now = Date.now()): boolean {
  if (!token || !authStatus(env).configured) return false;
  const secret = env.CONTROL_ROOM_SESSION_SECRET ?? "";
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return false;
  const body = parts.slice(0, 3).join(".");
  const given = parts[3] ?? "";
  const expected = sign(body, secret);
  const left = Buffer.from(given);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  if (!timingSafeEqual(left, right)) return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp <= now) return false;
  return true;
}

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === name) return rest.join("=") || null;
  }
  return null;
}

export function sessionCookie(token: string, secure: boolean, maxAge = Math.floor(SESSION_TTL_MS / 1000)): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(secure: boolean): string {
  return sessionCookie("", secure, 0);
}
