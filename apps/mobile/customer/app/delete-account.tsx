import { DELETE_ACCOUNT_URL } from "@tydlii/auth";
import { openLivePage, useAuth } from "@tydlii/auth/react";
import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { CONTACT_EMAIL, accountDeletionMailto, requestAccountDeletion } from "../../shared/src";
import { Button, Card, Screen } from "@/components/ui";
import { colors } from "@/theme";

export default function DeleteAccountScreen() {
  const auth = useAuth();
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const role = auth.session?.signedInAs ?? "customer";

  return (
    <Screen title="Delete account">
      <View style={styles.stack}>
        <Text style={styles.body}>
          This removes the account on this device and signs you out. Customer and cleaner on this email are both
          removed here. It does not call Tydlii.
        </Text>
        <Text style={styles.body}>
          To ask Tydlii to delete records it holds, email{" "}
          <Text
            accessibilityRole="link"
            style={styles.link}
            onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
          >
            {CONTACT_EMAIL}
          </Text>
          . The privacy policy describes that request. The same address works from either app.
        </Text>
        <Card>
          <Text style={styles.title}>{role === "cleaner" ? "Cleaner profile" : "Customer profile"}</Text>
          <Text style={styles.body}>
            You are in {role} mode. Deleting still removes the whole account stored on this device.
          </Text>
        </Card>
        <Button label={`Email ${CONTACT_EMAIL}`} onPress={() => void Linking.openURL(accountDeletionMailto(role))} />
        <Button
          kind="secondary"
          label="Open tydlii.com/privacy#delete-account"
          onPress={() => void openLivePage(DELETE_ACCOUNT_URL)}
        />
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
          <Button kind="secondary" label="Delete account on this device" onPress={() => setConfirming(true)} />
        )}
        {confirming ? <Button kind="secondary" label="Cancel" onPress={() => setConfirming(false)} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  body: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  link: { color: colors.teal, fontWeight: "600", textDecorationLine: "underline" },
  title: { color: colors.ink, fontSize: 18, fontWeight: "600", marginBottom: 6 },
  message: { color: colors.ink, fontSize: 15, lineHeight: 22, fontWeight: "600" },
});
