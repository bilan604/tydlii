import { openLegalUrl } from "@tydlii/auth/react";
import { router } from "expo-router";
import { Linking, StyleSheet, Text } from "react-native";
import { Button, Screen } from "@/components/ui";
import { CONTACT_EMAIL, PRIVACY_URL } from "../../shared/src";
import { colors } from "@/theme";

export default function PrivacyScreen() {
  return (
    <Screen title="Privacy" onBack={() => router.back()}>
      <Text style={styles.body}>
        The privacy policy is published at tydlii.com/privacy. This app opens that page and does not keep a copy.
      </Text>
      <Text style={styles.body}>
        Questions, support, and deletion requests go to{" "}
        <Text
          accessibilityRole="link"
          style={styles.link}
          onPress={() => void Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
        >
          {CONTACT_EMAIL}
        </Text>
        .
      </Text>
      <Button label="Open Privacy Policy" onPress={() => void openLegalUrl(PRIVACY_URL)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { color: colors.ink, fontSize: 16, lineHeight: 23, marginBottom: 16 },
  link: { color: colors.teal, fontWeight: "600", textDecorationLine: "underline" },
});
