import { Image } from "react-native";

const sources = {
  ink: require("../assets/brand/wordmark.png"),
  light: require("../assets/brand/wordmark-light.png"),
} as const;

const RATIO = 380 / 907;

export function BrandMark({
  variant = "ink",
  width = 168,
}: {
  variant?: "ink" | "light";
  width?: number;
}) {
  return (
    <Image
      accessibilityLabel="Tydlii"
      source={sources[variant]}
      resizeMode="contain"
      style={{ width, height: Math.round(width * RATIO) }}
    />
  );
}
