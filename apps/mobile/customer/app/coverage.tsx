import { StyleSheet, Text, View } from "react-native";
import { CITIES, PROVINCES, citiesInProvince } from "../../shared/src";
import { Card, Screen } from "@/components/ui";
import { colors } from "@/theme";

export default function CoverageScreen() {
  return (
    <Screen title="Canada coverage">
      <View style={styles.stack}>
        <Text style={styles.intro}>
          Soft launch is Toronto. The same model lists every province and territory so later cities can open without a
          rewrite. Only Toronto neighbourhoods can be booked in this build.
        </Text>
        {PROVINCES.map((province) => {
          const cities = citiesInProvince(province.code);
          return (
            <Card key={province.code}>
              <Text style={styles.province}>{province.name}</Text>
              <Text style={styles.status}>{province.status === "soft-launch" ? "Soft launch" : "Planned"}</Text>
              {cities.length === 0 ? (
                <Text style={styles.city}>No city listed yet.</Text>
              ) : (
                cities.map((city) => (
                  <View key={city.id} style={styles.cityRow}>
                    <Text style={styles.city}>{city.name}</Text>
                    <Text style={styles.badge}>{city.status === "soft-launch" ? "Open" : "Coming soon"}</Text>
                  </View>
                ))
              )}
            </Card>
          );
        })}
        <Text style={styles.note}>{CITIES.length} cities in the stub. Booking stays on the Toronto launch list.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  intro: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  province: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  status: { color: colors.sage, fontSize: 13, fontWeight: "700", marginBottom: 8 },
  cityRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 4 },
  city: { color: colors.ink, fontSize: 15 },
  badge: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  note: { color: colors.ink, fontSize: 13, lineHeight: 18, marginTop: 8 },
});
