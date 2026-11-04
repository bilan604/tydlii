import { StyleSheet, Text, View } from "react-native";
import { Card, Screen } from "@/components/ui";
import { colors } from "@/theme";
import {
  cityStatusLabel,
  coverageStatusLabel,
  defaultBookableCity,
  laterNeighbourhoods,
  launchNeighbourhoods,
  provinceCoverage,
  type CoverageStatus,
} from "../../shared/src/coverage";

export default function CoverageScreen() {
  const toronto = defaultBookableCity();
  const launch = launchNeighbourhoods(toronto.id);
  const later = laterNeighbourhoods(toronto.id);

  return (
    <Screen title="Coverage">
      <View style={styles.stack}>
        <Text style={styles.intro}>
          Soft launch is Toronto. Every province and territory is listed so Canada-wide coverage can open later.
          Booking stays on the Toronto launch neighbourhoods.
        </Text>

        <View style={styles.hero}>
          <Text style={styles.kicker}>Soft launch · default</Text>
          <Text style={styles.heroTitle}>{toronto.name}</Text>
          <Text style={styles.heroBody}>Ontario · open for booking</Text>
          <Text style={styles.subhead}>Bookable now</Text>
          <Text style={styles.body}>{launch.map((item) => item.name).join(" · ")}</Text>
          <Text style={styles.subhead}>Later in Toronto</Text>
          <Text style={styles.body}>{later.map((item) => item.name).join(" · ")}</Text>
        </View>

        <Text style={styles.section}>Near-future Canada-wide</Text>
        <Text style={styles.intro}>
          The other cities stay planned. Nothing outside Toronto can be booked in this build.
        </Text>

        {provinceCoverage().map(({ province, cities }) => (
          <Card key={province.code}>
            <View style={styles.provinceRow}>
              <Text style={styles.province}>{province.name}</Text>
              <StatusBadge status={province.status} label={coverageStatusLabel(province.status)} />
            </View>
            {cities.map((city) => (
              <View key={city.id} style={styles.cityBlock}>
                <View style={styles.cityRow}>
                  <Text style={styles.city}>{city.name}</Text>
                  <StatusBadge status={city.status} label={cityStatusLabel(city.status)} />
                </View>
                {city.id === toronto.id ? (
                  <Text style={styles.neighbourhoods}>{launch.map((item) => item.name).join(" · ")}</Text>
                ) : null}
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
  cityBlock: { marginTop: 8 },
  cityRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  city: { color: colors.ink, fontSize: 15, flex: 1 },
  neighbourhoods: { color: colors.sage, fontSize: 13, lineHeight: 18, marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeOpen: { backgroundColor: colors.teal },
  badgePlanned: { backgroundColor: colors.mist },
  badgeText: { fontSize: 12, fontWeight: "700" },
  badgeTextOpen: { color: colors.ink },
  badgeTextPlanned: { color: colors.sage },
});
