import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { requestAccountDeletion } from "../../shared/src";
import { Button, Card, Screen } from "@/components/ui";
import { colors } from "@/theme";

export default function DeleteAccountScreen() {
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);

  return (
    <Screen title="Delete account">
      <View style={styles.stack}>
        <Text style={styles.body}>
          App Store review asks for a way to delete an account once sign-in exists. This screen will call the Tydlii
          account API later. It does not send anything now.
        </Text>
        <Card>
          <Text style={styles.title}>Customer profile</Text>
          <Text style={styles.body}>Deleting the profile would sign this device out and remove the saved booking.</Text>
        </Card>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {confirming ? (
          <Button
            label="Confirm delete"
            onPress={() => {
              const result = requestAccountDeletion({ role: "customer", confirmed: true });
              setMessage(result.message);
              setConfirming(false);
            }}
          />
        ) : (
          <Button label="Delete account" onPress={() => setConfirming(true)} />
        )}
        {confirming ? <Button kind="secondary" label="Cancel" onPress={() => setConfirming(false)} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  body: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  title: { color: colors.ink, fontSize: 18, fontWeight: "600", marginBottom: 6 },
  message: { color: colors.ink, fontSize: 15, lineHeight: 22, fontWeight: "600" },
});
