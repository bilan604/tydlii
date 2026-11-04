import { StyleSheet, Text, View } from "react-native";
import { layoutVisit, type LatLng } from "../../shared/src";
import { colors } from "@/theme";

export function LiveVisitMap({
  home,
  cleaner,
  route,
  label,
}: {
  home: LatLng;
  cleaner: LatLng | null;
  route: LatLng[];
  label: string;
}) {
  const layout = layoutVisit({ home, cleaner, route });

  return (
    <View>
      <View accessibilityLabel={label} style={styles.map}>
        {layout.dots.map((dot, index) => (
          <View key={index} style={[styles.dot, { left: `${dot.left}%`, top: `${dot.top}%` }]} />
        ))}
        <View style={[styles.pin, styles.home, { left: `${layout.home.left}%`, top: `${layout.home.top}%` }]} />
        {layout.cleaner ? (
          <View
            style={[styles.halo, { left: `${layout.cleaner.left}%`, top: `${layout.cleaner.top}%` }]}
          />
        ) : null}
        {layout.cleaner ? (
          <View
            style={[styles.pin, styles.cleaner, { left: `${layout.cleaner.left}%`, top: `${layout.cleaner.top}%` }]}
          />
        ) : null}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.teal }]} />
          <Text style={styles.legendText}>Cleaner</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.ink }]} />
          <Text style={styles.legendText}>Home</Text>
        </View>
        <Text style={styles.caption}>Live visit</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 240,
    borderRadius: 20,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  dot: {
    position: "absolute",
    width: 8,
    height: 8,
    marginLeft: -4,
    marginTop: -4,
    borderRadius: 4,
    backgroundColor: colors.teal,
  },
  pin: {
    position: "absolute",
    borderWidth: 3,
    borderColor: colors.white,
  },
  home: {
    width: 16,
    height: 16,
    marginLeft: -8,
    marginTop: -8,
    borderRadius: 8,
    backgroundColor: colors.ink,
  },
  halo: {
    position: "absolute",
    width: 36,
    height: 36,
    marginLeft: -18,
    marginTop: -18,
    borderRadius: 18,
    backgroundColor: colors.teal,
    opacity: 0.28,
  },
  cleaner: {
    width: 18,
    height: 18,
    marginLeft: -9,
    marginTop: -9,
    borderRadius: 9,
    backgroundColor: colors.teal,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 10,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  caption: { marginLeft: "auto", color: colors.ink, fontSize: 13 },
});
