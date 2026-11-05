import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import { createAuthClient, type AuthClient, type IdentityInput, type PasswordInput, type SignUpInput } from "../client";
import {
  NOTICE_STORAGE_KEY,
  resolveAuthMode,
  type AppRole,
  type AuthMode,
  type DeletionReceipt,
  type MagicCode,
  type Session,
} from "../model";
import { expoCryptoPort } from "./crypto-port";
import { createDeviceStore } from "./device-store";

type Persistence = "secure-store" | "web-local";

type AuthContextValue = {
  status: "loading" | "signed_out" | "signed_in";
  session: Session | null;
  role: AppRole;
  scheme: string;
  bundleId: string;
  mode: AuthMode;
  persistence: Persistence;
  notice: string | null;
  clearNotice: () => void;
  wordmark: { light: ReactNode; ink: ReactNode };
  signUp: (input: SignUpInput) => Promise<void>;
  signInWithPassword: (input: PasswordInput) => Promise<void>;
  signInWithIdentity: (input: IdentityInput) => Promise<void>;
  requestMagicCode: (email: string) => Promise<MagicCode>;
  redeemMagicCode: (input: { email: string; code: string }) => Promise<void>;
  signOut: () => Promise<void>;
  switchRole: (next: AppRole) => Promise<void>;
  deleteAccount: () => Promise<DeletionReceipt>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredNotice(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage.getItem(NOTICE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredNotice(value: string | null): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (value) sessionStorage.setItem(NOTICE_STORAGE_KEY, value);
    else sessionStorage.removeItem(NOTICE_STORAGE_KEY);
  } catch {
    // A private browser can refuse storage. The in-memory line still shows until a reload.
  }
}

export function AuthProvider({
  role,
  scheme,
  bundleId = `com.tydlii.${role}`,
  issuer,
  clientId,
  wordmark,
  children,
}: {
  role: AppRole;
  scheme: string;
  bundleId?: string;
  issuer?: string;
  clientId?: string;
  wordmark: { light: ReactNode; ink: ReactNode };
  children: ReactNode;
}) {
  const clientRef = useRef<AuthClient | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function publishNotice(value: string | null) {
    writeStoredNotice(value);
    setNotice(value);
  }

  useEffect(() => {
    const stored = readStoredNotice();
    if (stored) setNotice(stored);
  }, []);
  const mode = useMemo(() => resolveAuthMode({ issuer, clientId }), [issuer, clientId]);
  const persistence: Persistence = Platform.OS === "web" ? "web-local" : "secure-store";

  useEffect(() => {
    let cancelled = false;
    const client = createAuthClient({
      store: createDeviceStore(),
      crypto: expoCryptoPort(),
      role,
    });
    clientRef.current = client;
    client
      .loadSession()
      .then((existing) => {
        if (cancelled) return;
        setSession(existing);
        setStatus(existing ? "signed_in" : "signed_out");
      })
      .catch(() => {
        if (cancelled) return;
        setSession(null);
        setStatus("signed_out");
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  const value = useMemo<AuthContextValue>(() => {
    function client(): AuthClient {
      if (!clientRef.current) {
        throw new Error("Sign-in is still loading.");
      }
      return clientRef.current;
    }

    return {
      status,
      session,
      role,
      scheme,
      bundleId,
      mode,
      persistence,
      notice,
      clearNotice() {
        publishNotice(null);
      },
      wordmark,
      async signUp(input) {
        const next = await client().signUp(input);
        publishNotice(null);
        setSession(next);
        setStatus("signed_in");
      },
      async signInWithPassword(input) {
        const next = await client().signInWithPassword(input);
        publishNotice(null);
        setSession(next);
        setStatus("signed_in");
      },
      async signInWithIdentity(input) {
        const next = await client().signInWithIdentity(input);
        publishNotice(null);
        setSession(next);
        setStatus("signed_in");
      },
      requestMagicCode(email) {
        return client().requestMagicCode({ email });
      },
      async redeemMagicCode(input) {
        const next = await client().redeemMagicCode(input);
        publishNotice(null);
        setSession(next);
        setStatus("signed_in");
      },
      async switchRole(next) {
        const updated = await client().switchRole(next);
        setNotice(null);
        setSession(updated);
        setStatus("signed_in");
      },
      async signOut() {
        await client().signOut();
        publishNotice("Signed out on this device.");
        setSession(null);
        setStatus("signed_out");
      },
      async deleteAccount() {
        const receipt = await client().deleteAccount({ confirmed: true });
        publishNotice(receipt.detail);
        setSession(null);
        setStatus("signed_out");
        return receipt;
      },
    };
  }, [bundleId, mode, notice, persistence, role, scheme, session, status, wordmark]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
