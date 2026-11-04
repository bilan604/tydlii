import { router, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { MapStub } from "@/components/MapStub";
import { Button, Chip, Screen } from "@/components/ui";
import { cad } from "@/lib/format";
import { SAMPLE_OFFER } from "@/lib/sample-offer";
import { useSession, type Phase } from "@/lib/session";
import { colors } from "@/theme";

const STEPS: { id: Phase; label: string }[] = [
  { id: "arrived", label: "Arrived" },
  { id: "cleaning", label: "Start" },
  { id: "done", label: "Done" },
];

function reached(phase: Phase, step: Phase): boolean {
  const order: Phase[] = ["arrived", "cleaning", "done"];
  return order.indexOf(phase) >= order.indexOf(step);
}

export default function JobScreen() {
  const { phase, start, finish } = useSession();
  const onJob = phase === "arrived" || phase === "cleaning" || phase === "done";

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <Screen title="On the visit" onBack={() => router.dismissTo("/")}>
        {onJob ? (
          <View style={styles.stack}>
            <MapStub phase={phase === "cleaning" ? "cleaning" : phase === "done" ? "done" : "navigate"} legend="cleaner" />
            <Text style={styles.note}>
              The visit stays on this screen. This build does not track location after you leave it.
            </Text>
            <View style={styles.segments}>
              {STEPS.map((step) => (
                <View key={step.id} style={styles.segment}>
                  <Chip fill label={step.label} selected={reached(phase, step.id)} onPress={() => {}} />
                </View>
              ))}
            </View>
            <Text style={styles.title}>
              {phase === "arrived" ? "You're at the home" : phase === "cleaning" ? "Clean in progress" : "Visit complete"}
            </Text>
            <Text style={styles.body}>
              {SAMPLE_OFFER.address}, {SAMPLE_OFFER.unit} · {SAMPLE_OFFER.area}
              {"\n"}
              You earn {cad(SAMPLE_OFFER.earn, true)} for this sample.
            </Text>
            {phase === "arrived" ? <Button label="Start" onPress={start} /> : null}
            {phase === "cleaning" ? <Button label="Done" onPress={finish} /> : null}
            {phase === "done" ? (
              <Button label="View earnings" onPress={() => router.push("/earnings")} />
            ) : null}
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
  note: { color: colors.ink, fontSize: 13, lineHeight: 18 },
  segments: { flexDirection: "row", gap: 8 },
  segment: { flex: 1 },
  title: { color: colors.ink, fontSize: 32, lineHeight: 36, fontWeight: "600", letterSpacing: -0.8 },
  body: { color: colors.ink, fontSize: 15, lineHeight: 22 },
});
