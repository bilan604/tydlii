import { openLivePage } from "@tydlii/auth/react";
import { router } from "expo-router";
import { Linking, StyleSheet, Text, View } from "react-native";
import { CONTACT_EMAIL, PRIVACY_URL, TERMS_URL } from "../../shared/src";
import { Button, Screen } from "@/components/ui";
import { colors } from "@/theme";

export default function SettingsScreen() {
  return (
    <Screen title="Settings">
      <View style={styles.stack}>
        <Text style={styles.body}>
          Privacy Policy and Terms of Service open on tydlii.com. Delete account removes the copy stored on this
          device, including customer and cleaner on this email. It does not call Tydlii. To ask Tydlii to delete
          records it holds, email{" "}
          <Text
            accessibilityRole="link"
            style={styles.link}
            onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
          >
            {CONTACT_EMAIL}
          </Text>
          .
        </Text>
        <Button label="Privacy Policy" onPress={() => void openLivePage(PRIVACY_URL)} />
        <Button kind="secondary" label="Terms of Service" onPress={() => void openLivePage(TERMS_URL)} />
        <Button kind="secondary" label="Delete account" onPress={() => router.push("/delete-account")} />
        <Button kind="quiet" label="Canada coverage" onPress={() => router.push("/coverage")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  body: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  link: { color: colors.teal, fontWeight: "600", textDecorationLine: "underline" },
});
