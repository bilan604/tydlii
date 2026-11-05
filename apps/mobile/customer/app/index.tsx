import { RoleSwitch, openLivePage, useAuth } from "@tydlii/auth/react";
import { CLEANER_SHARE_PERCENT, DEFAULT_QUOTE_INPUT, cleanerShareAmount, quoteHome } from "@tydlii/quote";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PRIVACY_URL, TERMS_URL } from "../../shared/src";
import { BrandMark } from "@/components/BrandMark";
import { Button, Card, Screen } from "@/components/ui";
import { cad } from "@/lib/format";
import { useBooking } from "@/lib/booking";
import { colors } from "@/theme";

function LegalRow() {
  return (
    <View style={styles.legalRow}>
      <Pressable accessibilityRole="link" onPress={() => router.push("/coverage")}>
        <Text style={styles.legal}>Coverage</Text>
      </Pressable>
      <Pressable accessibilityRole="link" onPress={() => void openLivePage(PRIVACY_URL)}>
        <Text style={styles.legal}>Privacy Policy</Text>
      </Pressable>
      <Pressable accessibilityRole="link" onPress={() => void openLivePage(TERMS_URL)}>
        <Text style={styles.legal}>Terms of Service</Text>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const mode = useAuth().session?.signedInAs ?? "customer";
  if (mode === "cleaner") return <CleanerMode />;
  return <CustomerHome />;
}

function CleanerMode() {
  const { previewSample } = useBooking();
  const quote = quoteHome(DEFAULT_QUOTE_INPUT);
  const price = quote.custom || !quote.plan ? 0 : quote.plan.beforeHst;
  const earn = cleanerShareAmount(price);

  return (
    <Screen tone="ink">
      <View style={styles.stack}>
        <View>
          <BrandMark variant="light" width={176} />
          <View style={styles.rule} />
          <View style={styles.switchWrap}><RoleSwitch /></View>
          <Text accessibilityRole="header" style={styles.title}>
            Cleaner mode
          </Text>
          <Text style={styles.lede}>Same account. Offers in this app use the sample visit. Location stays off.</Text>
        </View>
        <Card>
          <Text style={styles.cardKicker}>Sample offer</Text>
          <Text style={styles.cardTitle}>Liberty Village</Text>
          <Text style={styles.cardBody}>
            2-bedroom · today, 9:00–11:00{"\n"}
            {cad(earn, true)} is {CLEANER_SHARE_PERCENT}% of {cad(price)}
          </Text>
          <Button
            label="Open the live visit"
            onPress={() => {
              previewSample();
              router.push("/job");
            }}
          />
        </Card>
        <View style={styles.actions}>
          <Button kind="quiet" tone="ink" label="Account" onPress={() => router.push("/account")} />
          <Button kind="quiet" tone="ink" label="Settings" onPress={() => router.push("/settings")} />
          <LegalRow />
        </View>
      </View>
    </Screen>
  );
}

function CustomerHome() {
  const { visit, previewSample } = useBooking();

  return (
    <Screen tone="ink">
      <View style={styles.stack}>
        <View>
          <BrandMark variant="light" width={176} />
          <View style={styles.rule} />
          <View style={styles.switchWrap}><RoleSwitch /></View>
          <Text accessibilityRole="header" style={styles.title}>
            More living.{"\n"}Less cleaning.
          </Text>
          <Text style={styles.lede}>
            Tap. Book. Relax. A flat price, then a Tydlii-certified cleaner in the window you book.
          </Text>
          <Text style={styles.note}>Re-clean if a Standard clean is missed.</Text>
        </View>

        {visit ? (
          <Card>
            <Text style={styles.cardKicker}>{visit.sample ? "Sample visit" : "Your visit"}</Text>
            <Text style={styles.cardTitle}>{visit.area}</Text>
            <Text style={styles.cardBody}>
              {visit.when}
              {"\n"}
              {visit.summary}
            </Text>
            <Text style={styles.cardPrice}>
              {cad(visit.beforeHst)} <Text style={styles.cardTax}>+ HST</Text>
            </Text>
            <Button label="View live visit" onPress={() => router.push("/job")} />
          </Card>
        ) : null}

        <View style={styles.actions}>
          <Button tone="ink" label="Book a clean" onPress={() => router.push("/book")} />
          <Button kind="quiet" tone="ink" label="Account" onPress={() => router.push("/account")} />
          <Button kind="quiet" tone="ink" label="Settings" onPress={() => router.push("/settings")} />
          {visit ? null : (
            <Button
              kind="quiet"
              tone="ink"
              label="Preview a sample visit"
              onPress={() => {
                previewSample();
                router.push("/job");
              }}
            />
          )}
          <Text style={styles.fine}>
            Sample data only. The live visit is a MapLibre map. Checkout is a Stripe test sheet and does not charge.
          </Text>
          <LegalRow />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { flexGrow: 1, justifyContent: "space-between", gap: 28, paddingBottom: 8 },
  switchWrap: { marginTop: 22 },
  rule: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.teal,
    marginTop: 18,
  },
  pill: {
    alignSelf: "flex-start",
    backgroundColor: colors.mist,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 22,
  },
  pillText: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  title: {
    color: colors.mist,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: "600",
    letterSpacing: -1.1,
    marginTop: 16,
  },
  lede: { color: colors.mist, fontSize: 17, lineHeight: 24, marginTop: 14 },
  note: { color: colors.sage, fontSize: 15, lineHeight: 21, marginTop: 10 },
  cardKicker: { color: colors.ink, fontSize: 13, fontWeight: "600", marginBottom: 4 },
  cardTitle: { color: colors.ink, fontSize: 22, fontWeight: "600", letterSpacing: -0.4 },
  cardBody: { color: colors.ink, fontSize: 15, lineHeight: 21, marginTop: 6, marginBottom: 10 },
  cardPrice: { color: colors.ink, fontSize: 28, fontWeight: "600", letterSpacing: -0.6, marginBottom: 12 },
  cardTax: { color: colors.ink, fontSize: 16, fontWeight: "600" },
  actions: { gap: 10 },
  fine: { color: colors.mist, fontSize: 13, lineHeight: 18, textAlign: "center" },
  legalRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 20 },
  legal: { color: colors.teal, fontSize: 14, fontWeight: "600", textDecorationLine: "underline" },
});
