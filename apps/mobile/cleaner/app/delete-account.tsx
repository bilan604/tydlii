import { DELETE_ACCOUNT_URL } from "@tydlii/auth";
import { useAuth } from "@tydlii/auth/react";
import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { requestAccountDeletion } from "../../shared/src";
import { Button, Card, Screen } from "@/components/ui";
import { colors } from "@/theme";

export default function DeleteAccountScreen() {
  const auth = useAuth();
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const role = auth.session?.signedInAs ?? "cleaner";

  return (
    <Screen title="Delete account">
      <View style={styles.stack}>
        <Text style={styles.body}>
          This removes the account on this device and signs you out. It does not call Tydlii. The live deletion
          section is on tydlii.com/privacy.
        </Text>
        <Card>
          <Text style={styles.title}>{role === "customer" ? "Customer profile" : "Cleaner profile"}</Text>
          <Text style={styles.body}>Deleting the profile would sign this device out and clear the sample ledger.</Text>
        </Card>
        <Button label="Open tydlii.com/privacy#delete-account" onPress={() => void Linking.openURL(DELETE_ACCOUNT_URL)} />
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {confirming ? (
          <Button
            label="Confirm delete"
            onPress={() => {
              const result = requestAccountDeletion({ role, confirmed: true });
              setMessage(result.message);
              void auth.deleteAccount();
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
