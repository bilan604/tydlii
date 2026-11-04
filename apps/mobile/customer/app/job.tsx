import { router, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { LiveVisitMap } from "@/components/LiveVisitMap";
import { Button, Card, Chip, Screen } from "@/components/ui";
import { useBooking } from "@/lib/booking";
import { cad } from "@/lib/format";
import { useLiveVisit } from "@/lib/use-live-visit";
import { JOB_STATUSES, JOB_STATUS_LABELS, type JobStatus } from "../../shared/src";
import { colors } from "@/theme";

function headline(status: JobStatus): string {
  if (status === "enroute") return "On the way";
  if (status === "arrived") return "Arrived";
  if (status === "cleaning") return "Cleaning now";
  return "Done";
}

function detail(status: JobStatus, when: string, sample: boolean): string {
  if (status === "enroute") return sample ? "Simulated GPS · window 9:00–10:00" : `In the window you booked · ${when}`;
  if (status === "arrived") return "Your Tydlii-certified cleaner is at the home.";
  if (status === "cleaning") return "Your Tydlii-certified cleaner is in the home.";
  return "The visit is finished. The price stayed locked.";
}

function etaCopy(status: JobStatus, minutes: number | null): string {
  if (status === "done") return "Visit finished";
  if (status === "cleaning") return "At the home";
  if (status === "arrived" || minutes === 0) return "Arriving now";
  if (minutes == null) return "ETA";
  return `ETA ${minutes} min`;
}

export default function JobScreen() {
  const { visit, previewSample } = useBooking();
  const { snapshot, setStatus, home, route } = useLiveVisit(Boolean(visit));
  const status = snapshot?.status ?? "enroute";

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <Screen title="Live visit" onBack={() => router.dismissTo("/")}>
        {visit ? (
          <View style={styles.stack}>
            {visit.sample ? (
              <Text style={styles.banner}>
                Sample visit, using the {cad(visit.beforeHst)} locked price from the site preview. Simulated GPS
                on this phone. No cleaner is dispatched.
              </Text>
            ) : null}
            <LiveVisitMap
              home={home}
              cleaner={snapshot?.fix ?? route[0]}
              route={route}
              label={`Live visit map. Cleaner is ${JOB_STATUS_LABELS[status]}. ${etaCopy(status, snapshot?.etaMinutes ?? null)}.`}
            />
            <Text style={styles.eta}>{etaCopy(status, snapshot?.etaMinutes ?? null)}</Text>
            <Text style={styles.note}>
              This preview simulates the cleaner’s GPS. A store build tracks the cleaner only during an active
              job and stops at Done. Your phone’s location is not used.
            </Text>

            <View style={styles.segments}>
              {JOB_STATUSES.map((id) => (
                <View key={id} style={styles.segment}>
                  <Chip fill label={JOB_STATUS_LABELS[id]} selected={status === id} onPress={() => setStatus(id)} />
                </View>
              ))}
            </View>

            <Text accessibilityRole="header" style={styles.title}>
              {headline(status)}
            </Text>
            <Text style={styles.body}>{detail(status, visit.when, visit.sample)}</Text>

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
  eta: { color: colors.ink, fontSize: 22, fontWeight: "600", letterSpacing: -0.4 },
  note: { color: colors.ink, fontSize: 13, lineHeight: 18 },
  segments: { flexDirection: "row", gap: 6 },
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
