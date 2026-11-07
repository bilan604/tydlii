import { applyCursorStatus, BRIDGE_DISCONNECTED, verifyCursorSignature, webhookSecretConfigured } from "./bridge";
import {
  authStatus,
  clearSessionCookie,
  issueSession,
  passwordsMatch,
  readCookie,
  SESSION_COOKIE,
  sessionCookie,
  verifySession,
} from "./auth";
import { createTask, decideApproval, recordHandoff, requestApproval, setTaskStatus } from "./commands";
import { demoSnapshot, ownerSnapshot } from "./snapshot";
import { controlRoomStorePath, updateControlFile } from "./store";

const CONTROL_HEADER = "x-tydlii-control";
const JSON_LIMIT = 20_000;
const WEBHOOK_LIMIT = 32_000;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

type FailureWindow = { count: number; resetAt: number };
const failures = new Map<string, FailureWindow>();

export function resetLoginThrottle(): void {
  failures.clear();
}

export type ControlHttpOptions = {
  env?: NodeJS.ProcessEnv;
  now?: () => number;
  storePath?: string;
};

function envOf(options: ControlHttpOptions | undefined): NodeJS.ProcessEnv {
  return options?.env ?? process.env;
}

function nowOf(options: ControlHttpOptions | undefined): number {
  return options?.now?.() ?? Date.now();
}

function secureRequest(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwarded) return forwarded === "https";
  return new URL(request.url).protocol === "https:";
}

function json(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, nofollow",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

function loginKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "local";
}

function locked(key: string, now: number): boolean {
  const row = failures.get(key);
  if (!row || row.resetAt <= now) return false;
  return row.count >= MAX_FAILURES;
}

function markFailure(key: string, now: number): void {
  const row = failures.get(key);
  if (!row || row.resetAt <= now) {
    failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  row.count += 1;
}

function hasControlHeader(request: Request): boolean {
  return request.headers.get(CONTROL_HEADER) === "1";
}

function authorized(request: Request, env: NodeJS.ProcessEnv, now: number): boolean {
  return verifySession(readCookie(request.headers.get("cookie"), SESSION_COOKIE), env, now);
}

async function readLimited(request: Request, limit: number): Promise<{ ok: true; text: string } | { ok: false; response: Response }> {
  const text = await request.text();
  if (text.length > limit) return { ok: false, response: json(413, { error: "Request is too large." }) };
  return { ok: true, text };
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false; response: Response } {
  if (!text) return { ok: true, value: {} };
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: json(400, { error: "Body was not JSON." }) };
  }
}

export async function handleControlRequest(
  request: Request,
  segments: string[],
  options?: ControlHttpOptions,
): Promise<Response> {
  const env = envOf(options);
  const now = nowOf(options);
  const method = request.method.toUpperCase();
  const path = segments.join("/");
  const secure = secureRequest(request);

  if (path === "bridge/cursor-status") {
    if (method !== "POST") return json(405, { error: "Method not allowed." });
    if (!webhookSecretConfigured(env)) return json(503, { error: BRIDGE_DISCONNECTED });
    const body = await readLimited(request, WEBHOOK_LIMIT);
    if (!body.ok) return body.response;
    const signature = request.headers.get("x-webhook-signature");
    if (!verifyCursorSignature(env.CONTROL_ROOM_CURSOR_WEBHOOK_SECRET ?? "", body.text, signature)) {
      return json(401, { error: "Webhook signature was rejected." });
    }
    const loadedPath = options?.storePath ?? controlRoomStorePath(env);
    const applied = await updateControlFile(loadedPath, env, (file) => {
      const result = applyCursorStatus(file, {
        rawBody: body.text,
        signature,
        deliveryId: request.headers.get("x-webhook-id"),
        secret: env.CONTROL_ROOM_CURSOR_WEBHOOK_SECRET,
        now,
      });
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, notice: result.summary };
    });
    if (!applied.ok) return json(applied.status, { error: applied.error });
    return json(200, { ok: true, notice: applied.notice });
  }

  if (path === "preview/state") {
    if (method !== "GET") return json(405, { error: "Method not allowed." });
    const snapshot = await demoSnapshot(env, now);
    return json(200, snapshot);
  }

  if (path === "session" && method === "GET") {
    return json(200, { ...authStatus(env), authenticated: authorized(request, env, now) });
  }

  if (path === "session" && method === "DELETE") {
    if (!hasControlHeader(request)) return json(403, { error: "Missing control header." });
    return json(200, { ok: true }, { "set-cookie": clearSessionCookie(secure) });
  }

  if (path === "session" && method === "POST") {
    if (!hasControlHeader(request)) return json(403, { error: "Missing control header." });
    const status = authStatus(env);
    if (!status.configured) return json(503, { error: "Owner sign-in is disconnected.", missing: status.missing });
    const key = loginKey(request);
    if (locked(key, now)) return json(429, { error: "Too many sign-in attempts. Wait and try again." });
    const body = await readLimited(request, JSON_LIMIT);
    if (!body.ok) return body.response;
    const parsed = parseJson(body.text);
    if (!parsed.ok) return parsed.response;
    const password = typeof parsed.value === "object" && parsed.value !== null && "password" in parsed.value
      ? (parsed.value as { password?: unknown }).password
      : undefined;
    if (typeof password !== "string" || !passwordsMatch(password, env)) {
      markFailure(key, now);
      return json(401, { error: "Sign-in failed." });
    }
    const token = issueSession(env, now);
    if (!token) return json(503, { error: "Owner sign-in is disconnected.", missing: status.missing });
    return json(200, { ok: true }, { "set-cookie": sessionCookie(token, secure) });
  }

  if (!authorized(request, env, now)) return json(401, { error: "Owner sign-in required." });
  if (method !== "GET" && !hasControlHeader(request)) return json(403, { error: "Missing control header." });

  const storePath = options?.storePath ?? controlRoomStorePath(env);

  if (path === "state" && method === "GET") {
    return json(200, await ownerSnapshot(env, storePath, now));
  }

  if (method === "GET") return json(405, { error: "Method not allowed." });
  if (method !== "POST") return json(405, { error: "Method not allowed." });

  const body = await readLimited(request, JSON_LIMIT);
  if (!body.ok) return body.response;
  const parsed = parseJson(body.text);
  if (!parsed.ok) return parsed.response;
  const payload = typeof parsed.value === "object" && parsed.value !== null ? (parsed.value as Record<string, unknown>) : {};

  if (path === "tasks") {
    const saved = await updateControlFile(storePath, env, (file) =>
      createTask(file, {
        title: payload.title,
        summary: payload.summary,
        lane: payload.lane,
        neighbourhood: payload.neighbourhood,
        dependsOn: payload.dependsOn,
        holder: payload.holder,
      }, now),
    );
    if (!saved.ok) return json(saved.status, { error: saved.error });
    const task = saved.file.tasks[saved.file.tasks.length - 1];
    return json(200, { ok: true, notice: saved.notice, taskId: task?.id ?? null });
  }

  const taskStatus = path.match(/^tasks\/([0-9a-f-]{36})$/i);
  if (taskStatus) {
    const saved = await updateControlFile(storePath, env, (file) => setTaskStatus(file, taskStatus[1].toLowerCase(), payload.status, now));
    if (!saved.ok) return json(saved.status, { error: saved.error });
    return json(200, { ok: true, notice: saved.notice });
  }

  if (path === "handoffs") {
    const saved = await updateControlFile(storePath, env, (file) =>
      recordHandoff(file, { taskId: payload.taskId, to: payload.to, note: payload.note }, now),
    );
    if (!saved.ok) return json(saved.status, { error: saved.error });
    return json(200, { ok: true, notice: saved.notice });
  }

  if (path === "approvals") {
    const saved = await updateControlFile(storePath, env, (file) =>
      requestApproval(file, { taskId: payload.taskId, kind: payload.kind, title: payload.title, detail: payload.detail }, now),
    );
    if (!saved.ok) return json(saved.status, { error: saved.error });
    return json(200, { ok: true, notice: saved.notice });
  }

  const decision = path.match(/^approvals\/([0-9a-f-]{36})$/i);
  if (decision) {
    const saved = await updateControlFile(storePath, env, (file) =>
      decideApproval(file, decision[1].toLowerCase(), payload.decision, now),
    );
    if (!saved.ok) return json(saved.status, { error: saved.error });
    return json(200, { ok: true, notice: saved.notice });
  }

  return json(404, { error: "Not found." });
}
