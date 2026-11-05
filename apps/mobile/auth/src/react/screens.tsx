import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CONTACT_EMAIL, PRIVACY_URL, TERMS_URL, accountDeletionMailto } from "../../../shared/src/legal";
import { DELETE_ACCOUNT_URL, isAuthError, persistenceLabel, withQuery, type AppRole, type MagicCode } from "../model";
import { localCallbackBase, promptHostedSignIn } from "./hosted-prompt";
import { openLivePage } from "./open-live-page";
import { useAuth } from "./provider";

const ROLE_LABEL: Record<AppRole, string> = {
  customer: "Customer",
  cleaner: "Cleaner",
};

function otherRole(role: AppRole): string {
  return role === "customer" ? "cleaner" : "customer";
}

function messageFrom(error: unknown): string {
  if (isAuthError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong on this device.";
}

export function AuthLoading() {
  const auth = useAuth();
  return (
    <SafeAreaView style={styles.ink} edges={["top", "left", "right"]}>
      <StatusBar style="light" />
      <View style={styles.loading}>
        {auth.wordmark.light}
        <View style={styles.rule} />
        <Text style={styles.loadingText}>Tydlii</Text>
      </View>
    </SafeAreaView>
  );
}

function InkFrame({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  return (
    <SafeAreaView style={styles.ink} edges={["top", "left", "right"]}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.inkContent, { paddingBottom: Math.max(insets.bottom, 28) }]}
        >
          <View style={styles.column}>
            {auth.wordmark.light}
            <View style={styles.rule} />
            <View style={styles.pill}>
              <Text style={styles.pillText}>{ROLE_LABEL[auth.role]}</Text>
            </View>
            {auth.notice ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{auth.notice.startsWith("Not sent") ? "Not sent" : "On this device"}</Text>
                <Text style={styles.cardBody}>{auth.notice}</Text>
                <TextButton label="Dismiss" onPress={auth.clearNotice} />
              </View>
            ) : null}
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure = false,
  keyboard = "default",
  contentType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboard?: "default" | "email-address" | "number-pad";
  contentType?: "emailAddress" | "password" | "newPassword" | "name" | "oneTimeCode";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={brandSage}
        autoCapitalize={keyboard === "email-address" || secure ? "none" : "words"}
        autoCorrect={false}
        secureTextEntry={secure}
        keyboardType={keyboard}
        textContentType={contentType}
        autoComplete={
          contentType === "emailAddress"
            ? "email"
            : contentType === "password"
              ? "current-password"
              : contentType === "newPassword"
                ? "new-password"
                : contentType === "oneTimeCode"
                  ? "one-time-code"
                  : contentType === "name"
                    ? "name"
                    : "off"
        }
        style={styles.input}
      />
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.primary, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
    >
      <Text style={styles.primaryLabel}>{label}</Text>
    </Pressable>
  );
}

function QuietButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}
    >
      <Text style={styles.quietLabel}>{label}</Text>
    </Pressable>
  );
}

function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.textButton}>
      <Text style={styles.textButtonLabel}>{label}</Text>
    </Pressable>
  );
}

function LiveLegalLinks({ tone }: { tone: "ink" | "mist" }) {
  const labelStyle = tone === "ink" ? styles.legalOnInk : styles.legalOnMist;
  return (
    <View style={styles.legalRow}>
      <Pressable accessibilityRole="link" onPress={() => void openLivePage(PRIVACY_URL)} style={styles.legalHit}>
        <Text style={labelStyle}>Privacy Policy</Text>
      </Pressable>
      <Pressable accessibilityRole="link" onPress={() => void openLivePage(TERMS_URL)} style={styles.legalHit}>
        <Text style={labelStyle}>Terms of Service</Text>
      </Pressable>
    </View>
  );
}

function MistButton({
  label,
  onPress,
  kind = "primary",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "secondary";
  disabled?: boolean;
}) {
  const secondary = kind === "secondary";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        secondary ? styles.secondary : styles.primary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={styles.primaryLabel}>{label}</Text>
    </Pressable>
  );
}

export function SignInScreen() {
  const auth = useAuth();
  const [mode, setMode] = useState<"password" | "code">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [issued, setIssued] = useState<(MagicCode & { redirectUrl: string }) | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<void>) {
    setPending(true);
    setError("");
    try {
      await action();
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setPending(false);
    }
  }

  async function submitPassword() {
    await run(() => auth.signInWithPassword({ email, password }));
  }

  async function sendCode() {
    await run(async () => {
      const next = await auth.requestMagicCode(email);
      const redirectUrl = withQuery(localCallbackBase(auth.scheme), {
        email: next.email,
        code: next.code,
      });
      setIssued({ ...next, redirectUrl });
      setCode("");
    });
  }

  function openCallback() {
    if (!issued) return;
    router.push(`/auth/callback?email=${encodeURIComponent(issued.email)}&code=${encodeURIComponent(code.trim())}`);
  }

  async function hosted() {
    if (auth.mode.mode !== "hosted") return;
    const hostedMode = auth.mode;
    await run(async () => {
      const result = await promptHostedSignIn({ mode: hostedMode, scheme: auth.scheme });
      if (result.type === "cancel" || result.type === "dismiss") {
        setError("Hosted sign-in was cancelled.");
        return;
      }
      if (result.type === "error") {
        setError("Hosted sign-in did not complete. Use email on this device.");
        return;
      }
      if (result.type === "success") {
        setError(
          "The identity provider returned a code. This build does not exchange it, so no session was created. Use email on this device.",
        );
      }
    });
  }

  return (
    <InkFrame>
      <Text accessibilityRole="header" style={styles.title}>
        Sign in
      </Text>
      <Text style={styles.lede}>
        One email for Tydlii. The same address can open the {otherRole(auth.role)} app later.
      </Text>
      <Text style={styles.note}>Signing in does not use your location.</Text>

      <View style={styles.card}>
        {issued ? (
          <>
            <Text style={styles.cardTitle}>Your code is on this device</Text>
            <Text style={styles.cardBody}>
              No email was sent. A later build will mail this link. The code expires at{" "}
              {new Date(issued.expiresAt).toLocaleTimeString()}.
            </Text>
            <Text accessibilityLabel="Sign-in code" style={styles.code}>
              {issued.code}
            </Text>
            <Text selectable style={styles.redirect}>
              {issued.redirectUrl}
            </Text>
            <Field
              label="Code"
              value={code}
              onChangeText={setCode}
              placeholder="6 digits"
              keyboard="number-pad"
              contentType="oneTimeCode"
            />
            {error ? <Text style={styles.errorOnCard}>{error}</Text> : null}
            <PrimaryButton label="Continue" disabled={pending || code.trim().length !== 6} onPress={openCallback} />
            <TextButton label="Send a new code" onPress={() => void sendCode()} />
          </>
        ) : (
          <>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboard="email-address"
              contentType="emailAddress"
            />
            <View style={styles.segment}>
              <Segment label="Password" selected={mode === "password"} onPress={() => setMode("password")} />
              <Segment label="Email code" selected={mode === "code"} onPress={() => setMode("code")} />
            </View>
            {mode === "password" ? (
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                secure
                contentType="password"
              />
            ) : (
              <Text style={styles.cardBody}>
                New here? A code also creates the account. Nothing is emailed in this build.
              </Text>
            )}
            {error ? <Text style={styles.errorOnCard}>{error}</Text> : null}
            <PrimaryButton
              label={pending ? "Working…" : mode === "password" ? "Sign in" : "Email me a code"}
              disabled={pending || email.trim().length === 0 || (mode === "password" && password.length === 0)}
              onPress={() => void (mode === "password" ? submitPassword() : sendCode())}
            />
          </>
        )}
      </View>

      {auth.mode.mode === "hosted" ? (
        <PrimaryButton label="Continue with hosted sign-in" disabled={pending} onPress={() => void hosted()} />
      ) : null}
      {auth.mode.mode === "local" && auth.mode.misconfigured ? (
        <Text style={styles.note}>
          Hosted sign-in needs both EXPO_PUBLIC_AUTH_ISSUER and EXPO_PUBLIC_AUTH_CLIENT_ID. This build is using the
          on-device form.
        </Text>
      ) : null}

      <QuietButton label="Create an account" onPress={() => router.push("/sign-up")} />
      <LiveLegalLinks tone="ink" />
      <Text style={styles.fine}>Local dev auth. No email is sent and no server is called.</Text>
    </InkFrame>
  );
}

export function RoleSwitch() {
  const auth = useAuth();
  const active = auth.session?.signedInAs ?? auth.role;
  return (
    <View style={styles.segment}>
      <Segment
        label="Customer"
        selected={active === "customer"}
        onPress={() => {
          if (active !== "customer") void auth.switchRole("customer");
        }}
      />
      <Segment
        label="Cleaner"
        selected={active === "cleaner"}
        onPress={() => {
          if (active !== "cleaner") void auth.switchRole("cleaner");
        }}
      />
    </View>
  );
}

function Segment({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.segmentItem, selected && styles.segmentOn]}
    >
      <Text style={styles.segmentLabel}>{label}</Text>
    </Pressable>
  );
}

export function SignUpScreen() {
  const auth = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError("");
    try {
      await auth.signUp({ email, password, displayName: name });
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <InkFrame>
      <Text accessibilityRole="header" style={styles.title}>
        Create an account
      </Text>
      <Text style={styles.lede}>
        Use the email you want on both apps. This {auth.role} app saves it on this device only.
      </Text>
      <View style={styles.card}>
        <Field label="Name" value={name} onChangeText={setName} placeholder="Ada Lovelace" contentType="name" />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboard="email-address"
          contentType="emailAddress"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          secure
          contentType="newPassword"
        />
        <Text style={styles.cardBody}>Stored only on this device, as a salted hash. Not sent.</Text>
        {error ? <Text style={styles.errorOnCard}>{error}</Text> : null}
        <PrimaryButton
          label={pending ? "Working…" : "Create account"}
          disabled={pending || name.trim().length === 0 || email.trim().length === 0 || password.length === 0}
          onPress={() => void submit()}
        />
      </View>
      <LiveLegalLinks tone="ink" />
      <QuietButton label="Already have an account? Sign in" onPress={() => router.replace("/sign-in")} />
    </InkFrame>
  );
}

export function AccountScreen() {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const session = auth.session;
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function remove() {
    setPending(true);
    setError("");
    try {
      await auth.deleteAccount();
    } catch (cause) {
      setError(messageFrom(cause));
      setPending(false);
    }
  }

  return (
    <SafeAreaView style={styles.mist} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.topTitle}>
          Account
        </Text>
        <View style={styles.backSpacer} />
      </View>
      <ScrollView contentContainerStyle={[styles.mistContent, { paddingBottom: Math.max(insets.bottom, 28) }]}>
        <View style={styles.column}>
          {auth.wordmark.ink}
          <View style={styles.rule} />
          <RoleSwitch />
          <Text style={styles.inkBody}>
            One email. Switch customer or cleaner in this app. The other install can use the same address once a server
            exists.
          </Text>
          {session ? (
            <View style={styles.card}>
              <Text style={styles.kicker}>{ROLE_LABEL[session.signedInAs]}</Text>
              <Text style={styles.cardTitle}>{session.displayName}</Text>
              <Text style={styles.cardBody}>{session.email}</Text>
              <Text style={styles.cardBody}>
                {session.method === "password" ? "Email and password" : "Email code"}
                {" · "}
                Roles on this record: {session.roles.join(", ")}
              </Text>
              <Text style={styles.cardBody}>{persistenceLabel(auth.persistence)}</Text>
            </View>
          ) : (
            <Text style={styles.inkBody}>No session on this device.</Text>
          )}
          <Text style={styles.inkBody}>
            The same email can hold customer and cleaner. This phone keeps a separate store per app until a server
            exists. Deleting here removes both roles on this device and does not call Tydlii.
          </Text>
          <Text style={styles.inkBody}>This screen does not use your location.</Text>
          <Text style={styles.inkBody}>
            To ask Tydlii to delete records it holds, email {CONTACT_EMAIL}. The privacy policy describes that request.
          </Text>
          <MistButton kind="secondary" label="Privacy Policy" onPress={() => void openLivePage(PRIVACY_URL)} />
          <MistButton kind="secondary" label="Terms of Service" onPress={() => void openLivePage(TERMS_URL)} />
          <MistButton label="Sign out" disabled={pending} onPress={() => void auth.signOut()} />
          <TextButton
            label={`Email ${CONTACT_EMAIL}`}
            onPress={() => void Linking.openURL(accountDeletionMailto(session?.signedInAs ?? auth.role))}
          />
          {confirming ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Delete this account on this device?</Text>
              <Text style={styles.cardBody}>
                Confirming removes the account stored on this device and signs you out. Customer and cleaner on this
                email are both removed here. Nothing is sent to Tydlii. The result says Not sent.
              </Text>
              <Text style={styles.cardBody}>
                To ask Tydlii to delete records it holds, email {CONTACT_EMAIL}. The privacy policy describes that
                request.
              </Text>
              {error ? <Text style={styles.errorOnCard}>{error}</Text> : null}
              <TextButton
                label={`Email ${CONTACT_EMAIL}`}
                onPress={() => void Linking.openURL(accountDeletionMailto(session?.signedInAs ?? auth.role))}
              />
              <TextButton
                label="Deletion section on tydlii.com"
                onPress={() => void openLivePage(DELETE_ACCOUNT_URL)}
              />
              <MistButton label={pending ? "Working…" : "Confirm delete"} disabled={pending} onPress={() => void remove()} />
              <MistButton kind="secondary" label="Cancel" disabled={pending} onPress={() => setConfirming(false)} />
            </View>
          ) : (
            <MistButton kind="secondary" label="Delete account" onPress={() => setConfirming(true)} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function AuthCallbackScreen() {
  const auth = useAuth();
  const params = useLocalSearchParams<{ email?: string | string[]; code?: string | string[] }>();
  const email = firstParam(params.email);
  const code = firstParam(params.code);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!email || !code) {
      setError("This link is missing an email or a code.");
      return;
    }
    auth
      .redeemMagicCode({ email, code })
      .then(() => {
        if (!cancelled) router.replace("/");
      })
      .catch((cause) => {
        if (!cancelled) setError(messageFrom(cause));
      });
    return () => {
      cancelled = true;
    };
    // email and code only. Depending on auth would redeem again after the session updates.
  }, [email, code]);

  return (
    <InkFrame>
      <Text accessibilityRole="header" style={styles.title}>
        {error ? "Code not accepted" : "Checking the code"}
      </Text>
      <Text style={styles.lede}>
        {error || "This is the AuthSession return path. A hosted provider would land here too."}
      </Text>
      {error ? <QuietButton label="Back to sign in" onPress={() => router.replace("/sign-in")} /> : null}
    </InkFrame>
  );
}

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

const brandSage = "#5c9396";

const styles = StyleSheet.create({
  flex: { flex: 1 },
  ink: { flex: 1, backgroundColor: "#070707" },
  mist: { flex: 1, backgroundColor: "#e5f3f4" },
  column: { width: "100%", maxWidth: 480, alignSelf: "center", gap: 14 },
  inkContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 12 },
  mistContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 8, gap: 14 },
  loading: { flex: 1, alignItems: "flex-start", justifyContent: "center", paddingHorizontal: 24, maxWidth: 480, alignSelf: "center", width: "100%" },
  loadingText: { color: "#e5f3f4", fontSize: 17, marginTop: 16 },
  rule: { width: 48, height: 4, borderRadius: 2, backgroundColor: "#04a3ac", marginTop: 18 },
  pill: {
    alignSelf: "flex-start",
    backgroundColor: "#e5f3f4",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 18,
  },
  pillText: { color: "#070707", fontSize: 13, fontWeight: "600" },
  title: {
    color: "#e5f3f4",
    fontSize: 40,
    lineHeight: 44,
    fontWeight: "600",
    letterSpacing: -1.1,
    marginTop: 8,
  },
  lede: { color: "#e5f3f4", fontSize: 17, lineHeight: 24 },
  note: { color: "#5c9396", fontSize: 15, lineHeight: 21 },
  fine: { color: "#e5f3f4", fontSize: 13, lineHeight: 18, textAlign: "center" },
  card: { backgroundColor: "#ffffff", borderRadius: 20, padding: 16, gap: 12 },
  cardTitle: { color: "#070707", fontSize: 20, fontWeight: "600", letterSpacing: -0.4 },
  cardBody: { color: "#070707", fontSize: 15, lineHeight: 21 },
  kicker: { color: "#070707", fontSize: 13, fontWeight: "600" },
  code: {
    color: "#070707",
    fontSize: 36,
    fontWeight: "600",
    letterSpacing: 6,
    textAlign: "center",
  },
  redirect: { color: "#5c9396", fontSize: 12, lineHeight: 18 },
  errorOnCard: { color: "#070707", fontSize: 15, lineHeight: 21, fontWeight: "600" },
  field: { gap: 8 },
  fieldLabel: { color: "#070707", fontSize: 15, fontWeight: "600" },
  input: {
    backgroundColor: "#e5f3f4",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#5c9396",
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: "#070707",
  },
  segment: { flexDirection: "row", gap: 8 },
  segmentItem: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#5c9396",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  segmentOn: { backgroundColor: "#04a3ac", borderColor: "#04a3ac" },
  segmentLabel: { color: "#070707", fontSize: 15, fontWeight: "600" },
  primary: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "#04a3ac",
    borderWidth: 1.5,
    borderColor: "#04a3ac",
  },
  secondary: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#5c9396",
  },
  primaryLabel: { color: "#070707", fontSize: 17, fontWeight: "600" },
  quiet: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "#e5f3f4",
    backgroundColor: "transparent",
  },
  quietLabel: { color: "#e5f3f4", fontSize: 17, fontWeight: "600", textAlign: "center" },
  textButton: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  textButtonLabel: { color: "#070707", fontSize: 16, fontWeight: "600", textDecorationLine: "underline" },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.82 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    minHeight: 52,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  back: { color: "#070707", fontSize: 16, fontWeight: "600", paddingHorizontal: 12, paddingVertical: 10 },
  backSpacer: { width: 72 },
  topTitle: { flex: 1, textAlign: "center", color: "#070707", fontSize: 17, fontWeight: "600" },
  inkBody: { color: "#070707", fontSize: 15, lineHeight: 22 },
  legalRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  legalHit: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  legalOnInk: { color: "#04a3ac", fontSize: 15, fontWeight: "600", textDecorationLine: "underline" },
  legalOnMist: { color: "#04a3ac", fontSize: 15, fontWeight: "600", textDecorationLine: "underline" },
});
