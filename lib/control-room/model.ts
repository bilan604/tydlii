/**
 * Control-room records. These are an audit log for the founder.
 * They are not proof that a Cursor agent is running, and they never
 * mean an external message, charge, merge, deploy, or DNS change happened.
 */

export const AGENT_IDS = ["coordinator", "intake", "pipeline", "desk"] as const;
export type AgentId = (typeof AGENT_IDS)[number];

export const LANES = ["coordination", "intake", "pipeline", "desk", "business"] as const;
export type Lane = (typeof LANES)[number];

export const TASK_STATUSES = [
  "queued",
  "active",
  "blocked",
  "awaiting_approval",
  "handed_off",
  "done",
  "cancelled",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const APPROVAL_KINDS = [
  "record-only",
  "send-external-message",
  "approve-cleaner",
  "merge",
  "deploy",
  "purchase",
  "stripe-live",
  "store-submit",
  "dns",
  "routine-change",
] as const;
export type ApprovalKind = (typeof APPROVAL_KINDS)[number];

export type Execution = "not_requested" | "fails_closed";

export type TaskSource = "founder" | "demo";

export type Task = {
  id: string;
  title: string;
  summary: string;
  lane: Lane;
  status: TaskStatus;
  holder: AgentId | null;
  dependsOn: string[];
  neighbourhood: string | null;
  createdAt: string;
  updatedAt: string;
  source: TaskSource;
};

export type Handoff = {
  id: string;
  taskId: string;
  from: AgentId | null;
  to: AgentId;
  note: string;
  createdAt: string;
  actor: "founder" | "demo";
  /** Always false. Nothing in this app notifies a specialist. */
  notified: false;
};

export type Approval = {
  id: string;
  taskId: string | null;
  kind: ApprovalKind;
  title: string;
  detail: string;
  status: "pending" | "approved" | "declined";
  execution: Execution;
  executionReason: string;
  createdAt: string;
  decidedAt: string | null;
  source: TaskSource;
};

export type AuditKind =
  | "task.created"
  | "task.status"
  | "handoff.recorded"
  | "approval.requested"
  | "approval.decided"
  | "cursor.status";

export type AuditEvent = {
  id: string;
  at: string;
  kind: AuditKind;
  summary: string;
  taskId: string | null;
  actor: "founder" | "demo" | "cursor-webhook" | "system";
  fields: Record<string, string>;
};

export type ControlFile = {
  version: 1;
  tasks: Task[];
  handoffs: Handoff[];
  approvals: Approval[];
  events: AuditEvent[];
};

export const AGENTS: readonly { id: AgentId; name: string; duty: string; lane: Lane }[] = [
  { id: "coordinator", name: "Tydlii", duty: "Coordinates the specialist desks", lane: "coordination" },
  { id: "intake", name: "Tydlii Intake", duty: "Waitlist triage", lane: "intake" },
  { id: "pipeline", name: "Tydlii Pipeline", duty: "Cleaner onboarding", lane: "pipeline" },
  { id: "desk", name: "Tydlii Desk", duty: "Decision desk", lane: "desk" },
];

export const LANE_LABEL: Record<Lane, string> = {
  coordination: "Coordination",
  intake: "Intake",
  pipeline: "Pipeline",
  desk: "Decision desk",
  business: "Business support",
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  queued: "Queued",
  active: "Active",
  blocked: "Blocked",
  awaiting_approval: "Awaiting founder",
  handed_off: "Handoff recorded",
  done: "Done",
  cancelled: "Cancelled",
};

export const KIND_LABEL: Record<ApprovalKind, string> = {
  "record-only": "Record a decision only",
  "send-external-message": "Send an external message",
  "approve-cleaner": "Approve a cleaner",
  merge: "Merge a change",
  deploy: "Deploy",
  purchase: "Purchase",
  "stripe-live": "Live Stripe charge",
  "store-submit": "Submit to an app store",
  dns: "Change DNS",
  "routine-change": "Change a routine",
};

/** Why a consequential approval cannot run. There is no success variant. */
export const EXECUTION_REASONS: Record<Exclude<ApprovalKind, "record-only">, string> = {
  "send-external-message":
    "No sanctioned send path. The control room does not email anyone. The business inbox is teamtydlii@gmail.com.",
  "approve-cleaner":
    "No cleaner-review integration. The public onboarding form is not an approval, and this room cannot accept a cleaner.",
  merge: "No GitHub write token in this app. Merges stay outside the control room.",
  deploy: "No deploy hook. This room does not start a deploy.",
  purchase: "No purchasing integration. This room does not buy anything.",
  "stripe-live": "Live Stripe is gated. This room does not create a PaymentIntent or a charge.",
  "store-submit": "Store submission is gated. There is no submit profile and this room does not upload a binary.",
  dns: "DNS is not changed from this room. Cloudflare records stay as they are.",
  "routine-change": "No routine runner. This room does not change schedules or automations.",
};

export const RECORD_ONLY_REASON =
  "Decision recorded in the audit log only. No external system is called.";

export const NOT_NOTIFIED =
  "Recorded in the control room. No specialist was notified. The agent bridge is disconnected.";

const NEXT_STATUS: Record<TaskStatus, readonly TaskStatus[]> = {
  queued: ["active", "blocked", "awaiting_approval", "cancelled"],
  active: ["blocked", "awaiting_approval", "done", "cancelled"],
  blocked: ["queued", "active", "cancelled"],
  awaiting_approval: ["active", "blocked", "cancelled"],
  handed_off: ["active", "blocked", "awaiting_approval", "cancelled"],
  done: [],
  cancelled: [],
};

export const MAX_TASKS = 200;
export const MAX_EVENTS = 400;
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function emptyControlFile(): ControlFile {
  return { version: 1, tasks: [], handoffs: [], approvals: [], events: [] };
}

export function agentById(id: string): (typeof AGENTS)[number] | null {
  return AGENTS.find((agent) => agent.id === id) ?? null;
}

export function agentName(id: AgentId | null): string {
  if (!id) return "Unassigned";
  return agentById(id)?.name ?? id;
}

export function nextStatuses(status: TaskStatus): readonly TaskStatus[] {
  return NEXT_STATUS[status];
}

export function isTerminal(status: TaskStatus): boolean {
  return status === "done" || status === "cancelled";
}

export function executionFor(kind: ApprovalKind): { execution: Execution; executionReason: string } {
  if (kind === "record-only") return { execution: "not_requested", executionReason: RECORD_ONLY_REASON };
  return { execution: "fails_closed", executionReason: EXECUTION_REASONS[kind] };
}

export function dependencyBlock(file: ControlFile, task: Task): string | null {
  for (const id of task.dependsOn) {
    const dep = file.tasks.find((item) => item.id === id);
    if (!dep) return "A dependency is missing from the audit log.";
    if (dep.status !== "done") return `Waiting on “${dep.title}”, which is ${STATUS_LABEL[dep.status].toLowerCase()}.`;
  }
  return null;
}

export function createsCycle(tasks: readonly { id: string; dependsOn: string[] }[], id: string, dependsOn: string[]): boolean {
  const graph = new Map(tasks.map((task) => [task.id, task.dependsOn]));
  graph.set(id, dependsOn);
  const stack = new Set<string>();
  const seen = new Set<string>();
  function visit(node: string): boolean {
    if (stack.has(node)) return true;
    if (seen.has(node)) return false;
    stack.add(node);
    for (const next of graph.get(node) ?? []) {
      if (visit(next)) return true;
    }
    stack.delete(node);
    seen.add(node);
    return false;
  }
  return visit(id);
}

export function appendEvent(file: ControlFile, event: AuditEvent): void {
  file.events.push(event);
  if (file.events.length > MAX_EVENTS) {
    file.events.splice(0, file.events.length - MAX_EVENTS);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length > max) return null;
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) return null;
  return text;
}

function asId(value: unknown): string | null {
  return typeof value === "string" && UUID_RE.test(value) ? value.toLowerCase() : null;
}

function asIso(value: unknown): string | null {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

function asFields(value: unknown): Record<string, string> | null {
  if (!isRecord(value)) return null;
  const fields: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!/^[a-z0-9._-]{1,40}$/i.test(key)) return null;
    if (typeof item !== "string" || item.length > 300) return null;
    fields[key] = item;
  }
  return fields;
}

function asTask(value: unknown): Task | null {
  if (!isRecord(value)) return null;
  const id = asId(value.id);
  const title = asString(value.title, 120);
  const summary = asString(value.summary, 500);
  const lane = LANES.find((item) => item === value.lane);
  const status = TASK_STATUSES.find((item) => item === value.status);
  const holder = value.holder === null ? null : AGENT_IDS.find((item) => item === value.holder);
  const neighbourhood = value.neighbourhood === null ? null : asString(value.neighbourhood, 80);
  const createdAt = asIso(value.createdAt);
  const updatedAt = asIso(value.updatedAt);
  const source = value.source === "founder" || value.source === "demo" ? value.source : null;
  if (!id || !title || summary === null || !lane || !status || holder === undefined || neighbourhood === null && value.neighbourhood !== null) {
    return null;
  }
  if (!createdAt || !updatedAt || !source) return null;
  if (!Array.isArray(value.dependsOn) || value.dependsOn.length > 8) return null;
  const dependsOn: string[] = [];
  for (const item of value.dependsOn) {
    const dep = asId(item);
    if (!dep || dependsOn.includes(dep) || dep === id) return null;
    dependsOn.push(dep);
  }
  return { id, title, summary, lane, status, holder: holder ?? null, dependsOn, neighbourhood, createdAt, updatedAt, source };
}

function asHandoff(value: unknown): Handoff | null {
  if (!isRecord(value)) return null;
  const id = asId(value.id);
  const taskId = asId(value.taskId);
  const from = value.from === null ? null : AGENT_IDS.find((item) => item === value.from);
  const to = AGENT_IDS.find((item) => item === value.to);
  const note = asString(value.note, 280);
  const createdAt = asIso(value.createdAt);
  const actor = value.actor === "founder" || value.actor === "demo" ? value.actor : null;
  if (!id || !taskId || from === undefined || !to || note === null || !createdAt || !actor) return null;
  return { id, taskId, from: from ?? null, to, note, createdAt, actor, notified: false };
}

function asApproval(value: unknown): Approval | null {
  if (!isRecord(value)) return null;
  const id = asId(value.id);
  const taskId = value.taskId === null ? null : asId(value.taskId);
  const kind = APPROVAL_KINDS.find((item) => item === value.kind);
  const title = asString(value.title, 120);
  const detail = asString(value.detail, 500);
  const status = value.status === "pending" || value.status === "approved" || value.status === "declined" ? value.status : null;
  const createdAt = asIso(value.createdAt);
  const decidedAt = value.decidedAt === null ? null : asIso(value.decidedAt);
  const source = value.source === "founder" || value.source === "demo" ? value.source : null;
  if (!id || taskId === undefined || (value.taskId !== null && !taskId) || !kind || !title || detail === null || !status || !createdAt || decidedAt === undefined && value.decidedAt !== null || !source) {
    return null;
  }
  const execution = executionFor(kind);
  return {
    id,
    taskId,
    kind,
    title,
    detail,
    status,
    execution: execution.execution,
    executionReason: execution.executionReason,
    createdAt,
    decidedAt: decidedAt ?? null,
    source,
  };
}

function asEvent(value: unknown): AuditEvent | null {
  if (!isRecord(value)) return null;
  const id = asId(value.id);
  const at = asIso(value.at);
  const kinds: AuditKind[] = [
    "task.created",
    "task.status",
    "handoff.recorded",
    "approval.requested",
    "approval.decided",
    "cursor.status",
  ];
  const kind = kinds.find((item) => item === value.kind);
  const summary = asString(value.summary, 300);
  const taskId = value.taskId === null ? null : asId(value.taskId);
  const actors = ["founder", "demo", "cursor-webhook", "system"] as const;
  const actor = actors.find((item) => item === value.actor);
  const fields = asFields(value.fields);
  if (!id || !at || !kind || !summary || (value.taskId !== null && !taskId) || !actor || !fields) return null;
  return { id, at, kind, summary, taskId, actor, fields };
}

export function parseControlFile(value: unknown): ControlFile | null {
  if (!isRecord(value) || value.version !== 1) return null;
  if (!Array.isArray(value.tasks) || !Array.isArray(value.handoffs) || !Array.isArray(value.approvals) || !Array.isArray(value.events)) {
    return null;
  }
  if (value.tasks.length > MAX_TASKS || value.events.length > MAX_EVENTS + 20) return null;
  const tasks: Task[] = [];
  for (const item of value.tasks) {
    const task = asTask(item);
    if (!task || tasks.some((existing) => existing.id === task.id)) return null;
    tasks.push(task);
  }
  const ids = new Set(tasks.map((task) => task.id));
  for (const task of tasks) {
    if (task.dependsOn.some((dep) => !ids.has(dep))) return null;
    if (createsCycle(tasks, task.id, task.dependsOn)) return null;
  }
  const handoffs: Handoff[] = [];
  for (const item of value.handoffs) {
    const handoff = asHandoff(item);
    if (!handoff || !ids.has(handoff.taskId)) return null;
    handoffs.push(handoff);
  }
  const approvals: Approval[] = [];
  for (const item of value.approvals) {
    const approval = asApproval(item);
    if (!approval || (approval.taskId && !ids.has(approval.taskId))) return null;
    approvals.push(approval);
  }
  const events: AuditEvent[] = [];
  for (const item of value.events) {
    const event = asEvent(item);
    if (!event) return null;
    events.push(event);
  }
  return { version: 1, tasks, handoffs, approvals, events: events.slice(-MAX_EVENTS) };
}
