import { StyleSheet, Text, View } from "react-native";
import { Card, Screen } from "@/components/ui";
import { CLEANER_SHARE_GROWTH_PERCENT, CLEANER_SHARE_PERCENT } from "@tydlii/quote";
import { cad } from "@/lib/format";
import { useSession } from "@/lib/session";
import { colors } from "@/theme";

export default function EarningsScreen() {
  const { earnings } = useSession();
  const today = earnings.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Screen title="Earnings">
      <View style={styles.stack}>
        <Card>
          <Text style={styles.kicker}>Today</Text>
          <Text style={styles.amount}>{cad(today, true)}</Text>
          <Text style={styles.body}>
            {earnings.length === 0
              ? "Finish the sample visit to add a line."
              : `${earnings.length} sample visit`}
          </Text>
        </Card>

        {earnings.map((item) => (
          <Card key={item.id}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.line}>{cad(item.amount, true)}</Text>
            <Text style={styles.body}>{item.detail}</Text>
          </Card>
        ))}

        <Text style={styles.body}>
          {CLEANER_SHARE_PERCENT}% of the visit price from day one, up to {CLEANER_SHARE_GROWTH_PERCENT}%. Tips
          would be 100% yours. Late-arrival credits stay with Tydlii. This ledger is a sample, and nothing is
          paid out.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 14 },
  kicker: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  amount: {
    color: colors.ink,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: "600",
    letterSpacing: -1,
    marginTop: 4,
  },
  title: { color: colors.ink, fontSize: 16, fontWeight: "600" },
  line: { color: colors.ink, fontSize: 22, fontWeight: "600", marginTop: 4 },
  body: { color: colors.ink, fontSize: 15, lineHeight: 22, marginTop: 6 },
});
