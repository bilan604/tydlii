import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Block, Button, Chip, Field, Screen, Stepper } from "@/components/ui";
import {
  AREAS,
  SAMPLE_ADDRESSES,
  type Area,
} from "@/lib/draft";
import {
  BEDROOM_OPTIONS,
  CONDITIONS,
  FREQUENCIES,
  FULL_BATH_OPTIONS,
  HALF_BATH_OPTIONS,
  QUOTE_FIELDS,
  SQFT_BANDS,
  ADD_ONS,
  firstVisitSentence,
  type BandId,
  type Condition,
  type Frequency,
} from "@tydlii/quote";
import { cad } from "@/lib/format";
import { useBooking } from "@/lib/booking";
import { presentQuote, receiptRows } from "@/lib/present";
import { colors } from "@/theme";

export default function BookScreen() {
  const { draft, update } = useBooking();
  const presented = presentQuote(draft);
  const ready = draft.address.trim().length >= 5 && !presented.custom;
  const condition = CONDITIONS.find((item) => item.id === draft.condition);

  return (
    <Screen
      title="Book"
      keyboard
      footerTone="ink"
      footer={
        presented.custom ? (
          <View style={styles.footer}>
            <Text style={styles.kicker}>{presented.label}</Text>
            <Text style={styles.incl}>This size needs a custom quote.</Text>
            <Button label="Choose a window" disabled onPress={() => {}} />
          </View>
        ) : (
          <View style={styles.footer}>
            <Text style={styles.kicker}>{presented.eyebrow}</Text>
            <Text style={styles.price}>
              {cad(presented.headline.beforeHst)} <Text style={styles.tax}>+ HST</Text>
            </Text>
            <Text style={styles.incl}>{cad(presented.headline.withHst, true)} including 13% HST</Text>
            {presented.plan && presented.plan.lines.length > 0
              ? receiptRows(presented.plan).map((row) => (
                  <Text key={row.label} style={styles.incl}>
                    {row.label} {cad(row.amount)}
                  </Text>
                ))
              : null}
            {presented.firstVisit ? (
              <Text style={styles.incl}>
                {presented.first.lines.length > 0
                  ? `First visit ${cad(presented.first.beforeHst)} + HST, locked clean ${cad(presented.first.baseBeforeHst)} plus add-ons. Your plan price starts from visit two.`
                  : firstVisitSentence(presented.firstVisit.kind, cad(presented.firstVisit.beforeHst))}
              </Text>
            ) : null}
            {ready ? null : <Text style={styles.incl}>Enter a street address to continue.</Text>}
            <Button
              label="Choose a window"
              disabled={!ready}
              onPress={() => router.push("/schedule")}
            />
          </View>
        )
      }
    >
      <Text style={styles.intro}>
        Locked before you book. Prices shown before HST; Ontario HST (13%) is added at checkout. Add-ons stack
        on that locked price.
      </Text>
      <Pressable accessibilityRole="link" onPress={() => router.push("/coverage")}>
        <Text style={styles.coverage}>Toronto is the soft launch. See where Canada opens next.</Text>
      </Pressable>

      <Field
        label="Street address"
        value={draft.address}
        onChangeText={(address) => update({ address })}
        placeholder="88 Niagara Street"
      />
      <Field
        label="Unit"
        optional
        value={draft.unit}
        onChangeText={(unit) => update({ unit })}
        placeholder="1204"
      />

      <Block title="Neighbourhood">
        <View style={styles.wrap}>
          {AREAS.map((area) => (
            <Chip
              key={area}
              label={area}
              selected={draft.area === area}
              onPress={() => update({ area })}
            />
          ))}
        </View>
      </Block>

      <Block title="Sample addresses">
        <View style={styles.wrap}>
          {SAMPLE_ADDRESSES.map((place) => (
            <Chip
              key={place.address}
              label={place.address}
              selected={draft.address === place.address && draft.area === place.area}
              onPress={() => update({ address: place.address, area: place.area satisfies Area })}
            />
          ))}
        </View>
      </Block>

      <Block title={QUOTE_FIELDS.band}>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bandRow}
        >
          {SQFT_BANDS.map((band) => (
            <Chip
              key={band.id}
              label={band.label}
              selected={draft.band === band.id}
              onPress={() => update({ band: band.id as BandId })}
            />
          ))}
        </ScrollView>
      </Block>

      <Stepper
        label={QUOTE_FIELDS.bedrooms}
        value={draft.bedrooms}
        min={BEDROOM_OPTIONS[0]}
        max={BEDROOM_OPTIONS[BEDROOM_OPTIONS.length - 1]}
        onChange={(bedrooms) => update({ bedrooms })}
      />
      <Stepper
        label={QUOTE_FIELDS.fullBaths}
        value={draft.fullBaths}
        min={FULL_BATH_OPTIONS[0]}
        max={FULL_BATH_OPTIONS[FULL_BATH_OPTIONS.length - 1]}
        onChange={(fullBaths) => update({ fullBaths })}
      />
      <Stepper
        label={QUOTE_FIELDS.halfBaths}
        value={draft.halfBaths}
        min={HALF_BATH_OPTIONS[0]}
        max={HALF_BATH_OPTIONS[HALF_BATH_OPTIONS.length - 1]}
        onChange={(halfBaths) => update({ halfBaths })}
      />

      <Block title={QUOTE_FIELDS.frequency}>
        <View style={styles.wrap}>
          {FREQUENCIES.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              selected={draft.frequency === item.id}
              onPress={() => update({ frequency: item.id as Frequency })}
            />
          ))}
        </View>
      </Block>

      <Block title={QUOTE_FIELDS.condition}>
        <View style={styles.wrap}>
          {CONDITIONS.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              selected={draft.condition === item.id}
              onPress={() => update({ condition: item.id as Condition })}
            />
          ))}
        </View>
        {condition ? <Text style={styles.hint}>{condition.hint}</Text> : null}
      </Block>

      <Block title="Add-ons">
        <Text style={styles.hint}>Before HST. Each one is added to the locked price.</Text>
        {ADD_ONS.map((addOn) => {
          const count = draft.addOns[addOn.id];
          const counted = addOn.unit === "window" || addOn.unit === "bed";
          if (counted) {
            return (
              <Stepper
                key={addOn.id}
                label={`${addOn.label} · ${addOn.menuPrice}`}
                hint={addOn.inclusion}
                value={count}
                min={0}
                max={addOn.max}
                onChange={(quantity) =>
                  update({ addOns: { ...draft.addOns, [addOn.id]: quantity } })
                }
              />
            );
          }
          const selected = count > 0;
          return (
            <Pressable
              key={addOn.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() =>
                update({
                  addOns: { ...draft.addOns, [addOn.id]: selected ? 0 : 1 },
                })
              }
              style={[styles.addOn, selected && styles.addOnOn]}
            >
              <View style={styles.addOnCopy}>
                <Text style={styles.addOnTitle}>
                  {addOn.label} · {addOn.menuPrice}
                </Text>
                <Text style={styles.addOnInclusion}>{addOn.inclusion}</Text>
              </View>
              <Text style={styles.addOnAction}>{selected ? "Added" : "Add"}</Text>
            </Pressable>
          );
        })}
      </Block>

    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.ink, fontSize: 16, lineHeight: 22 },
  coverage: {
    color: colors.teal,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
    textDecorationLine: "underline",
    marginTop: 8,
    marginBottom: 20,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  bandRow: { gap: 8, paddingRight: 8 },
  hint: { color: colors.ink, fontSize: 14, lineHeight: 20, marginTop: 10, marginBottom: 10 },
  addOn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.sage,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  addOnOn: { borderColor: colors.teal },
  addOnCopy: { flex: 1 },
  addOnTitle: { color: colors.ink, fontSize: 15, fontWeight: "600" },
  addOnInclusion: { color: colors.ink, fontSize: 13, lineHeight: 18, marginTop: 2 },
  addOnAction: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  footer: { gap: 6 },
  kicker: { color: colors.sage, fontSize: 13, fontWeight: "600" },
  price: { color: colors.mist, fontSize: 36, lineHeight: 40, fontWeight: "600", letterSpacing: -1 },
  tax: { color: colors.sage, fontSize: 16, fontWeight: "600" },
  incl: { color: colors.mist, fontSize: 14, marginBottom: 6 },
});
