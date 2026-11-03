import "react-native-reanimated";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BookingProvider } from "@/lib/booking";
import { colors } from "@/theme";

export { ErrorBoundary } from "expo-router";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <BookingProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.mist },
            animation: "slide_from_right",
          }}
        />
      </BookingProvider>
    </SafeAreaProvider>
  );
}
