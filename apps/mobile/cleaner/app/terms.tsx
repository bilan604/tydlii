import { router } from "expo-router";
import { Linking, StyleSheet, Text } from "react-native";
import { Button, Screen } from "@/components/ui";
import { TERMS_SUMMARY, TERMS_URL } from "../../shared/src";
import { colors } from "@/theme";

export default function TermsScreen() {
  return (
    <Screen title="Terms" onBack={() => router.back()}>
      <Text style={styles.body}>{TERMS_SUMMARY}</Text>
      <Button label="Open tydlii.com/terms" onPress={() => Linking.openURL(TERMS_URL)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { color: colors.ink, fontSize: 16, lineHeight: 23, marginBottom: 16 },
});
