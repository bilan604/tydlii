import * as Crypto from "expo-crypto";
import { AuthError, type CryptoPort } from "../model";

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function digest(value: string): Promise<string> {
  try {
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
  } catch {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) {
      throw new AuthError(
        "unavailable",
        "This preview cannot save a password. Open it on localhost or a phone.",
      );
    }
    const bytes = new TextEncoder().encode(value);
    const buffer = await subtle.digest("SHA-256", bytes);
    return hex(new Uint8Array(buffer));
  }
}

export function expoCryptoPort(): CryptoPort {
  return {
    digest,
    async random(bytes) {
      return hex(await Crypto.getRandomBytesAsync(bytes));
    },
  };
}
