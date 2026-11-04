import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Block, Button, Chip, Field, Screen, Stepper } from "@/components/ui";
import {
  AREAS,
  SAMPLE_ADDRESSES,
  type Area,
} from "@/lib/draft";
import { cad } from "@/lib/format";
import { useBooking } from "@/lib/booking";
import { CONDITIONS, FREQUENCIES, SQFT_BANDS, type BandId, type Condition, type Frequency } from "@/lib/pricing";
import { presentQuote } from "@/lib/present";
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
            <Text style={styles.kicker}>
              {presented.quote.firstKind === "reset" ? "This visit · reset clean" : "This visit"}
            </Text>
            <Text style={styles.price}>
              {cad(presented.quote.first.beforeHst)} <Text style={styles.tax}>+ HST</Text>
            </Text>
            <Text style={styles.incl}>{cad(presented.quote.first.withHst, true)} with HST</Text>
            {presented.quote.plan ? (
              <Text style={styles.incl}>
                {presented.quote.frequencyLabel} from visit two: {cad(presented.quote.plan.beforeHst)} + HST
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
      <Text style={styles.intro}>Locked before you book. The same bands as the Toronto price list.</Text>
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

      <Block title="Home size">
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
        label="Bedrooms"
        hint="A den counts as one."
        value={draft.bedrooms}
        min={1}
        max={5}
        onChange={(bedrooms) => update({ bedrooms })}
      />
      <Stepper
        label="Full bathrooms"
        value={draft.fullBaths}
        min={1}
        max={4}
        onChange={(fullBaths) => update({ fullBaths })}
      />
      <Stepper
        label="Half bathrooms"
        value={draft.halfBaths}
        min={0}
        max={2}
        onChange={(halfBaths) => update({ halfBaths })}
      />

      <Block title="How often">
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

      <Block title="Condition today">
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
  hint: { color: colors.ink, fontSize: 14, lineHeight: 20, marginTop: 10 },
  footer: { gap: 6 },
  kicker: { color: colors.sage, fontSize: 13, fontWeight: "600" },
  price: { color: colors.mist, fontSize: 36, lineHeight: 40, fontWeight: "600", letterSpacing: -1 },
  tax: { color: colors.sage, fontSize: 16, fontWeight: "600" },
  incl: { color: colors.mist, fontSize: 14, marginBottom: 6 },
});
