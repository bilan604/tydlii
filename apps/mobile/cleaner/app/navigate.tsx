import { router, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { MapStub } from "@/components/MapStub";
import { Button, Card, Screen } from "@/components/ui";
import { SAMPLE_OFFER } from "@/lib/sample-offer";
import { useSession } from "@/lib/session";
import { colors } from "@/theme";

export default function NavigateScreen() {
  const { phase, arrive } = useSession();
  const onTheWay = phase === "navigating";

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: onTheWay }} />
      <Screen title="Navigate" onBack={() => router.dismissTo("/")}>
        {onTheWay || phase === "arrived" || phase === "cleaning" || phase === "done" ? (
          <View style={styles.stack}>
            <MapStub phase="navigate" legend="cleaner" />
            <Text style={styles.note}>Sample drawing. This build does not open maps or read GPS.</Text>
            <Card>
              <Text style={styles.kicker}>{SAMPLE_OFFER.area}</Text>
              <Text style={styles.title}>
                {SAMPLE_OFFER.address}, {SAMPLE_OFFER.unit}
              </Text>
              <Text style={styles.body}>
                {SAMPLE_OFFER.when}
                {"\n"}
                {SAMPLE_OFFER.home}
              </Text>
            </Card>
            <Card>
              <Text style={styles.kicker}>Sample steps</Text>
              <Text style={styles.body}>
                1. The lobby is the meeting point in this preview.{"\n"}
                2. Use the unit on the offer.{"\n"}
                3. Mark arrived when you are at the door.
              </Text>
            </Card>
            {onTheWay ? (
              <Button
                label="I've arrived"
                onPress={() => {
                  arrive();
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
  note: { color: colors.ink, fontSize: 13, lineHeight: 18 },
  kicker: { color: colors.ink, fontSize: 13, fontWeight: "600", marginBottom: 4 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "600", letterSpacing: -0.4 },
  body: { color: colors.ink, fontSize: 15, lineHeight: 22, marginTop: 6 },
});
