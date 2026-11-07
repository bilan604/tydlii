import { CLEANER_ONBOARDING_FORM_URL } from "../cleaner-onboarding";
import { LEGAL_EMAIL } from "../legal";
import { bridgeStatus } from "./bridge";
import { coverageCities, coverageNeighbourhoods, LIVE_GPS_REASON, type MapPoint } from "./geo";
import {
  AGENTS,
  KIND_LABEL,
  STATUS_LABEL,
  agentName,
  emptyControlFile,
  nextStatuses,
  type AgentId,
  type Approval,
  type AuditEvent,
  type ControlFile,
  type Handoff,
  type Task,
} from "./model";
import { connectionRows, readinessItems, readinessProbe, HOSTING_OPTIONS, type ConnectionRow, type ReadinessItem } from "./readiness";
import { controlRoomStorePath, loadControlFile } from "./store";
import { summarizeWaitlist, type WaitlistSummary } from "./summary";

export type AgentStation = {
  id: AgentId;
  name: string;
  duty: string;
  connection: "disconnected";
  holding: { id: string; title: string; status: string; source: Task["source"] } | null;
};

export type Snapshot = {
  mode: "owner" | "demo";
  fictional: boolean;
  generatedAt: string;
  canRecord: boolean;
  recordReason: string | null;
  agents: AgentStation[];
  tasks: Task[];
  handoffs: Handoff[];
  approvals: Approval[];
  events: AuditEvent[];
  readiness: ReadinessItem[];
  connections: ConnectionRow[];
  bridge: ReturnType<typeof bridgeStatus>;
  waitlist: WaitlistSummary;
  geography: { cities: MapPoint[]; neighbourhoods: MapPoint[]; liveGps: string };
  hosting: typeof HOSTING_OPTIONS;
  labels: { status: typeof STATUS_LABEL; kind: typeof KIND_LABEL };
  inbox: string;
  onboardingFormUrl: string;
  persistence: "ok" | "absent" | "unavailable";
  persistenceDetail: string;
};

const DEMO_AT = "2026-11-07T15:00:00.000Z";

const DEMO_INTAKE = "11111111-1111-4111-8111-111111111111";
const DEMO_PIPELINE = "22222222-2222-4222-8222-222222222222";
const DEMO_DESK = "33333333-3333-4333-8333-333333333333";
const DEMO_HANDOFF = "44444444-4444-4444-8444-444444444444";
const DEMO_APPROVAL = "55555555-5555-4555-8555-555555555555";

export function demoFile(): ControlFile {
  const file = emptyControlFile();
  file.tasks = [
    {
      id: DEMO_INTAKE,
      title: "DEMO triage a fictional waitlist row",
      summary: "Fictional Liberty Village customer row for the preview. No person, address, or payment is attached.",
      lane: "intake",
      status: "active",
      holder: "intake",
      dependsOn: [],
      neighbourhood: "Liberty Village",
      createdAt: DEMO_AT,
      updatedAt: DEMO_AT,
      source: "demo",
    },
    {
      id: DEMO_PIPELINE,
      title: "DEMO review a fictional onboarding packet",
      summary: "Fictional cleaner packet. The public form is not queried, and nobody is approved.",
      lane: "pipeline",
      status: "active",
      holder: "pipeline",
      dependsOn: [],
      neighbourhood: "King West",
      createdAt: DEMO_AT,
      updatedAt: DEMO_AT,
      source: "demo",
    },
    {
      id: DEMO_DESK,
      title: "DEMO hold a window exception",
      summary: "Fictional decision waiting on the onboarding review. It depends on that DEMO task and cannot run an action.",
      lane: "desk",
      status: "awaiting_approval",
      holder: "desk",
      dependsOn: [DEMO_PIPELINE],
      neighbourhood: "CityPlace",
      createdAt: DEMO_AT,
      updatedAt: DEMO_AT,
      source: "demo",
    },
  ];
  file.handoffs = [
    {
      id: DEMO_HANDOFF,
      taskId: DEMO_INTAKE,
      from: "coordinator",
      to: "intake",
      note: "DEMO fixture. Nothing was sent to Intake.",
      createdAt: DEMO_AT,
      actor: "demo",
      notified: false,
    },
  ];
  file.approvals = [
    {
      id: DEMO_APPROVAL,
      taskId: DEMO_DESK,
      kind: "approve-cleaner",
      title: "DEMO cleaner decision",
      detail: "Fictional request. Approving it is not available in the preview, and the action would fail closed anyway.",
      status: "pending",
      execution: "fails_closed",
      executionReason: "No cleaner-review integration. The public onboarding form is not an approval, and this room cannot accept a cleaner.",
      createdAt: DEMO_AT,
      decidedAt: null,
      source: "demo",
    },
  ];
  file.events = [
    {
      id: "66666666-6666-4666-8666-666666666666",
      at: DEMO_AT,
      kind: "handoff.recorded",
      summary: "DEMO handoff recorded from Tydlii to Tydlii Intake. Not sent.",
      taskId: DEMO_INTAKE,
      actor: "demo",
      fields: { from: "coordinator", to: "intake", notified: "false" },
    },
    {
      id: "77777777-7777-4777-8777-777777777777",
      at: DEMO_AT,
      kind: "approval.requested",
      summary: "DEMO approval requested. Execution fails closed.",
      taskId: DEMO_DESK,
      actor: "demo",
      fields: { kind: "approve-cleaner", execution: "fails_closed" },
    },
  ];
  return file;
}

export function demoWaitlist(): WaitlistSummary {
  return {
    status: "ok",
    confirmedCustomers: 3,
    confirmedCleaners: 1,
    unconfirmedReserves: 0,
    neighbourhoods: [
      { name: "Liberty Village", customers: 1, cleaners: 0 },
      { name: "King West", customers: 1, cleaners: 1 },
      { name: "CityPlace", customers: 1, cleaners: 0 },
    ],
  };
}

function stations(file: ControlFile): AgentStation[] {
  return AGENTS.map((agent) => {
    const task = [...file.tasks].reverse().find((item) => item.holder === agent.id && item.status !== "done" && item.status !== "cancelled");
    return {
      id: agent.id,
      name: agent.name,
      duty: agent.duty,
      connection: "disconnected",
      holding: task
        ? { id: task.id, title: task.title, status: STATUS_LABEL[task.status], source: task.source }
        : null,
    };
  });
}

function geography() {
  return {
    cities: coverageCities(),
    neighbourhoods: coverageNeighbourhoods(),
    liveGps: LIVE_GPS_REASON,
  };
}

export async function buildSnapshot(input: {
  mode: "owner" | "demo";
  file: ControlFile;
  env?: NodeJS.ProcessEnv;
  now?: number;
  canRecord: boolean;
  recordReason: string | null;
  persistence: Snapshot["persistence"];
  persistenceDetail: string;
  waitlist: WaitlistSummary;
}): Promise<Snapshot> {
  const env = input.env ?? process.env;
  const probe = await readinessProbe(env);
  const bridge = bridgeStatus(env);
  return {
    mode: input.mode,
    fictional: input.mode === "demo",
    generatedAt: new Date(input.now ?? Date.now()).toISOString(),
    canRecord: input.canRecord,
    recordReason: input.recordReason,
    agents: stations(input.file),
    tasks: input.file.tasks,
    handoffs: input.file.handoffs,
    approvals: input.file.approvals,
    events: [...input.file.events].reverse(),
    readiness: readinessItems(probe),
    connections: connectionRows(probe, bridge),
    bridge,
    waitlist: input.waitlist,
    geography: geography(),
    hosting: HOSTING_OPTIONS,
    labels: { status: STATUS_LABEL, kind: KIND_LABEL },
    inbox: LEGAL_EMAIL,
    onboardingFormUrl: CLEANER_ONBOARDING_FORM_URL,
    persistence: input.persistence,
    persistenceDetail: input.persistenceDetail,
  };
}

export async function demoSnapshot(env: NodeJS.ProcessEnv = process.env, now = Date.now()): Promise<Snapshot> {
  return buildSnapshot({
    mode: "demo",
    file: demoFile(),
    env,
    now,
    canRecord: false,
    recordReason: "DEMO preview is read-only. These records are fictional and are not saved.",
    persistence: "ok",
    persistenceDetail: "DEMO data is compiled into the preview. It is not the owner audit log and not the waitlist file.",
    waitlist: demoWaitlist(),
  });
}

export async function ownerSnapshot(env: NodeJS.ProcessEnv = process.env, filePath = controlRoomStorePath(env), now = Date.now()): Promise<Snapshot> {
  const loaded = await loadControlFile(filePath, env);
  const waitlist = await summarizeWaitlist(env);
  if (loaded.status === "unavailable") {
    return buildSnapshot({
      mode: "owner",
      file: emptyControlFile(),
      env,
      now,
      canRecord: false,
      recordReason: loaded.reason,
      persistence: "unavailable",
      persistenceDetail: loaded.reason,
      waitlist,
    });
  }
  return buildSnapshot({
    mode: "owner",
    file: loaded.file,
    env,
    now,
    canRecord: true,
    recordReason: null,
    persistence: loaded.status === "absent" ? "absent" : "ok",
    persistenceDetail:
      loaded.status === "absent"
        ? "No audit file yet. The first recorded task creates one on the server."
        : "Audit log is readable. Events below are persisted records, not a live agent feed.",
    waitlist,
  });
}

export function allowedStatusLabels(status: Task["status"]): { value: Task["status"]; label: string }[] {
  return nextStatuses(status).map((value) => ({ value, label: STATUS_LABEL[value] }));
}

export { agentName };
