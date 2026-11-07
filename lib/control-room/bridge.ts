import { createHmac, timingSafeEqual } from "node:crypto";
import { randomUUID } from "node:crypto";
import { appendEvent, type ControlFile } from "./model";

/**
 * Documented Cursor surfaces this app does not call:
 *
 * - Cloud Agents API v1 can launch runs with an API key. Webhooks on v1 are
 *   documented as coming soon. This Next app does not store that API key and
 *   does not expose a browser action that would send a prompt as the founder.
 * - Legacy v0 webhooks POST `statusChange` for ERROR and FINISHED, signed with
 *   `X-Webhook-Signature: sha256=<hmac of the raw body>`.
 *   https://cursor.com/docs/cloud-agent/api/webhooks
 * - Automations accept inbound webhook triggers. They do not emit the
 *   specialist handoffs this room would need, and this repo has no automation id.
 *   https://cursor.com/docs/cloud-agent/automations
 *
 * Intake, Pipeline, and Desk are role names. They are not Cursor automations
 * wired to tydlii.com. A chat agent in Cursor is not readable by this website.
 */

export const WEBHOOK_SECRET_MIN = 16;
export const BRIDGE_DISCONNECTED =
  "Agent bridge disconnected. Cursor chat agents are not reachable from this website, and no signed status webhook is configured.";

export type BridgeStatus = {
  state: "disconnected" | "listening";
  summary: string;
  accepts: string;
  doesNotDo: string[];
};

export function webhookSecretConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.CONTROL_ROOM_CURSOR_WEBHOOK_SECRET ?? "").trim().length >= WEBHOOK_SECRET_MIN;
}

export function bridgeStatus(env: NodeJS.ProcessEnv = process.env): BridgeStatus {
  if (!webhookSecretConfigured(env)) {
    return {
      state: "disconnected",
      summary: BRIDGE_DISCONNECTED,
      accepts: "Nothing. POST /api/control/bridge/cursor-status returns disconnected until CONTROL_ROOM_CURSOR_WEBHOOK_SECRET is set.",
      doesNotDo: [
        "It does not launch a Cursor agent.",
        "It does not read Cursor chat transcripts.",
        "It does not move Intake, Pipeline, or Desk.",
        "It does not send mail, merge, deploy, charge, or change DNS.",
      ],
    };
  }
  return {
    state: "listening",
    summary:
      "Legacy Cursor status webhook secret is set. Verified statusChange events for ERROR or FINISHED can be appended to the audit log. That is a coding-agent run status, not a specialist handoff.",
    accepts: "Signed statusChange payloads only. Invalid signatures are stored nowhere.",
    doesNotDo: [
      "A FINISHED event does not assign Intake, Pipeline, or Desk.",
      "The browser still cannot send a prompt as the founder.",
      "Approvals still fail closed. The webhook cannot execute them.",
    ],
  };
}

export function verifyCursorSignature(secret: string, rawBody: string, header: string | null): boolean {
  if (!header || !secret) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const left = Buffer.from(header);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

const ALLOWED_LINK = /^https:\/\/(github\.com\/bilan604\/tydlii\/|cursor\.com\/agents)/;

export function safeLink(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 300) return null;
  return ALLOWED_LINK.test(value) ? value : null;
}

export type CursorStatusInput = {
  rawBody: string;
  signature: string | null;
  deliveryId: string | null;
  secret: string | undefined;
  now: number;
};

export type CursorStatusResult =
  | { ok: true; duplicate: boolean; summary: string }
  | { ok: false; status: number; error: string };

function clip(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.slice(0, max);
}

export function applyCursorStatus(file: ControlFile, input: CursorStatusInput): CursorStatusResult {
  const secret = input.secret?.trim() ?? "";
  if (secret.length < WEBHOOK_SECRET_MIN) {
    return { ok: false, status: 503, error: BRIDGE_DISCONNECTED };
  }
  if (!verifyCursorSignature(secret, input.rawBody, input.signature)) {
    return { ok: false, status: 401, error: "Webhook signature was rejected." };
  }
  let payload: unknown;
  try {
    payload = JSON.parse(input.rawBody) as unknown;
  } catch {
    return { ok: false, status: 400, error: "Webhook body was not JSON." };
  }
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, status: 400, error: "Webhook body was not an object." };
  }
  const body = payload as Record<string, unknown>;
  if (body.event !== "statusChange") {
    return { ok: false, status: 400, error: "Only a statusChange event is accepted." };
  }
  if (body.status !== "ERROR" && body.status !== "FINISHED") {
    return { ok: false, status: 400, error: "Only ERROR or FINISHED statusChange events are accepted." };
  }
  const runId = clip(body.id, 80);
  if (!runId) return { ok: false, status: 400, error: "Webhook is missing a run id." };
  const delivery = clip(input.deliveryId, 80) ?? `${runId}:${body.status}:${clip(body.timestamp, 40) ?? ""}`;
  const duplicate = file.events.some((event) => event.kind === "cursor.status" && event.fields.delivery === delivery);
  if (duplicate) return { ok: true, duplicate: true, summary: "Status was already in the audit log." };

  const source = typeof body.source === "object" && body.source !== null ? (body.source as Record<string, unknown>) : {};
  const target = typeof body.target === "object" && body.target !== null ? (body.target as Record<string, unknown>) : {};
  const summaryText = clip(body.summary, 180) ?? `Cursor run ${body.status.toLowerCase()}.`;
  const fields: Record<string, string> = {
    delivery,
    runId,
    status: body.status,
    summary: summaryText,
  };
  const ref = clip(source.ref, 120);
  const branch = clip(target.branchName, 120);
  const prUrl = safeLink(target.prUrl);
  const runUrl = safeLink(target.url);
  if (ref) fields.ref = ref;
  if (branch) fields.branch = branch;
  if (prUrl) fields.prUrl = prUrl;
  if (runUrl) fields.runUrl = runUrl;

  appendEvent(file, {
    id: randomUUID(),
    at: new Date(input.now).toISOString(),
    kind: "cursor.status",
    summary: `Cursor cloud agent ${body.status.toLowerCase()}: ${summaryText}`,
    taskId: null,
    actor: "cursor-webhook",
    fields,
  });
  return {
    ok: true,
    duplicate: false,
    summary: "Cursor run status recorded. No specialist was assigned and nothing was executed.",
  };
}
