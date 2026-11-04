import { router, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { LiveVisitMap } from "@/components/LiveVisitMap";
import { Button, Chip, Screen } from "@/components/ui";
import { cad } from "@/lib/format";
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

export default function JobScreen() {
  const { phase, start, finish } = useSession();
  const { snapshot, home, route, setStatus } = useCleanerLiveVisit();
  const onJob = phase === "arrived" || phase === "cleaning" || phase === "done";
  const status: JobStatus = snapshot?.status ?? (phase === "cleaning" || phase === "done" ? phase : "arrived");

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <Screen title="On the visit" onBack={() => router.dismissTo("/")}>
        {onJob ? (
          <View style={styles.stack}>
            <LiveVisitMap
              home={home}
              cleaner={snapshot?.fix ?? home}
              route={route}
              label={`Live visit map. You are ${JOB_STATUS_LABELS[status]}. ${etaCopy(status, snapshot?.etaMinutes ?? null)}.`}
            />
            <Text style={styles.eta}>{etaCopy(status, snapshot?.etaMinutes ?? null)}</Text>
            <Text style={styles.note}>
              Location streams only while this job is active and stops at Done. If location is denied, the
              status buttons still work and the customer still sees the chips.
            </Text>
            <View style={styles.segments}>
              {JOB_STATUSES.map((id) => (
                <View key={id} style={styles.segment}>
                  <Chip fill label={JOB_STATUS_LABELS[id]} selected={status === id} onPress={() => setStatus(id)} />
                </View>
              ))}
            </View>
            <Text style={styles.title}>
              {status === "enroute"
                ? "On the way"
                : status === "arrived"
                  ? "You're at the home"
                  : status === "cleaning"
                    ? "Clean in progress"
                    : "Visit complete"}
            </Text>
            <Text style={styles.body}>
              {SAMPLE_OFFER.place} · {SAMPLE_OFFER.area}
              {"\n"}
              {SAMPLE_OFFER.example}. You earn {cad(SAMPLE_OFFER.earn, true)} ({SAMPLE_OFFER.share} of{" "}
              {cad(SAMPLE_OFFER.price)} before HST).
            </Text>
            {phase === "arrived" ? (
              <Button
                label="Start"
                onPress={() => {
                  start();
                  setStatus("cleaning");
                }}
              />
            ) : null}
            {phase === "cleaning" ? (
              <Button
                label="Done"
                onPress={() => {
                  finish();
                  setStatus("done");
                }}
              />
            ) : null}
            {phase === "done" ? <Button label="View earnings" onPress={() => router.push("/earnings")} /> : null}
          </View>
        ) : (
          <View style={styles.stack}>
            <Text style={styles.body}>Mark arrived on the trip before starting the clean.</Text>
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
  title: { color: colors.ink, fontSize: 32, lineHeight: 36, fontWeight: "600", letterSpacing: -0.8 },
  body: { color: colors.ink, fontSize: 15, lineHeight: 22 },
});
