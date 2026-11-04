import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  STRIPE_TEST_KEY_PLACEHOLDER,
  amountToCents,
  resolveStripeTestConfig,
  type PaymentSheetConfig,
} from "../../shared/src";
import { TestPaymentSheet } from "@/components/TestPaymentSheet";
import { Button, Card, Screen } from "@/components/ui";
import { useBooking } from "@/lib/booking";
import { upcomingDays, windowLabel } from "@/lib/draft";
import { cad } from "@/lib/format";
import { presentQuote } from "@/lib/present";
import { colors } from "@/theme";

function publishableKey(): string {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || STRIPE_TEST_KEY_PLACEHOLDER;
}

export default function PayScreen() {
  const { draft, confirm } = useBooking();
  const presented = presentQuote(draft);
  const day = upcomingDays().find((item) => item.id === draft.dayId);
  const ready = draft.address.trim().length >= 5 && Boolean(day) && !presented.custom;
  const [sheet, setSheet] = useState<PaymentSheetConfig | null>(null);
  const [error, setError] = useState("");

  function openSheet() {
    if (presented.custom) return;
    const resolved = resolveStripeTestConfig(
      { publishableKey: publishableKey() },
      amountToCents(presented.quote.first.withHst),
    );
    if (!resolved.ok) {
      setError(resolved.reason);
      setSheet(null);
      return;
    }
    setError("");
    setSheet(resolved.config);
  }

  return (
    <Screen
      title="Pay"
      footerTone="ink"
      footer={
        ready && !presented.custom ? (
          <View style={styles.footer}>
            <Text style={styles.totalLabel}>Total today · test mode</Text>
            <Text style={styles.total}>{cad(presented.quote.first.withHst, true)}</Text>
            <Button label="Pay in test mode" onPress={openSheet} />
            <Text style={styles.fine}>Test PaymentSheet. No charge, and a live Stripe key is refused.</Text>
          </View>
        ) : (
          <Button label="Back to booking" onPress={() => router.replace("/book")} />
        )
      }
    >
      {presented.custom || !ready ? (
        <Text style={styles.intro}>Finish the address and the arrival window before checkout.</Text>
      ) : (
        <>
          <Card>
            <Text style={styles.kicker}>Visit</Text>
            <Text style={styles.title}>
              {draft.address.trim()}
              {draft.unit.trim() ? `, ${draft.unit.trim()}` : ""}
            </Text>
            <Text style={styles.body}>
              {draft.area}
              {"\n"}
              {day?.label} · {windowLabel(draft.windowId)}
              {"\n"}
              {presented.quote.bedrooms}-bedroom · {presented.quote.label}
              {"\n"}
              {presented.quote.frequencyLabel} · {presented.quote.conditionLabel}
            </Text>
          </Card>

          <View style={styles.rows}>
            <Row label="This visit, before HST" value={cad(presented.quote.first.beforeHst)} />
            <Row label="With 13% HST" value={cad(presented.quote.first.withHst, true)} />
          </View>

          {presented.quote.plan ? (
            <Text style={styles.body}>
              From visit two, the {presented.quote.frequencyLabel.toLowerCase()} price is{" "}
              {cad(presented.quote.plan.beforeHst)} + HST.
            </Text>
          ) : null}

          <Card>
            <Text style={styles.kicker}>Payment</Text>
            <Text style={styles.title}>Test mode</Text>
            <Text style={styles.body}>
              The sheet uses a pk_test_ publishable key. It does not create a PaymentIntent and it does not store a
              card. Swap in the Stripe SDK when the founder account exists.
            </Text>
          </Card>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.body}>
            The price you see is the price for the home you described. A Tydlii-certified cleaner comes in the
            booked window. Re-clean if a Standard clean is missed.
          </Text>

          {sheet ? (
            <TestPaymentSheet
              visible
              config={sheet}
              amountLabel={cad(presented.quote.first.withHst, true)}
              onClose={() => setSheet(null)}
              onPaid={() => {
                setSheet(null);
                confirm();
                router.replace("/job");
              }}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.ink, fontSize: 16, lineHeight: 22 },
  kicker: { color: colors.ink, fontSize: 13, fontWeight: "600", marginBottom: 4 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "600", letterSpacing: -0.4 },
  body: { color: colors.ink, fontSize: 15, lineHeight: 22, marginTop: 8 },
  error: { color: colors.ink, fontSize: 15, lineHeight: 22, fontWeight: "700" },
  rows: { marginTop: 16, marginBottom: 8, gap: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  rowLabel: { color: colors.ink, fontSize: 15, flex: 1 },
  rowValue: { color: colors.ink, fontSize: 15, fontWeight: "600" },
  footer: { gap: 8 },
  totalLabel: { color: colors.sage, fontSize: 13, fontWeight: "600" },
  total: { color: colors.mist, fontSize: 36, lineHeight: 40, fontWeight: "600", letterSpacing: -1 },
  fine: { color: colors.mist, fontSize: 13, lineHeight: 18, textAlign: "center" },
});
