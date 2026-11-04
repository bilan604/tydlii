import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BrandMark } from "@/components/BrandMark";
import { Button, Card, Screen } from "@/components/ui";
import { cad } from "@/lib/format";
import { useBooking } from "@/lib/booking";
import { colors } from "@/theme";

export default function HomeScreen() {
  const { visit, previewSample } = useBooking();

  return (
    <Screen tone="ink">
      <View style={styles.stack}>
        <View>
          <BrandMark variant="light" width={176} />
          <View style={styles.rule} />
          <View style={styles.pill}>
            <Text style={styles.pillText}>Customer</Text>
          </View>
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
          <Text style={styles.fine}>Sample data only. The live map simulates GPS. Payment is a preview.</Text>
          <View style={styles.legalRow}>
            <Pressable accessibilityRole="link" onPress={() => router.push("/privacy")}>
              <Text style={styles.legal}>Privacy</Text>
            </Pressable>
            <Pressable accessibilityRole="link" onPress={() => router.push("/terms")}>
              <Text style={styles.legal}>Terms</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { flexGrow: 1, justifyContent: "space-between", gap: 28, paddingBottom: 8 },
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
  legalRow: { flexDirection: "row", justifyContent: "center", gap: 20 },
  legal: { color: colors.mist, fontSize: 14, fontWeight: "600", textDecorationLine: "underline" },
});
