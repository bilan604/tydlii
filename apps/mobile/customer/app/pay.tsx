import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TestPaymentSheet } from "@/components/TestPaymentSheet";
import { Button, Card, Screen } from "@/components/ui";
import { useBooking } from "@/lib/booking";
import { upcomingDays, windowLabel } from "@/lib/draft";
import { firstVisitSentence } from "@tydlii/quote";
import { cad } from "@/lib/format";
import { presentQuote, receiptRows } from "@/lib/present";
import { colors } from "@/theme";
import {
  amountToCents,
  maskPublishableKey,
  resolveStripeTestConfig,
} from "../../shared/src/payments";

export default function PayScreen() {
  const { draft, confirm } = useBooking();
  const presented = presentQuote(draft);
  const day = upcomingDays().find((item) => item.id === draft.dayId);
  const ready = draft.address.trim().length >= 5 && Boolean(day) && !presented.custom;
  const [sheetOpen, setSheetOpen] = useState(false);
  const amountCents = ready && !presented.custom ? amountToCents(presented.first.withHst) : 0;
  const stripe =
    ready && !presented.custom
      ? resolveStripeTestConfig(
          { publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY },
          amountCents,
        )
      : null;

  return (
    <Screen
      title="Pay"
      footerTone="ink"
      footer={
        ready && !presented.custom ? (
          <View style={styles.footer}>
            <Text style={styles.totalLabel}>Total today</Text>
            <Text style={styles.total}>{cad(presented.first.withHst, true)}</Text>
            {stripe?.ok ? (
              <Button label="Pay with test card" onPress={() => setSheetOpen(true)} />
            ) : (
              <Button label="Payment unavailable" disabled onPress={() => {}} />
            )}
            <Text style={styles.fine}>
              {stripe?.ok
                ? "Test mode. The sheet does not call Stripe, and nothing is charged."
                : stripe?.reason}
            </Text>
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
            {presented.first.lines.length > 0 ? (
              <>
                {receiptRows(presented.first).map((row) => (
                  <Row key={row.label} label={row.label} value={cad(row.amount)} />
                ))}
                <Row label="Total before HST" value={cad(presented.first.beforeHst)} />
              </>
            ) : (
              <Row label="This visit, before HST" value={cad(presented.first.beforeHst)} />
            )}
            <Row label="With 13% HST" value={cad(presented.first.withHst, true)} />
          </View>

          {presented.firstVisit ? (
            <Text style={styles.body}>
              {presented.first.lines.length > 0
                ? `First visit is ${cad(presented.first.beforeHst)} + HST. Locked clean ${cad(presented.first.baseBeforeHst)} plus add-ons. Your plan price starts from visit two.`
                : firstVisitSentence(presented.firstVisit.kind, cad(presented.firstVisit.beforeHst))}
              {presented.plan && presented.plan.lines.length > 0
                ? ` From visit two, ${cad(presented.plan.beforeHst)} + HST (locked clean ${cad(presented.plan.baseBeforeHst)} plus add-ons).`
                : ""}
            </Text>
          ) : null}

          <Card>
            <Text style={styles.kicker}>Payment</Text>
            <Text style={styles.title}>Stripe PaymentSheet</Text>
            <Text style={styles.body}>
              {stripe?.ok
                ? `Test mode · ${maskPublishableKey(stripe.config.publishableKey)}. No PaymentIntent is created, and a pk_live_ key is refused.`
                : stripe?.reason}
            </Text>
          </Card>

          {stripe?.ok && !presented.custom ? (
            <TestPaymentSheet
              visible={sheetOpen}
              config={stripe.config}
              amountLabel={cad(presented.first.withHst, true)}
              onClose={() => setSheetOpen(false)}
              onPaid={() => {
                setSheetOpen(false);
                confirm();
                router.replace("/job");
              }}
            />
          ) : null}

          <Text style={styles.body}>
            The price you see is the price for the home you described. A Tydlii-certified cleaner comes in the
            booked window. Re-clean if a Standard clean is missed.
          </Text>
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
  rows: { marginTop: 16, marginBottom: 8, gap: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  rowLabel: { color: colors.ink, fontSize: 15, flex: 1 },
  rowValue: { color: colors.ink, fontSize: 15, fontWeight: "600" },
  footer: { gap: 8 },
  totalLabel: { color: colors.sage, fontSize: 13, fontWeight: "600" },
  total: { color: colors.mist, fontSize: 36, lineHeight: 40, fontWeight: "600", letterSpacing: -1 },
  fine: { color: colors.mist, fontSize: 13, lineHeight: 18, textAlign: "center" },
});
