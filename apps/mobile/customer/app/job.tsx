import { router, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { MapStub } from "@/components/MapStub";
import { Button, Card, Chip, Screen } from "@/components/ui";
import { useBooking, type JobStatus } from "@/lib/booking";
import { cad } from "@/lib/format";
import { colors } from "@/theme";

const STATUSES: { id: JobStatus; label: string }[] = [
  { id: "enroute", label: "En route" },
  { id: "cleaning", label: "Cleaning" },
  { id: "done", label: "Done" },
];

export default function JobScreen() {
  const { visit, status, setStatus, previewSample } = useBooking();

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <Screen title="Live visit" onBack={() => router.dismissTo("/")}>
        {visit ? (
          <View style={styles.stack}>
            {visit.sample ? (
              <Text style={styles.banner}>
                Sample visit, using the {cad(visit.beforeHst)} locked price from the site preview. No cleaner
                is dispatched.
              </Text>
            ) : null}
            <MapStub phase={status} />
            <Text style={styles.note}>This preview does not use your location.</Text>

            <View style={styles.segments}>
              {STATUSES.map((item) => (
                <View key={item.id} style={styles.segment}>
                  <Chip
                    fill
                    label={item.label}
                    selected={status === item.id}
                    onPress={() => setStatus(item.id)}
                  />
                </View>
              ))}
            </View>

            <Text accessibilityRole="header" style={styles.title}>
              {status === "enroute" ? "On the way" : status === "cleaning" ? "Cleaning now" : "Done"}
            </Text>
            <Text style={styles.body}>
              {status === "enroute"
                ? visit.sample
                  ? "Arriving 9:12 · window 9:00–10:00"
                  : `In the window you booked · ${visit.when}`
                : status === "cleaning"
                  ? "Your Tydlii-certified cleaner is in the home."
                  : "The visit is finished. The price stayed locked."}
            </Text>

            <Card>
              <View style={styles.cleaner}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>T</Text>
                </View>
                <View style={styles.cleanerCopy}>
                  <Text style={styles.cleanerName}>Your Tydlii-certified cleaner</Text>
                  <Text style={styles.body}>Vetted · insured · re-clean if a Standard clean is missed</Text>
                </View>
              </View>
              <View style={styles.rule} />
              <View style={styles.priceRow}>
                <Text style={styles.body}>Price locked</Text>
                <Text style={styles.price}>
                  {cad(visit.beforeHst)} <Text style={styles.tax}>+ HST</Text>
                </Text>
              </View>
              <Text style={styles.meta}>
                {visit.addressLine} · {visit.area}
                {"\n"}
                {visit.summary}
              </Text>
            </Card>
          </View>
        ) : (
          <View style={styles.stack}>
            <Text style={styles.body}>Book a clean, or open the sample visit, to preview the map.</Text>
            <Button
              label="Preview a sample visit"
              onPress={() => {
                previewSample();
              }}
            />
            <Button kind="secondary" label="Book a clean" onPress={() => router.replace("/book")} />
          </View>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 14 },
  banner: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  note: { color: colors.ink, fontSize: 13 },
  segments: { flexDirection: "row", gap: 8 },
  segment: { flex: 1 },
  title: { color: colors.ink, fontSize: 32, fontWeight: "600", letterSpacing: -0.8 },
  body: { color: colors.ink, fontSize: 15, lineHeight: 21 },
  cleaner: { flexDirection: "row", gap: 12, alignItems: "center" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.mist, fontSize: 18, fontWeight: "600" },
  cleanerCopy: { flex: 1, gap: 2 },
  cleanerName: { color: colors.ink, fontSize: 16, fontWeight: "600" },
  rule: { height: 1, backgroundColor: colors.mist, marginVertical: 12 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12 },
  price: { color: colors.ink, fontSize: 22, fontWeight: "600" },
  tax: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  meta: { color: colors.ink, fontSize: 14, lineHeight: 20, marginTop: 8 },
});
