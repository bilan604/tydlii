import * as AuthSession from "expo-auth-session";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import type { ProviderIdentity } from "../model";
import {
  acceptAppleNativeCredential,
  appleDisplayName,
  googleNativeRedirectUri,
  identityFromAppleToken,
  identityFromGoogleTokenInfo,
  identityFromGoogleUserInfo,
  planAppleAuth,
  planGoogleAuth,
  type SocialPlatform,
} from "../social";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
  userInfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
};

const APPLE_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: "https://appleid.apple.com/auth/authorize",
};

export type SocialPromptResult =
  | { type: "success"; identity: ProviderIdentity }
  | { type: "cancel"; message: string }
  | { type: "error"; message: string };

type Nonce = { raw: string; digest: string };

function platformOf(os: string): SocialPlatform {
  if (os === "ios" || os === "android") return os;
  return "web";
}

async function randomNonce(): Promise<Nonce> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  const raw = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
  return { raw, digest };
}

function safeProviderError(value: unknown): string {
  return typeof value === "string" && /^[a-z0-9_]+$/.test(value) ? value : "";
}

/**
 * Opens Google's OAuth screen and confirms the account with Google's token info
 * or userinfo endpoint. The id token and access token are not stored.
 */
export async function promptGoogleSignIn(input: {
  iosClientId?: string | null;
  androidClientId?: string | null;
  webClientId?: string | null;
}): Promise<SocialPromptResult> {
  const platform = platformOf(Platform.OS);
  const plan = planGoogleAuth({ platform, ...input });
  if (!plan.ready) return { type: "error", message: plan.message };
  if (platform !== "web" && Constants.executionEnvironment === "storeClient") {
    return {
      type: "error",
      message:
        "Continue with Google on a phone uses the reversed client-id scheme, which Expo Go cannot register. Set the Google client id, then install a development or preview build. The web preview can use EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.",
    };
  }

  const nonce = platform === "web" ? await randomNonce() : null;
  const redirectUri = platform === "web" ? AuthSession.makeRedirectUri({ path: "auth/callback" }) : googleNativeRedirectUri(plan.clientId);
  if (!redirectUri) return { type: "error", message: "Google sign-in is missing a redirect URI." };

  try {
    const request = new AuthSession.AuthRequest({
      clientId: plan.clientId,
      redirectUri,
      scopes: [
        "openid",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      responseType: platform === "web" ? AuthSession.ResponseType.IdToken : AuthSession.ResponseType.Code,
      usePKCE: platform !== "web",
      extraParams: {
        prompt: "select_account",
        ...(nonce ? { nonce: nonce.raw } : {}),
      },
    });
    await request.makeAuthUrlAsync(GOOGLE_DISCOVERY);
    const result = await request.promptAsync(GOOGLE_DISCOVERY);
    if (result.type === "cancel" || result.type === "dismiss") {
      return { type: "cancel", message: "Google sign-in was cancelled." };
    }
    if (result.type !== "success") {
      const code = safeProviderError(result.type === "error" ? result.params?.error : "");
      return {
        type: "error",
        message: code ? `Google sign-in did not complete (${code}).` : "Google sign-in did not complete.",
      };
    }

    let idToken = result.params.id_token ?? "";
    let accessToken = result.params.access_token ?? "";
    if (!idToken && result.params.code) {
      const exchanged = await AuthSession.exchangeCodeAsync(
        {
          clientId: plan.clientId,
          code: result.params.code,
          redirectUri,
          extraParams: { code_verifier: request.codeVerifier ?? "" },
        },
        GOOGLE_DISCOVERY,
      );
      idToken = exchanged.idToken ?? "";
      accessToken = exchanged.accessToken ?? "";
    }

    if (idToken) {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      const body: unknown = await response.json();
      const checked = identityFromGoogleTokenInfo(body, { audiences: plan.audiences, nonce });
      if (!checked.ok) return { type: "error", message: checked.message };
      return { type: "success", identity: checked.identity };
    }
    if (accessToken) {
      const response = await fetch(GOOGLE_DISCOVERY.userInfoEndpoint ?? "", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const body: unknown = await response.json();
      const checked = identityFromGoogleUserInfo(body);
      if (!checked.ok) return { type: "error", message: checked.message };
      return { type: "success", identity: checked.identity };
    }
    return { type: "error", message: "Google did not return a sign-in token." };
  } catch {
    return { type: "error", message: "Google sign-in could not be confirmed." };
  }
}

/**
 * iOS uses the system Sign in with Apple sheet (bundle id from app.json).
 * Android and web use AuthSession against Apple when a Services ID and https
 * redirect are set. The identity token is checked and not stored.
 */
export async function promptAppleSignIn(input: {
  bundleId: string;
  serviceId?: string | null;
  redirectUri?: string | null;
}): Promise<SocialPromptResult> {
  const platform = platformOf(Platform.OS);
  if (platform === "ios") return promptAppleNative(input.bundleId);

  const redirectUri = input.redirectUri?.trim()
    ? input.redirectUri
    : AuthSession.makeRedirectUri({ path: "auth/callback" });
  const plan = planAppleAuth({
    platform,
    bundleId: input.bundleId,
    serviceId: input.serviceId,
    redirectUri,
  });
  if (!plan.ready || plan.mode !== "browser") {
    return { type: "error", message: plan.ready ? "Sign in with Apple is not available." : plan.message };
  }

  const nonce = await randomNonce();
  try {
    const request = new AuthSession.AuthRequest({
      clientId: plan.serviceId,
      redirectUri: plan.redirectUri,
      scopes: ["name", "email"],
      responseType: AuthSession.ResponseType.IdToken,
      usePKCE: false,
      extraParams: { response_mode: "fragment", nonce: nonce.raw },
    });
    await request.makeAuthUrlAsync(APPLE_DISCOVERY);
    const result = await request.promptAsync(APPLE_DISCOVERY);
    if (result.type === "cancel" || result.type === "dismiss") {
      return { type: "cancel", message: "Sign in with Apple was cancelled." };
    }
    if (result.type !== "success") {
      const code = safeProviderError(result.type === "error" ? result.error?.code ?? result.params?.error : "");
      return {
        type: "error",
        message: code ? `Sign in with Apple did not complete (${code}).` : "Sign in with Apple did not complete.",
      };
    }
    const idToken = result.params.id_token ?? "";
    if (!idToken) return { type: "error", message: "Apple did not return a sign-in token." };
    const checked = identityFromAppleToken(idToken, {
      allowedAudiences: plan.allowedAudiences,
      nonce,
      fullName: appleDisplayName({ userJson: result.params.user ?? null }),
    });
    if (!checked.ok) return { type: "error", message: checked.message };
    return { type: "success", identity: checked.identity };
  } catch {
    return { type: "error", message: "Sign in with Apple could not be confirmed." };
  }
}

async function promptAppleNative(bundleId: string): Promise<SocialPromptResult> {
  const plan = planAppleAuth({ platform: "ios", bundleId });
  if (!plan.ready || plan.mode !== "native") {
    return { type: "error", message: plan.ready ? "Sign in with Apple is not available." : plan.message };
  }
  let apple: typeof import("expo-apple-authentication");
  try {
    apple = await import("expo-apple-authentication");
  } catch {
    return { type: "error", message: "Sign in with Apple is not installed in this build." };
  }
  try {
    if (!(await apple.isAvailableAsync())) {
      return { type: "error", message: "Sign in with Apple is not available on this device." };
    }
    const nonce = await randomNonce();
    const credential = await apple.signInAsync({
      requestedScopes: [apple.AppleAuthenticationScope.FULL_NAME, apple.AppleAuthenticationScope.EMAIL],
      nonce: nonce.raw,
    });
    const checked = acceptAppleNativeCredential({
      user: credential.user,
      email: credential.email,
      fullName: formatPersonName(credential.fullName),
      identityToken: credential.identityToken,
      allowedAudiences: plan.allowedAudiences,
      nonce,
    });
    if (!checked.ok) return { type: "error", message: checked.message };
    return { type: "success", identity: checked.identity };
  } catch (error) {
    if (isAppleCancel(error)) return { type: "cancel", message: "Sign in with Apple was cancelled." };
    return { type: "error", message: "Sign in with Apple did not complete." };
  }
}

function formatPersonName(
  name: { givenName?: string | null; familyName?: string | null } | null,
): string | null {
  if (!name) return null;
  const full = [name.givenName, name.familyName]
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join(" ");
  return full || null;
}

function isAppleCancel(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ERR_REQUEST_CANCELED";
}
