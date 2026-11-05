import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { PUSH_CHANNELS, type PushPermission } from "../push";

let handlerReady = false;

function installForegroundHandler() {
  if (handlerReady) return;
  handlerReady = true;
  // Foreground jobs should still show the banner. This does not request permission or a token.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

function permissionFrom(status: string): PushPermission {
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

export type ExpoPushClient = {
  getPermissions(): Promise<PushPermission>;
  requestPermissions(): Promise<PushPermission>;
  getExpoPushToken(projectId: string): Promise<string>;
  ensureAndroidChannels(): Promise<void>;
  addAlertListener(onData: (data: Record<string, unknown> | undefined) => void): { remove(): void };
};

/**
 * expo-notifications adapter. Safe to construct without an APNs key, an FCM key, or an Expo project id.
 * TODO: a server calls the Expo push API with an access token that never ships in this client.
 */
export function createExpoPushClient(): ExpoPushClient {
  installForegroundHandler();
  // Keep Expo from uploading a device token on its own before we have a project id and a register URL.
  void Notifications.setAutoServerRegistrationEnabledAsync(false).catch(() => {});

  return {
    async getPermissions() {
      const current = await Notifications.getPermissionsAsync();
      return permissionFrom(current.status);
    },
    async requestPermissions() {
      const current = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: false, allowSound: true },
      });
      return permissionFrom(current.status);
    },
    async getExpoPushToken(projectId: string) {
      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      return token.data;
    },
    async ensureAndroidChannels() {
      if (Platform.OS !== "android") return;
      await Notifications.setNotificationChannelAsync(PUSH_CHANNELS.job_status.id, {
        name: PUSH_CHANNELS.job_status.name,
        description: PUSH_CHANNELS.job_status.description,
        importance: Notifications.AndroidImportance.DEFAULT,
      });
      await Notifications.setNotificationChannelAsync(PUSH_CHANNELS.arrival.id, {
        name: PUSH_CHANNELS.arrival.name,
        description: PUSH_CHANNELS.arrival.description,
        importance: Notifications.AndroidImportance.HIGH,
      });
    },
    addAlertListener(onData) {
      const emit = (data: Record<string, unknown> | undefined) => onData(data);
      // TODO: after a job screen consumes this tap, call clearLastNotificationResponse so it is handled once.
      const opened = Notifications.getLastNotificationResponse();
      if (opened) emit(opened.notification.request.content.data);
      const received = Notifications.addNotificationReceivedListener((notification) => {
        emit(notification.request.content.data);
      });
      const response = Notifications.addNotificationResponseReceivedListener((event) => {
        emit(event.notification.request.content.data);
      });
      return {
        remove() {
          received.remove();
          response.remove();
        },
      };
    },
  };
}
