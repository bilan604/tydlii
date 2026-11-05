import { openLivePage } from "@tydlii/auth/react";
import { router } from "expo-router";
import { Linking, StyleSheet, Text } from "react-native";
import { Button, Screen } from "@/components/ui";
import { CONTACT_EMAIL, PRIVACY_URL } from "../../shared/src";
import { colors } from "@/theme";

export default function PrivacyScreen() {
  return (
    <Screen title="Privacy" onBack={() => router.back()}>
      <Text style={styles.body}>The privacy policy is the page on tydlii.com. This app does not keep a separate copy.</Text>
      <Text style={styles.body}>
        Questions, support, and deletion requests go to{" "}
        <Text
          accessibilityRole="link"
          style={styles.link}
          onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
        >
          {CONTACT_EMAIL}
        </Text>
        .
      </Text>
      <Button label="Open tydlii.com/privacy" onPress={() => void openLivePage(PRIVACY_URL)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { color: colors.ink, fontSize: 16, lineHeight: 23, marginBottom: 16 },
  link: { color: colors.teal, fontWeight: "600", textDecorationLine: "underline" },
});
