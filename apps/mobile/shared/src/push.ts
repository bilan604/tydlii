import type { AccountRole } from "./account";
import { JOB_STATUSES, type JobStatus } from "./status";

export type PushRole = AccountRole;

/** Expo project UUID from `eas init`. Empty skips `getExpoPushTokenAsync`. */
export const PUSH_PROJECT_ID_ENV = "EXPO_PUBLIC_EAS_PROJECT_ID";

/**
 * HTTPS endpoint that will store a device token. Empty skips the network.
 * The Expo access token that sends alerts stays on that server, never in the app.
 */
export const PUSH_REGISTER_URL_ENV = "EXPO_PUBLIC_PUSH_REGISTER_URL";

export const PUSH_ALERT_KINDS = ["job_status", "arrival"] as const;

export type PushAlertKind = (typeof PUSH_ALERT_KINDS)[number];

/** Android channels. Ids match the notification `data.kind` values with a hyphen. */
export const PUSH_CHANNELS: Record<PushAlertKind, { id: string; name: string; description: string }> = {
  job_status: {
    id: "job-status",
    name: "Job status",
    description: "En route, arrived, cleaning, and done.",
  },
  arrival: {
    id: "arrival",
    name: "Arrival",
    description: "When the cleaner is on the way or at the door.",
  },
};

/**
 * `data` on a future Expo push payload. The app reads this. It does not send it.
 * Example: `{ "kind": "arrival", "jobId": "job_123", "status": "arrived" }`.
 */
export type PushAlert = {
  kind: PushAlertKind;
  jobId: string;
  status?: JobStatus;
};

export type PushPlatform = "ios" | "android" | "web";

export type PushPermission = "granted" | "denied" | "undetermined";

export type PushSkipReason = "web" | "simulator" | "permission_denied" | "permission_undetermined" | "no_project";

export type PushTokenPlan = { action: "skip"; reason: PushSkipReason } | { action: "get_token"; projectId: string };

const PROJECT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readPushProjectId(value: string | null | undefined): string | null {
  const id = value?.trim() ?? "";
  return PROJECT_UUID.test(id) ? id : null;
}

/**
 * Decide whether this install may ask Expo for a push token.
 * A missing or non-UUID project id is a skip, so a build with no credentials never calls Expo.
 */
export function planPushTokenRequest(input: {
  platform: PushPlatform;
  isDevice: boolean;
  permission: PushPermission;
  projectId: string | null | undefined;
}): PushTokenPlan {
  if (input.platform === "web") return { action: "skip", reason: "web" };
  if (!input.isDevice) return { action: "skip", reason: "simulator" };
  if (input.permission === "denied") return { action: "skip", reason: "permission_denied" };
  if (input.permission !== "granted") return { action: "skip", reason: "permission_undetermined" };
  const projectId = readPushProjectId(input.projectId);
  if (!projectId) return { action: "skip", reason: "no_project" };
  return { action: "get_token", projectId };
}

export function pushSkipMessage(reason: PushSkipReason): string {
  switch (reason) {
    case "web":
      return "Job alerts register on the iOS and Android apps. This web preview keeps them off.";
    case "simulator":
      return "Push tokens need a physical phone. This simulator will not register.";
    case "permission_denied":
      return "Notifications are off for Tydlii. Turn them on in system settings to get job alerts.";
    case "permission_undetermined":
      return "Job status and arrival alerts are off.";
    case "no_project":
      return "Not registered. Set EXPO_PUBLIC_EAS_PROJECT_ID to the Expo project UUID from eas init before a token is requested.";
  }
}

const JOB_ID_MAX = 128;

export function readPushAlert(data: Record<string, unknown> | undefined): PushAlert | null {
  if (!data) return null;
  const kind = data.kind;
  const jobId = data.jobId;
  if ((kind !== "job_status" && kind !== "arrival") || typeof jobId !== "string") return null;
  const trimmed = jobId.trim();
  if (!trimmed || trimmed.length > JOB_ID_MAX) return null;
  const status = data.status;
  const known =
    typeof status === "string" && (JOB_STATUSES as readonly string[]).includes(status) ? (status as JobStatus) : undefined;
  return known ? { kind, jobId: trimmed, status: known } : { kind, jobId: trimmed };
}

export type PushRegisterBody = {
  role: PushRole;
  token: string;
  platform: "ios" | "android";
  alerts: PushAlertKind[];
};

export type PushRegisterResult =
  | { status: "not_sent"; message: string }
  | { status: "rejected"; message: string }
  | { status: "sent"; message: string }
  | { status: "failed"; message: string };

export type PushTransport = {
  post(url: string, body: PushRegisterBody): Promise<{ ok: boolean; status: number }>;
};

const TOKEN_MAX = 4096;

function registerBody(input: {
  role: PushRole;
  token: string;
  platform: PushPlatform;
}): { ok: true; body: PushRegisterBody } | { ok: false; message: string } {
  if (input.role !== "customer" && input.role !== "cleaner") {
    return { ok: false, message: "Choose the customer or cleaner app." };
  }
  const token = input.token.trim();
  if (!token || token.length > TOKEN_MAX || /[\r\n]/.test(token)) {
    return { ok: false, message: "Missing push token." };
  }
  if (input.platform !== "ios" && input.platform !== "android") {
    return { ok: false, message: "Push registration is for the iOS and Android apps." };
  }
  return {
    ok: true,
    body: {
      role: input.role,
      token,
      platform: input.platform,
      alerts: [...PUSH_ALERT_KINDS],
    },
  };
}

/**
 * Env-gated registration stub.
 * An empty URL, a non-https URL, or a missing transport never reaches `post`.
 * Callers pass a transport only when `EXPO_PUBLIC_PUSH_REGISTER_URL` is set.
 * TODO: attach the signed-in account id once auth is a server session, and add a delete call when alerts are turned off.
 */
export async function registerPushToken(
  input: { role: PushRole; token: string; platform: PushPlatform },
  env: { registerUrl?: string },
  transport?: PushTransport,
): Promise<PushRegisterResult> {
  const built = registerBody(input);
  if (!built.ok) return { status: "rejected", message: built.message };

  const url = env.registerUrl?.trim() ?? "";
  if (!url) {
    return {
      status: "not_sent",
      message: "Not sent. EXPO_PUBLIC_PUSH_REGISTER_URL is unset, so this device does not call a push server.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { status: "rejected", message: "Push register URL is not a valid URL." };
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    return { status: "rejected", message: "Push register URL must be https and must not include a password." };
  }
  if (!transport) {
    return { status: "not_sent", message: "Not sent. No push transport is configured." };
  }

  try {
    const response = await transport.post(parsed.toString(), built.body);
    if (!response.ok) {
      return { status: "failed", message: `Push server returned ${response.status}. The token was not saved.` };
    }
    return { status: "sent", message: "Push token handed to the register URL." };
  } catch {
    return { status: "failed", message: "Push server did not respond. The token was not saved." };
  }
}

export type PushFetch = (
  input: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number }>;

/** POST JSON only. No Authorization header and no Expo access token. */
export function createFetchPushTransport(fetchImpl?: PushFetch): PushTransport {
  const send: PushFetch =
    fetchImpl ??
    (async (input, init) => {
      const response = await fetch(input, init);
      return { ok: response.ok, status: response.status };
    });
  return {
    post(url, body) {
      return send(url, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
    },
  };
}
