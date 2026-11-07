import { randomUUID } from "node:crypto";
import { matchArea } from "../areas";
import {
  AGENT_IDS,
  AGENTS,
  APPROVAL_KINDS,
  EXECUTION_REASONS,
  LANES,
  MAX_TASKS,
  NOT_NOTIFIED,
  STATUS_LABEL,
  UUID_RE,
  agentName,
  appendEvent,
  createsCycle,
  dependencyBlock,
  executionFor,
  isTerminal,
  nextStatuses,
  type AgentId,
  type Approval,
  type ApprovalKind,
  type AuditEvent,
  type ControlFile,
  type Lane,
  type Task,
  type TaskStatus,
} from "./model";

export type CommandResult = { ok: true; notice: string } | { ok: false; error: string };

function stamp(now: number): string {
  return new Date(now).toISOString();
}

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  if (!text || text.length > max) return null;
  if (/[\u0000-\u001f]/.test(text)) return null;
  return text;
}

function optionalText(value: unknown, max: number): string | null | undefined {
  if (value === undefined || value === null || value === "") return "";
  return clean(value, max);
}

export function createTask(
  file: ControlFile,
  input: {
    title: unknown;
    summary?: unknown;
    lane: unknown;
    neighbourhood?: unknown;
    dependsOn?: unknown;
    holder?: unknown;
  },
  now: number,
): CommandResult {
  if (file.tasks.length >= MAX_TASKS) return { ok: false, error: "The audit log has reached its task limit." };
  const title = clean(input.title, 120);
  if (!title || title.length < 3) return { ok: false, error: "Title must be 3 to 120 characters." };
  const summaryRaw = optionalText(input.summary, 500);
  if (summaryRaw === null || summaryRaw === undefined) return { ok: false, error: "Summary must be 500 characters or less." };
  const lane = LANES.find((item) => item === input.lane);
  if (!lane) return { ok: false, error: "Choose a lane." };
  let neighbourhood: string | null = null;
  if (input.neighbourhood !== undefined && input.neighbourhood !== null && input.neighbourhood !== "") {
    if (typeof input.neighbourhood !== "string") return { ok: false, error: "Neighbourhood is not recognized." };
    const matched = matchArea(input.neighbourhood);
    if (!matched) return { ok: false, error: "Neighbourhood is not recognized." };
    neighbourhood = matched;
  }
  const holder = input.holder === undefined || input.holder === null || input.holder === ""
    ? lane === "business"
      ? null
      : AGENTS.find((agent) => agent.lane === lane)?.id ?? null
    : AGENT_IDS.find((item) => item === input.holder);
  if (holder === undefined) return { ok: false, error: "That desk is not part of the Tydlii roster." };
  const dependsOn: string[] = [];
  const rawDeps = input.dependsOn === undefined ? [] : input.dependsOn;
  if (!Array.isArray(rawDeps) || rawDeps.length > 8) return { ok: false, error: "List at most 8 dependencies." };
  for (const item of rawDeps) {
    if (typeof item !== "string" || !UUID_RE.test(item)) return { ok: false, error: "A dependency is not a task in this log." };
    const id = item.toLowerCase();
    if (!file.tasks.some((task) => task.id === id)) return { ok: false, error: "A dependency is not a task in this log." };
    if (!dependsOn.includes(id)) dependsOn.push(id);
  }
  const id = randomUUID();
  if (createsCycle([...file.tasks, { id, dependsOn }], id, dependsOn)) {
    return { ok: false, error: "Those dependencies would loop." };
  }
  const at = stamp(now);
  const task: Task = {
    id,
    title,
    summary: summaryRaw,
    lane,
    status: "queued",
    holder: holder ?? null,
    dependsOn,
    neighbourhood,
    createdAt: at,
    updatedAt: at,
    source: "founder",
  };
  file.tasks.push(task);
  appendEvent(file, {
    id: randomUUID(),
    at,
    kind: "task.created",
    summary: `Founder recorded “${title}”.`,
    taskId: id,
    actor: "founder",
    fields: { lane, holder: task.holder ?? "unassigned" },
  });
  return { ok: true, notice: NOT_NOTIFIED };
}

export function setTaskStatus(file: ControlFile, taskId: string, status: unknown, now: number): CommandResult {
  const task = file.tasks.find((item) => item.id === taskId.toLowerCase());
  if (!task) return { ok: false, error: "That task is not in the audit log." };
  if (task.source === "demo") return { ok: false, error: "DEMO records cannot be changed from the owner log." };
  const next = TASK_STATUS_VALUES.find((item) => item === status);
  if (!next) return { ok: false, error: "That status is not available." };
  if (!nextStatuses(task.status).includes(next)) {
    return { ok: false, error: `${STATUS_LABEL[task.status]} cannot move to ${STATUS_LABEL[next]}.` };
  }
  if (next === "active") {
    const blocked = dependencyBlock(file, task);
    if (blocked) return { ok: false, error: blocked };
  }
  task.status = next;
  task.updatedAt = stamp(now);
  appendEvent(file, {
    id: randomUUID(),
    at: task.updatedAt,
    kind: "task.status",
    summary: `Founder set “${task.title}” to ${STATUS_LABEL[next].toLowerCase()}.`,
    taskId: task.id,
    actor: "founder",
    fields: { status: next },
  });
  return { ok: true, notice: "Status recorded in the audit log. This does not start or stop an agent." };
}

const TASK_STATUS_VALUES: TaskStatus[] = [
  "queued",
  "active",
  "blocked",
  "awaiting_approval",
  "handed_off",
  "done",
  "cancelled",
];

export function recordHandoff(
  file: ControlFile,
  input: { taskId: unknown; to: unknown; note?: unknown },
  now: number,
): CommandResult {
  if (typeof input.taskId !== "string") return { ok: false, error: "Choose a task." };
  const requestedId = input.taskId.toLowerCase();
  const task = file.tasks.find((item) => item.id === requestedId);
  if (!task) return { ok: false, error: "That task is not in the audit log." };
  if (task.source === "demo") return { ok: false, error: "DEMO records cannot be changed from the owner log." };
  if (isTerminal(task.status)) return { ok: false, error: "A finished task cannot be handed off." };
  const to = AGENT_IDS.find((item) => item === input.to);
  if (!to) return { ok: false, error: "Choose a Tydlii desk." };
  if (task.holder === to) return { ok: false, error: "That desk already holds this task." };
  const noteRaw = optionalText(input.note, 280);
  if (noteRaw === null || noteRaw === undefined) return { ok: false, error: "Note must be 280 characters or less." };
  const at = stamp(now);
  const from = task.holder;
  file.handoffs.push({
    id: randomUUID(),
    taskId: task.id,
    from,
    to,
    note: noteRaw,
    createdAt: at,
    actor: "founder",
    notified: false,
  });
  task.holder = to;
  task.status = "handed_off";
  task.updatedAt = at;
  const lane = AGENTS.find((agent) => agent.id === to)?.lane;
  if (lane) task.lane = lane;
  appendEvent(file, {
    id: randomUUID(),
    at,
    kind: "handoff.recorded",
    summary: `Handoff recorded from ${agentName(from)} to ${agentName(to)}. Not sent.`,
    taskId: task.id,
    actor: "founder",
    fields: { from: from ?? "unassigned", to, notified: "false" },
  });
  return { ok: true, notice: NOT_NOTIFIED };
}

export function requestApproval(
  file: ControlFile,
  input: { taskId?: unknown; kind: unknown; title: unknown; detail?: unknown },
  now: number,
): CommandResult {
  const kind = APPROVAL_KINDS.find((item) => item === input.kind);
  if (!kind) return { ok: false, error: "Choose an approval type." };
  const title = clean(input.title, 120);
  if (!title || title.length < 3) return { ok: false, error: "Title must be 3 to 120 characters." };
  const detailRaw = optionalText(input.detail, 500);
  if (detailRaw === null || detailRaw === undefined) return { ok: false, error: "Detail must be 500 characters or less." };
  let taskId: string | null = null;
  const requestedTask = input.taskId;
  if (requestedTask !== undefined && requestedTask !== null && requestedTask !== "") {
    if (typeof requestedTask !== "string" || !file.tasks.some((task) => task.id === requestedTask.toLowerCase())) {
      return { ok: false, error: "That task is not in the audit log." };
    }
    taskId = requestedTask.toLowerCase();
  }
  const at = stamp(now);
  const execution = executionFor(kind);
  const approval: Approval = {
    id: randomUUID(),
    taskId,
    kind,
    title,
    detail: detailRaw,
    status: "pending",
    execution: execution.execution,
    executionReason: execution.executionReason,
    createdAt: at,
    decidedAt: null,
    source: "founder",
  };
  file.approvals.push(approval);
  if (taskId) {
    const task = file.tasks.find((item) => item.id === taskId);
    if (task && !isTerminal(task.status)) {
      task.status = "awaiting_approval";
      task.updatedAt = at;
    }
  }
  appendEvent(file, {
    id: randomUUID(),
    at,
    kind: "approval.requested",
    summary: `Approval requested: ${title}.`,
    taskId,
    actor: "founder",
    fields: { approvalId: approval.id, kind, execution: approval.execution },
  });
  return {
    ok: true,
    notice:
      kind === "record-only"
        ? "Request recorded. Approving it will only update the audit log."
        : `Request recorded. ${EXECUTION_REASONS[kind]}`,
  };
}

export function decideApproval(
  file: ControlFile,
  approvalId: string,
  decision: unknown,
  now: number,
): CommandResult {
  const approval = file.approvals.find((item) => item.id === approvalId);
  if (!approval) return { ok: false, error: "That approval is not in the audit log." };
  if (approval.source === "demo") return { ok: false, error: "DEMO records cannot be changed from the owner log." };
  if (approval.status !== "pending") return { ok: false, error: "That decision is already recorded." };
  if (decision !== "approved" && decision !== "declined") return { ok: false, error: "Choose approve or decline." };
  const at = stamp(now);
  approval.status = decision;
  approval.decidedAt = at;
  const execution = executionFor(approval.kind);
  approval.execution = execution.execution;
  approval.executionReason = execution.executionReason;
  appendEvent(file, {
    id: randomUUID(),
    at,
    kind: "approval.decided",
    summary:
      approval.kind === "record-only"
        ? `Founder ${decision} “${approval.title}”. Nothing external was called.`
        : `Founder ${decision} “${approval.title}”. Execution fails closed.`,
    taskId: approval.taskId,
    actor: "founder",
    fields: {
      approvalId: approval.id,
      decision,
      execution: approval.execution,
    },
  });
  if (decision === "declined") {
    return { ok: true, notice: "Decline recorded. Nothing was sent or changed outside this log." };
  }
  if (approval.kind === "record-only") {
    return { ok: true, notice: "Approval recorded. No external system was called." };
  }
  return { ok: true, notice: `Decision recorded as approved. ${approval.executionReason}` };
}

export function taskById(file: ControlFile, id: string): Task | null {
  return file.tasks.find((task) => task.id === id) ?? null;
}

export function holderLane(holder: AgentId | null): Lane | null {
  return AGENTS.find((agent) => agent.id === holder)?.lane ?? null;
}

export type { AuditEvent };
