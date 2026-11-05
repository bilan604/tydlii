import { RoleSwitch, openLivePage, useAuth } from "@tydlii/auth/react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { PRIVACY_URL, TERMS_URL } from "../../shared/src";
import { BrandMark } from "@/components/BrandMark";
import { Button, Card, Screen } from "@/components/ui";
import { cad } from "@/lib/format";
import { SAMPLE_OFFER } from "@/lib/sample-offer";
import { useSession } from "@/lib/session";
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
  const mode = useAuth().session?.signedInAs ?? "cleaner";
  if (mode === "customer") return <CustomerMode />;
  return <CleanerHome />;
}

function CustomerMode() {
  return (
    <Screen tone="ink">
      <View style={styles.stack}>
        <View>
          <BrandMark variant="light" width={176} />
          <View style={styles.rule} />
          <View style={styles.switchWrap}><RoleSwitch /></View>
          <Text accessibilityRole="header" style={styles.title}>
            Customer mode
          </Text>
          <Text style={styles.lede}>
            Same account. Switch back to Cleaner for offers. This screen does not ask for location.
          </Text>
        </View>
        <Button kind="quiet" tone="ink" label="Account" onPress={() => router.push("/account")} />
        <Button kind="quiet" tone="ink" label="Settings" onPress={() => router.push("/settings")} />
        <LegalRow />
      </View>
    </Screen>
  );
}

function CleanerHome() {
  const session = useSession();
  const { online, phase, declined, busy, setOnline, accept, decline } = session;
  const showOffer = online && phase === "offer";

  return (
    <Screen tone="ink">
      <View style={styles.stack}>
        <View>
          <BrandMark variant="light" width={showOffer ? 140 : 176} />
          <View style={styles.rule} />
          <View style={styles.switchWrap}><RoleSwitch /></View>
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
            <Text style={styles.kicker}>{SAMPLE_OFFER.example}</Text>
            <Text style={styles.offerArea}>{SAMPLE_OFFER.area}</Text>
            <Text style={styles.body}>
              {SAMPLE_OFFER.place}
              {"\n"}
              {SAMPLE_OFFER.home}
              {"\n"}
              {SAMPLE_OFFER.rhythm}
              {"\n"}
              {SAMPLE_OFFER.when}
            </Text>
            <Text style={styles.earn}>{cad(SAMPLE_OFFER.earn, true)}</Text>
            <Text style={styles.body}>
              {SAMPLE_OFFER.share} of a {cad(SAMPLE_OFFER.price)} visit before HST. At {SAMPLE_OFFER.shareGrown},{" "}
              {cad(SAMPLE_OFFER.earnAt72, true)}. Tips would be yours.
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
          <Button kind="quiet" tone="ink" label="Account" onPress={() => router.push("/account")} />
          <Button kind="quiet" tone="ink" label="Settings" onPress={() => router.push("/settings")} />
          <Text style={styles.fine}>
            Sample data only. This preview simulates GPS. A store build asks for location only during an active
            job, then stops. Nothing is paid out.
          </Text>
          <LegalRow />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { flexGrow: 1, gap: 22, paddingBottom: 8 },
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
  legalRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 20 },
  legal: { color: colors.teal, fontSize: 14, fontWeight: "600", textDecorationLine: "underline" },
});
