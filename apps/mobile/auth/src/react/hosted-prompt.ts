import * as AuthSession from "expo-auth-session";
import type { AuthMode } from "../model";

export function localCallbackBase(scheme: string): string {
  return AuthSession.makeRedirectUri({
    scheme,
    path: "auth/callback",
  });
}

/**
 * Opens the hosted provider with AuthSession and PKCE.
 * The authorization code is not exchanged and does not become a session.
 * Call this only when resolveAuthMode returns hosted.
 */
export async function promptHostedSignIn(input: {
  mode: Extract<AuthMode, { mode: "hosted" }>;
  scheme: string;
}): Promise<AuthSession.AuthSessionResult> {
  const redirectUri = localCallbackBase(input.scheme);
  const discovery = await AuthSession.fetchDiscoveryAsync(input.mode.issuer);
  const request = new AuthSession.AuthRequest({
    clientId: input.mode.clientId,
    redirectUri,
    scopes: [...input.mode.scopes],
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
  });
  return request.promptAsync(discovery);
}
