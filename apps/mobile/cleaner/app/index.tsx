import { router } from "expo-router";
import { StyleSheet, Switch, Text, View } from "react-native";
import { BrandMark } from "@/components/BrandMark";
import { Button, Card, Screen } from "@/components/ui";
import { cad } from "@/lib/format";
import { SAMPLE_OFFER } from "@/lib/sample-offer";
import { useSession } from "@/lib/session";
import { colors } from "@/theme";

export default function HomeScreen() {
  const session = useSession();
  const { online, phase, declined, busy, setOnline, accept, decline } = session;
  const showOffer = online && phase === "offer";

  return (
    <Screen tone="ink">
      <View style={styles.stack}>
        <View>
          <BrandMark variant="light" width={showOffer ? 140 : 176} />
          <View style={styles.rule} />
          <View style={styles.pill}>
            <Text style={styles.pillText}>Cleaner</Text>
          </View>
          {showOffer ? (
            <Text accessibilityRole="header" style={styles.compactTitle}>
              You're online
            </Text>
          ) : (
            <>
              <Text accessibilityRole="header" style={styles.title}>
                More living.{"\n"}Less cleaning.
              </Text>
              <Text style={styles.lede}>Keep more of every job. Get paid daily.</Text>
            </>
          )}
        </View>

        <View style={styles.onlineRow}>
          <View style={styles.onlineCopy}>
            <Text style={styles.onlineTitle}>{online ? "Online" : "Offline"}</Text>
            <Text style={styles.onlineBody}>
              {busy
                ? "Finish this visit before going offline."
                : online
                  ? "Sample offers can show while you are online."
                  : "Go online when you want a sample offer."}
            </Text>
          </View>
          <Switch
            accessibilityLabel="Go online"
            value={online}
            disabled={busy}
            onValueChange={setOnline}
            trackColor={{ false: colors.sage, true: colors.teal }}
            thumbColor={colors.mist}
            ios_backgroundColor={colors.sage}
          />
        </View>

        {showOffer ? (
          <Card>
            <Text style={styles.kicker}>Sample offer</Text>
            <Text style={styles.offerArea}>{SAMPLE_OFFER.area}</Text>
            <Text style={styles.body}>
              {SAMPLE_OFFER.address}, {SAMPLE_OFFER.unit}
              {"\n"}
              {SAMPLE_OFFER.home}
              {"\n"}
              {SAMPLE_OFFER.when} · {SAMPLE_OFFER.hours}
            </Text>
            <Text style={styles.earn}>{cad(SAMPLE_OFFER.earn, true)}</Text>
            <Text style={styles.body}>
              {SAMPLE_OFFER.share} of a {cad(SAMPLE_OFFER.price)} visit. Tips would be yours.
            </Text>
            <View style={styles.offerActions}>
              <Button
                label="Accept"
                onPress={() => {
                  accept();
                  router.push("/navigate");
                }}
              />
              <Button kind="secondary" label="Decline" onPress={decline} />
            </View>
          </Card>
        ) : null}

        {online && declined && phase === "idle" ? (
          <View style={styles.block}>
            <Text style={styles.lede}>You passed on the sample offer.</Text>
            <Button label="Show the sample offer" onPress={session.showOffer} />
          </View>
        ) : null}

        {phase === "navigating" ? (
          <Button label="Continue to the home" onPress={() => router.push("/navigate")} />
        ) : null}
        {phase === "arrived" || phase === "cleaning" ? (
          <Button label="Open the visit" onPress={() => router.push("/job")} />
        ) : null}
        {phase === "done" ? (
          <View style={styles.block}>
            <Text style={styles.lede}>
              Sample visit complete. You earned {cad(SAMPLE_OFFER.earn, true)}. Replay does not add another payout.
            </Text>
            <Button label="Show the sample offer again" onPress={session.showOffer} />
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button kind="quiet" tone="ink" label="Earnings" onPress={() => router.push("/earnings")} />
          <Text style={styles.fine}>
            Sample data only. This build does not read location, including in the background, and it does not
            send a payout.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { flexGrow: 1, gap: 22, paddingBottom: 8 },
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
  compactTitle: {
    color: colors.mist,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "600",
    letterSpacing: -0.6,
    marginTop: 16,
  },
  lede: { color: colors.mist, fontSize: 17, lineHeight: 24, marginTop: 12 },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  onlineCopy: { flex: 1, gap: 4 },
  onlineTitle: { color: colors.mist, fontSize: 18, fontWeight: "600" },
  onlineBody: { color: colors.mist, fontSize: 14, lineHeight: 20 },
  kicker: { color: colors.ink, fontSize: 13, fontWeight: "600", marginBottom: 4 },
  offerArea: { color: colors.ink, fontSize: 24, fontWeight: "600", letterSpacing: -0.4 },
  body: { color: colors.ink, fontSize: 15, lineHeight: 21, marginTop: 6 },
  earn: {
    color: colors.ink,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "600",
    letterSpacing: -1,
    marginTop: 10,
  },
  offerActions: { gap: 10, marginTop: 16 },
  block: { gap: 12 },
  actions: { gap: 10, marginTop: "auto" },
  fine: { color: colors.mist, fontSize: 13, lineHeight: 18, textAlign: "center" },
});
