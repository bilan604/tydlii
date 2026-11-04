import "react-native-reanimated";
import { AuthGate, AuthProvider } from "@tydlii/auth/react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BrandMark } from "@/components/BrandMark";
import { BookingProvider } from "@/lib/booking";
import { colors } from "@/theme";

export { ErrorBoundary } from "expo-router";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider
        role="customer"
        scheme="tydlii-customer"
        issuer={process.env.EXPO_PUBLIC_AUTH_ISSUER}
        clientId={process.env.EXPO_PUBLIC_AUTH_CLIENT_ID}
        wordmark={{
          light: <BrandMark variant="light" width={176} />,
          ink: <BrandMark variant="ink" width={148} />,
        }}
      >
        <BookingProvider>
          <AuthGate>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.mist },
                animation: "slide_from_right",
              }}
            />
          </AuthGate>
        </BookingProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
