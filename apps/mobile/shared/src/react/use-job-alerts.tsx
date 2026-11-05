import Constants from "expo-constants";
import * as Device from "expo-device";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform, StyleSheet, Switch, Text, View } from "react-native";
import { brand } from "../brand";
import {
  createFetchPushTransport,
  planPushTokenRequest,
  pushSkipMessage,
  readPushAlert,
  readPushProjectId,
  registerPushToken,
  type PushAlert,
  type PushPermission,
  type PushPlatform,
  type PushRole,
} from "../push";
import { createExpoPushClient, type ExpoPushClient } from "./expo-push-client";

type PushAlertsValue = {
  permission: PushPermission;
  enabled: boolean;
  /** False on web, where Expo push tokens are not registered. */
  available: boolean;
  busy: boolean;
  detail: string;
  /** Latest job_status or arrival payload. TODO: job screens should open the visit for `jobId`. */
  lastAlert: PushAlert | null;
  enable: () => Promise<void>;
  disable: () => void;
};

const PushAlertsContext = createContext<PushAlertsValue | null>(null);

function platformOf(os: string): PushPlatform {
  if (os === "ios" || os === "android") return os;
  return "web";
}

const OFF_DETAIL = "Job status and arrival alerts are off.";

/**
 * Expo inlines EXPO_PUBLIC_EAS_PROJECT_ID only when that name is written out.
 * eas init can also leave the same UUID at extra.eas.projectId. Either one is enough.
 */
function linkedProjectId(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (readPushProjectId(fromEnv)) return fromEnv;
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: unknown } } | undefined;
  const fromConfig = typeof extra?.eas?.projectId === "string" ? extra.eas.projectId : undefined;
  if (readPushProjectId(fromConfig)) return fromConfig;
  return fromEnv ?? fromConfig;
}

/**
 * Permission and token registration for one install.
 * The switch starts off and does not prompt until the person turns it on.
 * Expo inlines `process.env.EXPO_PUBLIC_*` only when the name is written out literally.
 */
export function PushAlertsProvider({ role, children }: { role: PushRole; children: ReactNode }) {
  const platform = platformOf(Platform.OS);
  const projectId = linkedProjectId();
  const registerUrl = process.env.EXPO_PUBLIC_PUSH_REGISTER_URL;
  const available = platform !== "web";
  const client = useMemo<ExpoPushClient | null>(
    () => (available ? createExpoPushClient() : null),
    [available],
  );

  const [permission, setPermission] = useState<PushPermission>("undetermined");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState(platform === "web" ? pushSkipMessage("web") : OFF_DETAIL);
  const [lastAlert, setLastAlert] = useState<PushAlert | null>(null);

  const registerGranted = useCallback(async () => {
    if (!client) {
      setDetail(pushSkipMessage("web"));
      return;
    }
    const plan = planPushTokenRequest({
      platform,
      isDevice: Device.isDevice,
      permission: "granted",
      projectId,
    });
    if (plan.action === "skip") {
      setDetail(pushSkipMessage(plan.reason));
      return;
    }
    await client.ensureAndroidChannels();
    const token = await client.getExpoPushToken(plan.projectId);
    const result = await registerPushToken(
      { role, token, platform },
      { registerUrl },
      registerUrl?.trim() ? createFetchPushTransport() : undefined,
    );
    setDetail(result.message);
  }, [client, platform, projectId, registerUrl, role]);

  useEffect(() => {
    if (!client || !enabled) return;
    // TODO: open the visit for lastAlert.jobId once a job route accepts an id.
    const subscription = client.addAlertListener((data) => {
      const alert = readPushAlert(data);
      if (alert) setLastAlert(alert);
    });
    return () => subscription.remove();
  }, [client, enabled]);

  const enable = useCallback(async () => {
    if (!client || platform === "web") {
      setEnabled(false);
      setDetail(pushSkipMessage("web"));
      return;
    }
    setBusy(true);
    try {
      const next = await client.requestPermissions();
      setPermission(next);
      if (next !== "granted") {
        setEnabled(false);
        setDetail(pushSkipMessage(next === "denied" ? "permission_denied" : "permission_undetermined"));
        return;
      }
      setEnabled(true);
      await registerGranted();
    } catch {
      setEnabled(false);
      setDetail("Push registration failed. No token was sent.");
    } finally {
      setBusy(false);
    }
  }, [client, platform, registerGranted]);

  const disable = useCallback(() => {
    // TODO: ask the register URL to drop this device token once that endpoint exists.
    setEnabled(false);
    setDetail("Job status and arrival alerts are off in this app. The system permission is unchanged.");
  }, []);

  const value = useMemo<PushAlertsValue>(
    () => ({ permission, enabled, available, busy, detail, lastAlert, enable, disable }),
    [permission, enabled, available, busy, detail, lastAlert, enable, disable],
  );

  return <PushAlertsContext.Provider value={value}>{children}</PushAlertsContext.Provider>;
}

export function usePushAlerts(): PushAlertsValue {
  const value = useContext(PushAlertsContext);
  if (!value) throw new Error("PushAlertsProvider is missing");
  return value;
}

export function JobAlertsToggle() {
  const alerts = usePushAlerts();
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.title}>Job alerts</Text>
        <Text style={styles.body}>{alerts.detail}</Text>
      </View>
      <Switch
        accessibilityLabel="Job alerts"
        value={alerts.enabled}
        disabled={alerts.busy || !alerts.available}
        onValueChange={(value) => {
          if (value) void alerts.enable();
          else alerts.disable();
        }}
        trackColor={{ false: brand.sage, true: brand.teal }}
        thumbColor={brand.mist}
        ios_backgroundColor={brand.sage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  copy: { flex: 1, gap: 4 },
  title: { color: brand.ink, fontSize: 15, fontWeight: "600" },
  body: { color: brand.ink, fontSize: 15, lineHeight: 22 },
});
