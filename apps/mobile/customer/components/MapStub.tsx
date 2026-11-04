import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme";

export type MapPhase = "enroute" | "cleaning" | "done" | "navigate";

export function MapStub({
  phase,
  legend = "customer",
}: {
  phase: MapPhase;
  legend?: "customer" | "cleaner";
}) {
  const atHome = phase === "cleaning" || phase === "done";
  const mover = legend === "cleaner" ? "You" : "Cleaner";

  return (
    <View>
      <View
        accessibilityLabel="Sample map showing a route to the home. Location is not read."
        style={styles.map}
      >
        <View style={[styles.roadH, { top: "22%" }]} />
        <View style={[styles.roadH, { top: "48%" }]} />
        <View style={[styles.roadH, { top: "74%" }]} />
        <View style={[styles.roadV, { left: "18%" }]} />
        <View style={[styles.roadV, { left: "46%" }]} />
        <View style={[styles.roadV, { left: "74%" }]} />
        <View style={styles.block} />
        <View style={styles.routeH} />
        <View style={styles.routeV} />
        <View style={styles.home} />
        <View style={[styles.mover, atHome ? styles.moverHome : styles.moverOut]} />
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.teal }]} />
          <Text style={styles.legendText}>{mover}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.ink }]} />
          <Text style={styles.legendText}>Home</Text>
        </View>
        <Text style={styles.caption}>Sample map</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 220,
    borderRadius: 20,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  roadH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: colors.mist,
  },
  roadV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 10,
    backgroundColor: colors.mist,
  },
  block: {
    position: "absolute",
    top: "28%",
    left: "22%",
    width: "18%",
    height: "16%",
    borderRadius: 8,
    backgroundColor: colors.sage,
    opacity: 0.45,
  },
  routeH: {
    position: "absolute",
    top: "51%",
    left: "8%",
    width: "66%",
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.teal,
  },
  routeV: {
    position: "absolute",
    top: "30%",
    left: "72%",
    width: 4,
    height: "23%",
    borderRadius: 2,
    backgroundColor: colors.teal,
  },
  home: {
    position: "absolute",
    top: "26%",
    left: "70%",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.ink,
    borderWidth: 3,
    borderColor: colors.white,
  },
  mover: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.teal,
    borderWidth: 3,
    borderColor: colors.white,
  },
  moverOut: {
    top: "46%",
    left: "12%",
  },
  moverHome: {
    top: "36%",
    left: "66%",
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "600",
  },
  caption: {
    marginLeft: "auto",
    color: colors.ink,
    fontSize: 13,
  },
});
