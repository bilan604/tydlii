import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  createTestPaymentSheet,
  maskPublishableKey,
  type PaymentSheetConfig,
} from "../../shared/src/payments";
import { colors } from "@/theme";

export function TestPaymentSheet({
  visible,
  config,
  amountLabel,
  onClose,
  onPaid,
}: {
  visible: boolean;
  config: PaymentSheetConfig;
  amountLabel: string;
  onClose: () => void;
  onPaid: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const sheet = createTestPaymentSheet();
      await sheet.init(config);
      const result = await sheet.present();
      if (result.status === "completed" && result.testMode) onPaid();
      else setError("Test payment did not complete.");
    } catch {
      setError("Test payment was refused.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <Text style={styles.kicker}>Stripe PaymentSheet · test mode</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Pay {amountLabel}
          </Text>
          <Text style={styles.body}>
            Tydlii · {config.currency.toUpperCase()} · nothing is sent to Stripe. Key{" "}
            {maskPublishableKey(config.publishableKey)}. A live key is refused.
          </Text>
          <View style={styles.card}>
            <Text style={styles.cardBrand}>Visa</Text>
            <Text style={styles.cardNumber}>•••• 4242</Text>
            <Text style={styles.cardMeta}>Placeholder card. Not charged.</Text>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() => void confirm()}
            style={[styles.pay, busy && styles.disabled]}
          >
            <Text style={styles.payLabel}>{busy ? "Confirming…" : "Confirm test payment"}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void createTestPaymentSheet().cancel();
              onClose();
            }}
            style={styles.cancel}
          >
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(7, 7, 7, 0.45)",
  },
  sheet: {
    backgroundColor: colors.mist,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  kicker: { color: colors.teal, fontSize: 13, fontWeight: "700" },
  title: { color: colors.ink, fontSize: 28, fontWeight: "600", letterSpacing: -0.6 },
  body: { color: colors.ink, fontSize: 15, lineHeight: 21 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  cardBrand: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  cardNumber: { color: colors.ink, fontSize: 22, fontWeight: "600", letterSpacing: 1 },
  cardMeta: { color: colors.sage, fontSize: 13 },
  error: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  pay: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.45 },
  payLabel: { color: colors.ink, fontSize: 17, fontWeight: "700" },
  cancel: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  cancelLabel: { color: colors.ink, fontSize: 16, fontWeight: "600" },
});
