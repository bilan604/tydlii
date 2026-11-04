import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme";

export function MapChrome({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View>
      <View accessibilityLabel={label} style={styles.frame}>
        {children}
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
        <Text style={styles.caption}>OpenStreetMap</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 320,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: colors.mist,
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
