import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Block, Button, Chip, Screen } from "@/components/ui";
import { useBooking } from "@/lib/booking";
import { WINDOWS, upcomingDays, windowLabel, type WindowId } from "@/lib/draft";
import { cad } from "@/lib/format";
import { presentQuote } from "@/lib/present";
import { colors } from "@/theme";

export default function ScheduleScreen() {
  const { draft, update } = useBooking();
  const presented = presentQuote(draft);
  const days = upcomingDays();
  const addressReady = draft.address.trim().length >= 5;
  const ready = addressReady && draft.dayId.length > 0 && !presented.custom;
  const charge = presented.custom ? null : presented.quote.first;

  return (
    <Screen
      title="Schedule"
      footerTone="ink"
      footer={
        <View style={styles.footer}>
          {charge ? (
            <Text style={styles.priceLine}>
              This visit {cad(charge.beforeHst)} + HST
            </Text>
          ) : (
            <Text style={styles.priceLine}>Choose a home size with a listed price.</Text>
          )}
          {ready ? null : (
            <Text style={styles.hint}>
              {addressReady ? "Choose a day to continue." : "Add a street address first."}
            </Text>
          )}
          <Button
            label="Review payment"
            disabled={!ready}
            onPress={() => router.push("/pay")}
          />
        </View>
      }
    >
      {addressReady ? (
        <Text style={styles.intro}>
          {draft.address.trim()}
          {draft.unit.trim() ? `, ${draft.unit.trim()}` : ""} · {draft.area}
        </Text>
      ) : (
        <View style={styles.gap}>
          <Text style={styles.intro}>Add an address before choosing a window.</Text>
          <Button label="Back to booking" onPress={() => router.replace("/book")} />
        </View>
      )}

      <Block title="Day">
        <View style={styles.wrap}>
          {days.map((day) => (
            <Chip
              key={day.id}
              label={day.label}
              selected={draft.dayId === day.id}
              onPress={() => update({ dayId: day.id })}
            />
          ))}
        </View>
      </Block>

      <Block title="Arrival window">
        <View style={styles.wrap}>
          {WINDOWS.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              selected={draft.windowId === item.id}
              onPress={() => update({ windowId: item.id as WindowId })}
            />
          ))}
        </View>
        <Text style={styles.body}>
          A Tydlii-certified cleaner arrives inside {windowLabel(draft.windowId)}. The visit is not tied to one
          named cleaner.
        </Text>
      </Block>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.ink, fontSize: 16, lineHeight: 22, marginBottom: 20 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  body: { color: colors.ink, fontSize: 14, lineHeight: 20, marginTop: 10 },
  gap: { gap: 12, marginBottom: 20 },
  footer: { gap: 8 },
  priceLine: { color: colors.mist, fontSize: 16, fontWeight: "600" },
  hint: { color: colors.mist, fontSize: 14 },
});
