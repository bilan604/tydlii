import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { KeyValueStore } from "../model";

const secureOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/**
 * Phone builds use SecureStore. The web preview has no keychain, so it uses localStorage.
 * Auth does not set an iOS access group: sharing the two apps needs an Apple team id.
 */
export function createDeviceStore(): KeyValueStore {
  if (Platform.OS === "web") {
    return {
      async get(key) {
        try {
          return globalThis.localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      async set(key, value) {
        globalThis.localStorage.setItem(key, value);
      },
      async remove(key) {
        globalThis.localStorage.removeItem(key);
      },
    };
  }

  return {
    get: (key) => SecureStore.getItemAsync(key),
    set: (key, value) => SecureStore.setItemAsync(key, value, secureOptions),
    remove: (key) => SecureStore.deleteItemAsync(key),
  };
}
