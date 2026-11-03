import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, Screen } from "@/components/ui";
import { useBooking } from "@/lib/booking";
import { upcomingDays, windowLabel } from "@/lib/draft";
import { cad } from "@/lib/format";
import { presentQuote } from "@/lib/present";
import { colors } from "@/theme";

export default function PayScreen() {
  const { draft, confirm } = useBooking();
  const presented = presentQuote(draft);
  const day = upcomingDays().find((item) => item.id === draft.dayId);
  const ready = draft.address.trim().length >= 5 && Boolean(day) && !presented.custom;

  return (
    <Screen
      title="Pay"
      footerTone="ink"
      footer={
        ready && !presented.custom ? (
          <View style={styles.footer}>
            <Text style={styles.totalLabel}>Total today</Text>
            <Text style={styles.total}>{cad(presented.quote.first.withHst, true)}</Text>
            <Button
              label="Confirm booking"
              onPress={() => {
                confirm();
                router.replace("/job");
              }}
            />
            <Text style={styles.fine}>
              Sample checkout. No card number is collected, and nothing is charged.
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
            <Text style={styles.title}>Sample card</Text>
            <Text style={styles.body}>
              A stand-in for checkout. Stripe is not connected, and this build does not store a card.
            </Text>
          </Card>

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
