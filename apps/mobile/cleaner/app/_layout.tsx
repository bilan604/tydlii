import "react-native-reanimated";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LiveVisitProvider } from "@/lib/live-visit";
import { SessionProvider } from "@/lib/session";
import { colors } from "@/theme";

export { ErrorBoundary } from "expo-router";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <LiveVisitProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.mist },
              animation: "slide_from_right",
            }}
          />
        </LiveVisitProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
