import type { ConfigContext, ExpoConfig } from "expo/config";
import { applyTydliiNativeConfig } from "../native-config.js";

export default ({ config }: ConfigContext): ExpoConfig =>
  applyTydliiNativeConfig(config, process.env) as ExpoConfig;
