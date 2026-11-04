import { StyleSheet, Text, View } from "react-native";
import { Card, Screen } from "@/components/ui";
import { colors } from "@/theme";
import {
  cityStatusLabel,
  coverageStatusLabel,
  defaultBookableCity,
  launchNeighbourhoods,
  provinceCoverage,
  type CoverageStatus,
} from "../../shared/src/coverage";

export default function CoverageScreen() {
  const toronto = defaultBookableCity();
  const launch = launchNeighbourhoods(toronto.id);

  return (
    <Screen title="Coverage">
      <View style={styles.stack}>
        <Text style={styles.intro}>
          Offers in this build are Toronto only. The list is the same Canada model as the customer app, so other
          provinces can open later without a second map.
        </Text>

        <View style={styles.hero}>
          <Text style={styles.kicker}>Soft launch · default</Text>
          <Text style={styles.heroTitle}>{toronto.name}</Text>
          <Text style={styles.heroBody}>Ontario · sample offers</Text>
          <Text style={styles.subhead}>Launch neighbourhoods</Text>
          <Text style={styles.body}>{launch.map((item) => item.name).join(" · ")}</Text>
        </View>

        <Text style={styles.section}>Near-future Canada-wide</Text>
        {provinceCoverage().map(({ province, cities }) => (
          <Card key={province.code}>
            <View style={styles.provinceRow}>
              <Text style={styles.province}>{province.name}</Text>
              <StatusBadge status={province.status} label={coverageStatusLabel(province.status)} />
            </View>
            {cities.map((city) => (
              <View key={city.id} style={styles.cityRow}>
                <Text style={styles.city}>{city.name}</Text>
                <StatusBadge status={city.status} label={cityStatusLabel(city.status)} />
              </View>
            ))}
          </Card>
        ))}
      </View>
    </Screen>
  );
}

function StatusBadge({ status, label }: { status: CoverageStatus; label: string }) {
  const open = status === "soft-launch";
  return (
    <View style={[styles.badge, open ? styles.badgeOpen : styles.badgePlanned]}>
      <Text style={[styles.badgeText, open ? styles.badgeTextOpen : styles.badgeTextPlanned]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12, paddingBottom: 12 },
  intro: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  hero: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.teal,
    gap: 4,
  },
  kicker: { color: colors.teal, fontSize: 13, fontWeight: "700" },
  heroTitle: { color: colors.ink, fontSize: 28, fontWeight: "600", letterSpacing: -0.6 },
  heroBody: { color: colors.ink, fontSize: 15, lineHeight: 21 },
  subhead: { color: colors.sage, fontSize: 13, fontWeight: "700", marginTop: 8 },
  body: { color: colors.ink, fontSize: 15, lineHeight: 21 },
  section: { color: colors.ink, fontSize: 13, fontWeight: "700", letterSpacing: 0.6, marginTop: 8 },
  provinceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  province: { color: colors.ink, fontSize: 18, fontWeight: "700", flex: 1 },
  cityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  city: { color: colors.ink, fontSize: 15, flex: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeOpen: { backgroundColor: colors.teal },
  badgePlanned: { backgroundColor: colors.mist },
  badgeText: { fontSize: 12, fontWeight: "700" },
  badgeTextOpen: { color: colors.ink },
  badgeTextPlanned: { color: colors.sage },
});
