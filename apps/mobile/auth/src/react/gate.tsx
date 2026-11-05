import { useRouter, useSegments } from "expo-router";
import { useEffect, type ReactNode } from "react";
import { AuthLoading } from "./screens";
import { useAuth } from "./provider";

const OPEN_ROUTES = new Set(["sign-in", "sign-up", "auth", "oauth2redirect", "privacy", "terms"]);

export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const root = typeof segments[0] === "string" ? segments[0] : "";
  const onAuthRoute = OPEN_ROUTES.has(root);

  useEffect(() => {
    if (auth.status === "loading") return;
    if (auth.status === "signed_out" && !onAuthRoute) {
      router.replace("/sign-in");
    } else if (
      auth.status === "signed_in" &&
      (root === "sign-in" || root === "sign-up" || root === "auth" || root === "oauth2redirect")
    ) {
      router.replace("/");
    }
  }, [auth.status, onAuthRoute, root, router]);

  if (auth.status === "loading" || (auth.status === "signed_out" && !onAuthRoute)) {
    return <AuthLoading />;
  }
  return children;
}
