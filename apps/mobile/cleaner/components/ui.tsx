import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/theme";

type Tone = "ink" | "mist";

export function Screen({
  tone = "mist",
  title,
  onBack,
  children,
  footer,
  footerTone = "mist",
  keyboard = false,
}: {
  tone?: Tone;
  title?: string;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  footerTone?: Tone;
  keyboard?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const ink = tone === "ink";

  const column = (
    <View style={styles.column}>
      {title ? <TopBar title={title} onBack={onBack} tone={tone} /> : null}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: footer ? 24 : Math.max(insets.bottom, 20) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      {footer ? (
        <View
          style={[
            styles.footer,
            footerTone === "ink" ? styles.footerInk : styles.footerMist,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safe, ink ? styles.safeInk : styles.safeMist]}
      edges={["top", "left", "right"]}
    >
      <StatusBar style={ink ? "light" : "dark"} />
      {keyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {column}
        </KeyboardAvoidingView>
      ) : (
        column
      )}
    </SafeAreaView>
  );
}

export function TopBar({
  title,
  onBack,
  tone,
}: {
  title: string;
  onBack?: () => void;
  tone: Tone;
}) {
  const onInk = tone === "ink";
  return (
    <View style={styles.topBar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onBack ?? (() => router.back())}
        hitSlop={8}
        style={styles.backHit}
      >
        <Text style={[styles.back, onInk && styles.onInkText]}>Back</Text>
      </Pressable>
      <Text
        accessibilityRole="header"
        style={[styles.topTitle, onInk && styles.onInkText]}
      >
        {title}
      </Text>
      <View style={styles.backHit} />
    </View>
  );
}

export function Button({
  label,
  onPress,
  kind = "primary",
  tone = "mist",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "secondary" | "quiet";
  tone?: Tone;
  disabled?: boolean;
}) {
  const onInk = tone === "ink";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        kind === "primary" && styles.btnPrimary,
        kind === "secondary" && styles.btnSecondary,
        kind === "quiet" && (onInk ? styles.btnQuietInk : styles.btnQuietMist),
        disabled && styles.btnDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.btnLabel,
          kind === "primary" && styles.btnLabelInk,
          kind === "secondary" && styles.btnLabelInk,
          kind === "quiet" && (onInk ? styles.onInkText : styles.btnLabelInk),
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  fill = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  fill?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipOn, fill && styles.chipFill]}
    >
      <Text style={[styles.chipText, fill && styles.chipTextFill]}>{label}</Text>
    </Pressable>
  );
}

export function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  optional = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  optional?: boolean;
}) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>
        {label}
        {optional ? " (optional)" : ""}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.sage}
        autoCorrect={false}
        autoCapitalize="words"
        textContentType={optional ? "none" : "fullStreetAddress"}
        style={styles.input}
      />
    </View>
  );
}

export function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <View style={styles.stepperCopy}>
        <Text style={styles.blockTitle}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <View style={styles.stepperControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          disabled={value <= min}
          onPress={() => onChange(Math.max(min, value - 1))}
          style={[styles.stepBtn, value <= min && styles.btnDisabled]}
        >
          <Text style={styles.stepBtnText}>-</Text>
        </Pressable>
        <Text style={styles.stepValue}>{value}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          disabled={value >= max}
          onPress={() => onChange(Math.min(max, value + 1))}
          style={[styles.stepBtn, value >= max && styles.btnDisabled]}
        >
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1 },
  safeInk: { backgroundColor: colors.ink },
  safeMist: { backgroundColor: colors.mist },
  column: {
    flex: 1,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 10,
  },
  footerInk: { backgroundColor: colors.ink },
  footerMist: { backgroundColor: colors.mist },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    minHeight: 52,
  },
  backHit: {
    width: 72,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  back: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "600",
  },
  onInkText: { color: colors.mist },
  topTitle: {
    flex: 1,
    textAlign: "center",
    color: colors.ink,
    fontSize: 17,
    fontWeight: "600",
  },
  btn: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1.5,
  },
  btnPrimary: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  btnSecondary: {
    backgroundColor: colors.white,
    borderColor: colors.sage,
  },
  btnQuietInk: {
    backgroundColor: "transparent",
    borderColor: colors.mist,
  },
  btnQuietMist: {
    backgroundColor: "transparent",
    borderColor: colors.ink,
  },
  btnDisabled: { opacity: 0.4 },
  pressed: { opacity: 0.82 },
  btnLabel: { fontSize: 17, fontWeight: "600" },
  btnLabelInk: { color: colors.ink },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.sage,
    justifyContent: "center",
  },
  chipOn: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  chipFill: { alignSelf: "stretch", alignItems: "center" },
  chipText: { color: colors.ink, fontSize: 15, fontWeight: "600" },
  chipTextFill: { textAlign: "center" },
  block: { marginBottom: 20 },
  blockTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  hint: { color: colors.ink, fontSize: 13, marginTop: -4 },
  input: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.sage,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.ink,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  stepperCopy: { flex: 1 },
  stepperControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: { color: colors.ink, fontSize: 22, fontWeight: "600", lineHeight: 26 },
  stepValue: {
    minWidth: 24,
    textAlign: "center",
    color: colors.ink,
    fontSize: 18,
    fontWeight: "600",
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
  },
});
