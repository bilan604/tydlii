import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  PUSH_ALERT_KINDS,
  createFetchPushTransport,
  planPushTokenRequest,
  pushSkipMessage,
  readPushAlert,
  readPushProjectId,
  registerPushToken,
  type PushTransport,
} from "./push";

const mobileRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const PROJECT_ID = "11111111-2222-4333-8444-555555555555";

function readJson(relativePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(mobileRoot, relativePath), "utf8")) as Record<string, unknown>;
}

describe("push token plan", () => {
  it("requests a token only on a phone with permission and a project UUID", () => {
    assert.deepEqual(
      planPushTokenRequest({
        platform: "ios",
        isDevice: true,
        permission: "granted",
        projectId: `  ${PROJECT_ID}  `,
      }),
      { action: "get_token", projectId: PROJECT_ID },
    );
  });

  it("skips web, simulators, missing permission, and missing credentials", () => {
    const web = planPushTokenRequest({
      platform: "web",
      isDevice: true,
      permission: "granted",
      projectId: PROJECT_ID,
    });
    assert.deepEqual(web, { action: "skip", reason: "web" });
    const simulator = planPushTokenRequest({
      platform: "android",
      isDevice: false,
      permission: "granted",
      projectId: PROJECT_ID,
    });
    assert.deepEqual(simulator, { action: "skip", reason: "simulator" });
    assert.match(pushSkipMessage("simulator"), /physical phone/);

    const denied = planPushTokenRequest({
      platform: "ios",
      isDevice: true,
      permission: "denied",
      projectId: PROJECT_ID,
    });
    assert.deepEqual(denied, { action: "skip", reason: "permission_denied" });

    for (const projectId of [undefined, "", "eas-init-later", "your-project-id"]) {
      const plan = planPushTokenRequest({
        platform: "ios",
        isDevice: true,
        permission: "granted",
        projectId,
      });
      assert.deepEqual(plan, { action: "skip", reason: "no_project" });
    }
    assert.equal(readPushProjectId(PROJECT_ID), PROJECT_ID);
    assert.match(pushSkipMessage("no_project"), /EXPO_PUBLIC_EAS_PROJECT_ID/);
  });
});

describe("push alert payload", () => {
  it("reads job status and arrival data and drops anything else", () => {
    assert.deepEqual(readPushAlert({ kind: "arrival", jobId: " job_123 ", status: "arrived" }), {
      kind: "arrival",
      jobId: "job_123",
      status: "arrived",
    });
    assert.deepEqual(readPushAlert({ kind: "job_status", jobId: "job_9", status: "later" }), {
      kind: "job_status",
      jobId: "job_9",
    });
    assert.equal(readPushAlert(undefined), null);
    assert.equal(readPushAlert({ kind: "chat", jobId: "job_9" }), null);
    assert.equal(readPushAlert({ kind: "arrival", jobId: " " }), null);
  });
});

describe("push server registration", () => {
  function recordingTransport(): { transport: PushTransport; calls: string[] } {
    const calls: string[] = [];
    return {
      calls,
      transport: {
        async post(url) {
          calls.push(url);
          return { ok: true, status: 204 };
        },
      },
    };
  }

  it("does not call the network when the register URL is unset", async () => {
    const { transport, calls } = recordingTransport();
    const result = await registerPushToken(
      { role: "customer", token: "ExponentPushToken[abc]", platform: "ios" },
      { registerUrl: "  " },
      transport,
    );
    assert.equal(result.status, "not_sent");
    assert.match(result.message, /Not sent/);
    assert.match(result.message, /EXPO_PUBLIC_PUSH_REGISTER_URL/);
    assert.deepEqual(calls, []);
  });

  it("rejects a non-https URL before any post", async () => {
    const { transport, calls } = recordingTransport();
    const result = await registerPushToken(
      { role: "cleaner", token: "ExponentPushToken[abc]", platform: "android" },
      { registerUrl: "http://push.example/register" },
      transport,
    );
    assert.equal(result.status, "rejected");
    assert.deepEqual(calls, []);
    const withPassword = await registerPushToken(
      { role: "cleaner", token: "ExponentPushToken[abc]", platform: "android" },
      { registerUrl: "https://token:secret@push.example/register" },
      transport,
    );
    assert.equal(withPassword.status, "rejected");
    assert.deepEqual(calls, []);
  });

  it("stays a no-op when a URL is set and no transport was passed", async () => {
    const result = await registerPushToken(
      { role: "customer", token: "ExponentPushToken[abc]", platform: "ios" },
      { registerUrl: "https://push.example/register" },
    );
    assert.equal(result.status, "not_sent");
    assert.match(result.message, /Not sent/);
  });

  it("posts role, token, and both alert kinds for each app", async () => {
    for (const role of ["customer", "cleaner"] as const) {
      let body: unknown;
      const result = await registerPushToken(
        { role, token: "ExponentPushToken[abc]", platform: role === "customer" ? "ios" : "android" },
        { registerUrl: "https://push.example/register" },
        {
          async post(_url, posted) {
            body = posted;
            return { ok: true, status: 200 };
          },
        },
      );
      assert.equal(result.status, "sent");
      assert.deepEqual(body, {
        role,
        token: "ExponentPushToken[abc]",
        platform: role === "customer" ? "ios" : "android",
        alerts: [...PUSH_ALERT_KINDS],
      });
    }
  });

  it("reports a failed server without throwing", async () => {
    const down = await registerPushToken(
      { role: "customer", token: "ExponentPushToken[abc]", platform: "ios" },
      { registerUrl: "https://push.example/register" },
      {
        async post() {
          throw new Error("offline");
        },
      },
    );
    assert.equal(down.status, "failed");
    assert.match(down.message, /not saved/);
    const status = await registerPushToken(
      { role: "customer", token: "ExponentPushToken[abc]", platform: "ios" },
      { registerUrl: "https://push.example/register" },
      {
        async post() {
          return { ok: false, status: 503 };
        },
      },
    );
    assert.equal(status.status, "failed");
    assert.match(status.message, /503/);
  });

  it("sends JSON and no credential header", async () => {
    let headers: Record<string, string> | null = null;
    const transport = createFetchPushTransport(async (_url, init) => {
      headers = init.headers;
      return { ok: true, status: 202 };
    });
    const result = await registerPushToken(
      { role: "cleaner", token: "ExponentPushToken[abc]", platform: "android" },
      { registerUrl: "https://push.example/register" },
      transport,
    );
    assert.equal(result.status, "sent");
    assert.equal(headers?.authorization, undefined);
    assert.equal(headers?.["content-type"], "application/json");
    assert.equal(headers?.accept, "application/json");
  });
});

describe("push scaffold files", () => {
  it("keeps credentials out of both apps", () => {
    for (const app of ["customer", "cleaner"]) {
      const appJson = readJson(`${app}/app.json`) as { expo: { plugins: unknown[] } };
      const plugin = appJson.expo.plugins.find(
        (entry) => Array.isArray(entry) && entry[0] === "expo-notifications",
      ) as [string, Record<string, unknown>] | undefined;
      assert.ok(plugin);
      assert.equal(plugin[1].color, "#04a3ac");
      assert.equal(plugin[1].mode, "development");
      assert.equal(plugin[1].defaultChannel, "job-status");
      assert.equal(plugin[1].enableBackgroundRemoteNotifications, false);
      const blob = JSON.stringify(appJson);
      assert.doesNotMatch(blob, /projectId|google-services|GoogleService-Info|apiKey|BEGIN PRIVATE/i);

      const pkg = readJson(`${app}/package.json`) as { dependencies: Record<string, string> };
      assert.match(pkg.dependencies["expo-notifications"], /^~57\.0\./);
      assert.match(pkg.dependencies["expo-device"], /^~57\.0\./);

      const eas = JSON.stringify(readJson(`${app}/eas.json`));
      assert.doesNotMatch(eas, /EAS_PROJECT_ID|PUSH_REGISTER|google-services|FCM|APNS/i);
    }

    const example = readFileSync(join(mobileRoot, ".env.example"), "utf8");
    assert.match(example, /EXPO_PUBLIC_EAS_PROJECT_ID/);
    assert.match(example, /EXPO_PUBLIC_PUSH_REGISTER_URL/);
    assert.doesNotMatch(example, /EXPO_PUBLIC_EAS_PROJECT_ID=[0-9a-f]/i);
    assert.doesNotMatch(example, /EXPO_PUBLIC_PUSH_REGISTER_URL=https?:\/\//);

    const hook = readFileSync(new URL("./react/use-job-alerts.tsx", import.meta.url), "utf8");
    assert.match(hook, /process\.env\.EXPO_PUBLIC_EAS_PROJECT_ID/);
    assert.match(hook, /expoConfig\?\.extra/);
    assert.match(hook, /process\.env\.EXPO_PUBLIC_PUSH_REGISTER_URL/);
    const layoutCustomer = readFileSync(join(mobileRoot, "customer/app/_layout.tsx"), "utf8");
    const layoutCleaner = readFileSync(join(mobileRoot, "cleaner/app/_layout.tsx"), "utf8");
    assert.match(layoutCustomer, /PushAlertsProvider role="customer"/);
    assert.match(layoutCleaner, /PushAlertsProvider role="cleaner"/);
    assert.match(readFileSync(join(mobileRoot, "customer/app/settings.tsx"), "utf8"), /JobAlertsToggle/);
    assert.match(readFileSync(join(mobileRoot, "cleaner/app/settings.tsx"), "utf8"), /JobAlertsToggle/);
  });
});
