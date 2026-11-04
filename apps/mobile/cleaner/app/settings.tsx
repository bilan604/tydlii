import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { PRIVACY_SUMMARY } from "../../shared/src";
import { Button, Screen } from "@/components/ui";
import { colors } from "@/theme";

export default function SettingsScreen() {
  return (
    <Screen title="Settings">
      <View style={styles.stack}>
        <Text style={styles.body}>{PRIVACY_SUMMARY}</Text>
        <Button label="Privacy Policy" onPress={() => router.push("/privacy")} />
        <Button kind="secondary" label="Terms" onPress={() => router.push("/terms")} />
        <Button kind="secondary" label="Delete account" onPress={() => router.push("/delete-account")} />
        <Button kind="quiet" label="Canada coverage" onPress={() => router.push("/coverage")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  body: { color: colors.ink, fontSize: 15, lineHeight: 22 },
});
