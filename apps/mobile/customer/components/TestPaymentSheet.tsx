import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import {
  createTestPaymentSheet,
  maskPublishableKey,
  type PaymentSheetConfig,
} from "../../shared/src";
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
  async function confirm() {
    const sheet = createTestPaymentSheet();
    await sheet.init(config);
    const result = await sheet.present();
    if (result.status === "completed") onPaid();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.kicker}>Stripe PaymentSheet · test mode</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Pay {amountLabel}
          </Text>
          <Text style={styles.body}>
            Nothing is sent to Stripe. The publishable key is {maskPublishableKey(config.publishableKey)}. A live key
            is refused.
          </Text>
          <View style={styles.card}>
            <Text style={styles.cardBrand}>Visa</Text>
            <Text style={styles.cardNumber}>•••• 4242</Text>
            <Text style={styles.cardMeta}>Placeholder · not a real card</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => void confirm()} style={styles.pay}>
            <Text style={styles.payLabel}>Confirm test payment</Text>
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
    padding: 20,
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
  pay: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  payLabel: { color: colors.ink, fontSize: 17, fontWeight: "700" },
  cancel: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  cancelLabel: { color: colors.ink, fontSize: 16, fontWeight: "600" },
});
