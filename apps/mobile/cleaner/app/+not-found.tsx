import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found", headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen is not in the app.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Back to the start</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.mist,
    gap: 12,
  },
  title: { color: colors.ink, fontSize: 20, fontWeight: "600", textAlign: "center" },
  link: { minHeight: 44, justifyContent: "center" },
  linkText: { color: colors.ink, fontSize: 16, fontWeight: "600", textDecorationLine: "underline" },
});
