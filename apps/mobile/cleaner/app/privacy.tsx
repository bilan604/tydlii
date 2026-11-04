import { router } from "expo-router";
import { Linking, StyleSheet, Text } from "react-native";
import { Button, Screen } from "@/components/ui";
import { PRIVACY_SUMMARY, PRIVACY_URL } from "../../shared/src";
import { colors } from "@/theme";

export default function PrivacyScreen() {
  return (
    <Screen title="Privacy" onBack={() => router.back()}>
      <Text style={styles.body}>{PRIVACY_SUMMARY}</Text>
      <Button label="Open tydlii.com/privacy" onPress={() => Linking.openURL(PRIVACY_URL)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { color: colors.ink, fontSize: 16, lineHeight: 23, marginBottom: 16 },
});
