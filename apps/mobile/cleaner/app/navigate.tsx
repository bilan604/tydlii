import { router, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { LiveVisitMap } from "@/components/LiveVisitMap";
import { Button, Card, Chip, Screen } from "@/components/ui";
import { useCleanerLiveVisit } from "@/lib/live-visit";
import { SAMPLE_OFFER } from "@/lib/sample-offer";
import { useSession } from "@/lib/session";
import { JOB_STATUSES, JOB_STATUS_LABELS, type JobStatus } from "../../shared/src";
import { colors } from "@/theme";

function etaCopy(status: JobStatus, minutes: number | null): string {
  if (status === "done") return "Visit finished";
  if (status === "cleaning") return "At the home";
  if (status === "arrived" || minutes === 0) return "Arriving now";
  if (minutes == null) return "ETA";
  return `ETA ${minutes} min`;
}

export default function NavigateScreen() {
  const { phase, arrive } = useSession();
  const { snapshot, home, route, setStatus } = useCleanerLiveVisit();
  const onTheWay = phase === "navigating";
  const onTrip = onTheWay || phase === "arrived" || phase === "cleaning" || phase === "done";
  const status: JobStatus = snapshot?.status ?? "enroute";

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: onTheWay }} />
      <Screen title="Navigate" onBack={() => router.dismissTo("/")}>
        {onTrip ? (
          <View style={styles.stack}>
            <LiveVisitMap
              home={home}
              cleaner={snapshot?.fix ?? route[0]}
              route={route}
              label={`Live visit map. You are ${JOB_STATUS_LABELS[status]}. ${etaCopy(status, snapshot?.etaMinutes ?? null)}.`}
            />
            <Text style={styles.eta}>{etaCopy(status, snapshot?.etaMinutes ?? null)}</Text>
            <Text style={styles.note}>
              Simulated GPS for this preview. On a phone, location is when-in-use and only while this job is
              active. If location is denied, mark the status yourself. The customer still sees these chips.
            </Text>
            <View style={styles.segments}>
              {JOB_STATUSES.map((id) => (
                <View key={id} style={styles.segment}>
                  <Chip
                    fill
                    label={JOB_STATUS_LABELS[id]}
                    selected={status === id}
                    onPress={() => setStatus(id)}
                  />
                </View>
              ))}
            </View>
            <Card>
              <Text style={styles.kicker}>
                {SAMPLE_OFFER.example} · {SAMPLE_OFFER.area}
              </Text>
              <Text style={styles.title}>{SAMPLE_OFFER.place}</Text>
              <Text style={styles.body}>
                {SAMPLE_OFFER.when}
                {"\n"}
                {SAMPLE_OFFER.home}
                {"\n"}
                {SAMPLE_OFFER.rhythm}
              </Text>
            </Card>
            {onTheWay ? (
              <Button
                label="I've arrived"
                onPress={() => {
                  arrive();
                  setStatus("arrived");
                  router.replace("/job");
                }}
              />
            ) : (
              <Button label="Open the visit" onPress={() => router.replace("/job")} />
            )}
          </View>
        ) : (
          <View style={styles.stack}>
            <Text style={styles.body}>Accept a sample offer to open the trip.</Text>
            <Button label="Back home" onPress={() => router.dismissTo("/")} />
          </View>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 14 },
  eta: { color: colors.ink, fontSize: 22, fontWeight: "600", letterSpacing: -0.4 },
  note: { color: colors.ink, fontSize: 13, lineHeight: 18 },
  segments: { flexDirection: "row", gap: 6 },
  segment: { flex: 1 },
  kicker: { color: colors.ink, fontSize: 13, fontWeight: "600", marginBottom: 4 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "600", letterSpacing: -0.4 },
  body: { color: colors.ink, fontSize: 15, lineHeight: 22, marginTop: 6 },
});
