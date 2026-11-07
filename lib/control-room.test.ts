import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { readCookie, SESSION_COOKIE, verifySession } from "./control-room/auth";
import { handleControlRequest, resetLoginThrottle } from "./control-room/http";
import { parseControlFile } from "./control-room/model";
import { parseControlPath } from "./control-room/path";
import { demoSnapshot } from "./control-room/snapshot";
import { coverageCities, coverageNeighbourhoods } from "./control-room/geo";

const PASSWORD = "owner-password-ok";
const SESSION = "session-secret-must-be-32-characters-long";
const WEBHOOK = "webhook-secret-value";

function env(extra: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    CONTROL_ROOM_OWNER_PASSWORD: PASSWORD,
    CONTROL_ROOM_SESSION_SECRET: SESSION,
    ...extra,
  };
}

async function tempPath(name: string) {
  const dir = await mkdtemp(path.join(tmpdir(), "tydlii-control-"));
  return { dir, filePath: path.join(dir, name) };
}

function cookieFrom(response: Response): string {
  const header = response.headers.get("set-cookie") ?? "";
  const pair = header.split(";")[0] ?? "";
  return pair;
}

async function signIn(filePath: string, password = PASSWORD, ip = "203.0.113.10") {
  return handleControlRequest(
    new Request("https://tydlii.test/api/control/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tydlii-control": "1",
        "x-forwarded-for": ip,
        "x-forwarded-proto": "https",
      },
      body: JSON.stringify({ password }),
    }),
    ["session"],
    { env: env(), storePath: filePath, now: () => 1_700_000_000_000 },
  );
}

test("owner sign-in is disconnected until both secrets exist", async () => {
  const response = await handleControlRequest(
    new Request("https://tydlii.test/api/control/session", {
      method: "POST",
      headers: { "content-type": "application/json", "x-tydlii-control": "1" },
      body: JSON.stringify({ password: PASSWORD }),
    }),
    ["session"],
    { env: { NODE_ENV: "test" }, now: () => 1_700_000_000_000 },
  );
  assert.equal(response.status, 503);
  const body = (await response.json()) as { missing: string[] };
  assert.ok(body.missing.includes("CONTROL_ROOM_OWNER_PASSWORD"));
  assert.ok(body.missing.includes("CONTROL_ROOM_SESSION_SECRET"));
});

test("a session cookie authorizes the owner and a bad password does not", async () => {
  resetLoginThrottle();
  const { dir, filePath } = await tempPath("control.json");
  try {
    const denied = await signIn(filePath, "not-the-password", "203.0.113.20");
    assert.equal(denied.status, 401);
    const signed = await signIn(filePath, PASSWORD, "203.0.113.21");
    assert.equal(signed.status, 200);
    const cookie = cookieFrom(signed);
    assert.match(cookie, new RegExp(`^${SESSION_COOKIE}=`));
    assert.match(signed.headers.get("set-cookie") ?? "", /HttpOnly/);
    assert.match(signed.headers.get("set-cookie") ?? "", /Secure/);
    const token = cookie.split("=").slice(1).join("=");
    assert.equal(verifySession(token, env(), 1_700_000_000_000), true);
    assert.equal(verifySession(token, env(), 1_700_000_000_000 + 13 * 60 * 60 * 1000), false);

    const state = await handleControlRequest(
      new Request("https://tydlii.test/api/control/state", { headers: { cookie } }),
      ["state"],
      { env: env(), storePath: filePath, now: () => 1_700_000_000_000 },
    );
    assert.equal(state.status, 200);
    const snapshot = (await state.json()) as { mode: string; fictional: boolean; tasks: unknown[] };
    assert.equal(snapshot.mode, "owner");
    assert.equal(snapshot.fictional, false);
    assert.deepEqual(snapshot.tasks, []);

    const hidden = await handleControlRequest(new Request("https://tydlii.test/api/control/state"), ["state"], {
      env: env(),
      storePath: filePath,
    });
    assert.equal(hidden.status, 401);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("founder records a task, a handoff, and a failing-closed approval", async () => {
  resetLoginThrottle();
  const { dir, filePath } = await tempPath("audit.json");
  try {
    const signed = await signIn(filePath, PASSWORD, "203.0.113.30");
    const cookie = cookieFrom(signed);
    const headers = { cookie, "content-type": "application/json", "x-tydlii-control": "1" };
    const created = await handleControlRequest(
      new Request("https://tydlii.test/api/control/tasks", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: "Triage the CityPlace row",
          summary: "Founder note only.",
          lane: "intake",
          neighbourhood: "CityPlace",
        }),
      }),
      ["tasks"],
      { env: env(), storePath: filePath, now: () => 1_700_000_000_000 },
    );
    assert.equal(created.status, 200);
    const createdBody = (await created.json()) as { notice: string; taskId: string };
    assert.match(createdBody.notice, /No specialist was notified/);
    const taskId = createdBody.taskId;

    const blocked = await handleControlRequest(
      new Request("https://tydlii.test/api/control/tasks", {
        method: "POST",
        headers,
        body: JSON.stringify({ title: "Desk follow-up", lane: "desk", dependsOn: [taskId] }),
      }),
      ["tasks"],
      { env: env(), storePath: filePath, now: () => 1_700_000_100_000 },
    );
    const blockedBody = (await blocked.json()) as { taskId: string };
    const active = await handleControlRequest(
      new Request(`https://tydlii.test/api/control/tasks/${blockedBody.taskId}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ status: "active" }),
      }),
      ["tasks", blockedBody.taskId],
      { env: env(), storePath: filePath, now: () => 1_700_000_200_000 },
    );
    assert.equal(active.status, 400);
    assert.match(await active.text(), /Waiting on/);

    const handoff = await handleControlRequest(
      new Request("https://tydlii.test/api/control/handoffs", {
        method: "POST",
        headers,
        body: JSON.stringify({ taskId, to: "pipeline", note: "Record only." }),
      }),
      ["handoffs"],
      { env: env(), storePath: filePath, now: () => 1_700_000_300_000 },
    );
    assert.equal(handoff.status, 200);
    assert.match((await handoff.json() as { notice: string }).notice, /disconnected/);

    const approval = await handleControlRequest(
      new Request("https://tydlii.test/api/control/approvals", {
        method: "POST",
        headers,
        body: JSON.stringify({
          taskId,
          kind: "approve-cleaner",
          title: "Do not accept a cleaner",
          detail: "This must fail closed.",
          execute: true,
          command: "approve",
        }),
      }),
      ["approvals"],
      { env: env(), storePath: filePath, now: () => 1_700_000_400_000 },
    );
    assert.equal(approval.status, 200);
    const file = parseControlFile(JSON.parse(await readFile(filePath, "utf8")));
    assert.ok(file);
    const row = file.approvals[0];
    assert.equal(row.execution, "fails_closed");
    assert.equal(row.status, "pending");
    const decided = await handleControlRequest(
      new Request(`https://tydlii.test/api/control/approvals/${row.id}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ decision: "approved", execute: true }),
      }),
      ["approvals", row.id],
      { env: env(), storePath: filePath, now: () => 1_700_000_500_000 },
    );
    assert.equal(decided.status, 200);
    const decidedBody = (await decided.json()) as { notice: string };
    assert.match(decidedBody.notice, /fails closed|cannot accept a cleaner/i);
    const saved = parseControlFile(JSON.parse(await readFile(filePath, "utf8")));
    assert.ok(saved);
    assert.equal(saved.approvals[0].status, "approved");
    assert.equal(saved.approvals[0].execution, "fails_closed");
    assert.equal(saved.handoffs[0].notified, false);
    assert.equal(saved.handoffs[0].to, "pipeline");
    assert.equal(saved.tasks.find((task) => task.id === taskId)?.holder, "pipeline");
    assert.ok(saved.events.every((event) => event.kind !== "approval.requested" || event.fields.execution === "fails_closed"));
    assert.equal(saved.events.some((event) => event.kind === "approval.decided" && event.fields.execution === "fails_closed"), true);
    assert.equal(JSON.stringify(saved).includes("execute"), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("mutations without the control header or session are refused", async () => {
  resetLoginThrottle();
  const { dir, filePath } = await tempPath("guard.json");
  try {
    const signed = await signIn(filePath, PASSWORD, "203.0.113.40");
    const cookie = cookieFrom(signed);
    const missingHeader = await handleControlRequest(
      new Request("https://tydlii.test/api/control/tasks", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ title: "Should not save", lane: "desk" }),
      }),
      ["tasks"],
      { env: env(), storePath: filePath, now: () => 1_700_000_000_000 },
    );
    assert.equal(missingHeader.status, 403);
    const stranger = await handleControlRequest(
      new Request("https://tydlii.test/api/control/tasks", {
        method: "POST",
        headers: { "content-type": "application/json", "x-tydlii-control": "1" },
        body: JSON.stringify({ title: "Should not save", lane: "desk" }),
      }),
      ["tasks"],
      { env: env(), storePath: filePath, now: () => 1_700_000_000_000 },
    );
    assert.equal(stranger.status, 401);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the Cursor status webhook stores a verified run and ignores commands", async () => {
  const { dir, filePath } = await tempPath("bridge.json");
  try {
    const payload = {
      event: "statusChange",
      timestamp: "2026-11-07T12:00:00Z",
      id: "bc_example",
      status: "FINISHED",
      summary: "Recorded a coding run",
      command: "email the cleaner",
      source: { repository: "https://github.com/bilan604/tydlii", ref: "main" },
      target: {
        branchName: "cursor/example",
        prUrl: "https://github.com/bilan604/tydlii/pull/31",
        url: "https://cursor.com/agents/bc_example",
      },
    };
    const raw = JSON.stringify(payload);
    const signature = `sha256=${createHmac("sha256", WEBHOOK).update(raw).digest("hex")}`;
    const disconnected = await handleControlRequest(
      new Request("https://tydlii.test/api/control/bridge/cursor-status", {
        method: "POST",
        headers: { "x-webhook-signature": signature, "x-webhook-id": "delivery-1" },
        body: raw,
      }),
      ["bridge", "cursor-status"],
      { env: env(), storePath: filePath },
    );
    assert.equal(disconnected.status, 503);
    await assert.rejects(readFile(filePath, "utf8"));

    const rejected = await handleControlRequest(
      new Request("https://tydlii.test/api/control/bridge/cursor-status", {
        method: "POST",
        headers: { "x-webhook-signature": "sha256=deadbeef", "x-webhook-id": "delivery-1" },
        body: raw,
      }),
      ["bridge", "cursor-status"],
      { env: env({ CONTROL_ROOM_CURSOR_WEBHOOK_SECRET: WEBHOOK }), storePath: filePath },
    );
    assert.equal(rejected.status, 401);
    await assert.rejects(readFile(filePath, "utf8"));

    const accepted = await handleControlRequest(
      new Request("https://tydlii.test/api/control/bridge/cursor-status", {
        method: "POST",
        headers: { "x-webhook-signature": signature, "x-webhook-id": "delivery-1" },
        body: raw,
      }),
      ["bridge", "cursor-status"],
      { env: env({ CONTROL_ROOM_CURSOR_WEBHOOK_SECRET: WEBHOOK }), storePath: filePath, now: () => 1_700_000_000_000 },
    );
    assert.equal(accepted.status, 200);
    const again = await handleControlRequest(
      new Request("https://tydlii.test/api/control/bridge/cursor-status", {
        method: "POST",
        headers: { "x-webhook-signature": signature, "x-webhook-id": "delivery-1" },
        body: raw,
      }),
      ["bridge", "cursor-status"],
      { env: env({ CONTROL_ROOM_CURSOR_WEBHOOK_SECRET: WEBHOOK }), storePath: filePath, now: () => 1_700_000_000_000 },
    );
    assert.equal(again.status, 200);
    const saved = parseControlFile(JSON.parse(await readFile(filePath, "utf8")));
    assert.ok(saved);
    assert.equal(saved.events.length, 1);
    assert.equal(saved.events[0].kind, "cursor.status");
    assert.equal(saved.events[0].actor, "cursor-webhook");
    assert.equal(saved.tasks.length, 0);
    assert.equal(saved.handoffs.length, 0);
    assert.equal(saved.approvals.length, 0);
    assert.equal(JSON.stringify(saved).includes("email the cleaner"), false);
    assert.equal(saved.events[0].fields.prUrl, "https://github.com/bilan604/tydlii/pull/31");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the demo preview is fictional and does not read the owner log or waitlist identities", async () => {
  const { dir, filePath } = await tempPath("private.json");
  const waitlistPath = path.join(dir, "waitlist.json");
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(
      waitlistPath,
      JSON.stringify({
        version: 1,
        entries: {
          "secret.person@example.com": {
            email: "secret.person@example.com",
            type: "customer",
            name: "Secret Person",
            phone: "416-555-0100",
            neighbourhoods: ["CityPlace"],
            notes: "private note",
            pendingUntil: null,
          },
        },
      }),
    );
    await writeFile(
      filePath,
      JSON.stringify({
        version: 1,
        tasks: [
          {
            id: "99999999-9999-4999-8999-999999999999",
            title: "Owner only title",
            summary: "secret.person@example.com",
            lane: "desk",
            status: "queued",
            holder: "desk",
            dependsOn: [],
            neighbourhood: null,
            createdAt: "2026-11-07T00:00:00.000Z",
            updatedAt: "2026-11-07T00:00:00.000Z",
            source: "founder",
          },
        ],
        handoffs: [],
        approvals: [],
        events: [],
      }),
    );
    const preview = await handleControlRequest(
      new Request("https://tydlii.test/api/control/preview/state"),
      ["preview", "state"],
      {
        env: env({ WAITLIST_STORE_PATH: waitlistPath, CONTROL_ROOM_STORE_PATH: filePath }),
        storePath: filePath,
      },
    );
    assert.equal(preview.status, 200);
    const body = await preview.text();
    assert.match(body, /DEMO/);
    assert.doesNotMatch(body, /secret\.person@example\.com/);
    assert.doesNotMatch(body, /Owner only title/);
    assert.doesNotMatch(body, /416-555-0100/);
    assert.doesNotMatch(body, /private note/);
    const snapshot = await demoSnapshot();
    assert.equal(snapshot.fictional, true);
    assert.equal(snapshot.canRecord, false);
    assert.ok(snapshot.tasks.every((task) => task.source === "demo"));
    assert.ok(snapshot.handoffs.every((handoff) => handoff.notified === false));
    assert.equal(snapshot.approvals[0].execution, "fails_closed");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("owner counts omit waitlist identities", async () => {
  resetLoginThrottle();
  const { dir, filePath } = await tempPath("counts.json");
  const waitlistPath = path.join(dir, "waitlist.json");
  try {
    await writeFile(
      waitlistPath,
      JSON.stringify({
        version: 1,
        entries: {
          "a@example.com": {
            type: "customer",
            pendingUntil: null,
            neighbourhoods: ["Liberty Village"],
            email: "a@example.com",
            name: "A Person",
            phone: "555",
            notes: "needle-note-zz",
          },
          "b@example.com": {
            type: "cleaner",
            pendingUntil: null,
            neighbourhoods: ["King West", "King West"],
            email: "b@example.com",
            name: "B Person",
          },
        },
      }),
    );
    const signed = await signIn(filePath, PASSWORD, "203.0.113.50");
    const state = await handleControlRequest(
      new Request("https://tydlii.test/api/control/state", { headers: { cookie: cookieFrom(signed) } }),
      ["state"],
      {
        env: env({ WAITLIST_STORE_PATH: waitlistPath }),
        storePath: filePath,
        now: () => 1_700_000_000_000,
      },
    );
    const text = await state.text();
    assert.equal(state.status, 200);
    assert.doesNotMatch(text, /a@example\.com/);
    assert.doesNotMatch(text, /A Person/);
    assert.doesNotMatch(text, /needle-note-zz/);
    const body = JSON.parse(text) as {
      waitlist: { status: string; confirmedCustomers: number; confirmedCleaners: number; neighbourhoods: { name: string; cleaners: number }[] };
    };
    assert.equal(body.waitlist.status, "ok");
    assert.equal(body.waitlist.confirmedCustomers, 1);
    assert.equal(body.waitlist.confirmedCleaners, 1);
    assert.equal(body.waitlist.neighbourhoods.find((item) => item.name === "King West")?.cleaners, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("paths cover the control room and reject unknown rooms", () => {
  assert.equal(parseControlPath(undefined)?.view, "overview");
  assert.equal(parseControlPath(["preview"])?.mode, "demo");
  assert.equal(parseControlPath(["preview", "business", "map"])?.view, "map");
  assert.equal(parseControlPath(["tasks", "11111111-1111-4111-8111-111111111111"])?.view, "task");
  assert.equal(parseControlPath(["preview", "sign-in"]), null);
  assert.equal(parseControlPath(["billing"]), null);
});

test("Canada coverage centres include every city and launch neighbourhood", () => {
  const cities = coverageCities();
  assert.equal(cities.length, 20);
  assert.ok(cities.some((city) => city.id === "iqaluit"));
  assert.ok(cities.some((city) => city.id === "toronto" && city.detail === "Soft launch"));
  const areas = coverageNeighbourhoods();
  assert.deepEqual(
    areas.map((area) => area.name),
    ["CityPlace", "King West", "Liberty Village", "Yonge–Eglinton", "North York Centre"],
  );
  for (const point of [...cities, ...areas]) {
    assert.ok(point.latitude > 41 && point.latitude < 84);
    assert.ok(point.longitude < -50 && point.longitude > -142);
  }
});

test("login attempts lock the caller", async () => {
  resetLoginThrottle();
  const { dir, filePath } = await tempPath("lock.json");
  try {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const response = await signIn(filePath, "wrong-password-value", "198.51.100.8");
      assert.equal(response.status, 401);
    }
    const locked = await signIn(filePath, PASSWORD, "198.51.100.8");
    assert.equal(locked.status, 429);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("readCookie returns the named value", () => {
  assert.equal(readCookie("a=1; tydlii_control_session=abc", SESSION_COOKIE), "abc");
  assert.equal(readCookie(null, SESSION_COOKIE), null);
});
