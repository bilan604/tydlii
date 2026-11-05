import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { brand } from "../model";
import { openLegalUrl, PRIVACY_URL, TERMS_URL } from "./open-legal";

export function LegalDocumentLinks({
  tone = "mist",
  showDeleteAccount = false,
}: {
  tone?: "ink" | "mist";
  showDeleteAccount?: boolean;
}) {
  const onInk = tone === "ink";
  return (
    <View style={styles.row}>
      <DocLink label="Privacy Policy" onInk={onInk} onPress={() => void openLegalUrl(PRIVACY_URL)} />
      <DocLink label="Terms of Service" onInk={onInk} onPress={() => void openLegalUrl(TERMS_URL)} />
      {showDeleteAccount ? (
        <DocLink label="Delete account" onInk={onInk} onPress={() => router.push("/delete-account")} />
      ) : null}
    </View>
  );
}

function DocLink({ label, onInk, onPress }: { label: string; onInk: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={styles.linkHit}>
      <Text style={[styles.link, onInk ? styles.onInk : styles.onMist]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  linkHit: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  link: {
    fontSize: 15,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  onInk: { color: brand.mist },
  onMist: { color: brand.teal },
});
