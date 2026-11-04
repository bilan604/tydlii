export const STRIPE_PUBLISHABLE_KEY_ENV = "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY";

/** Stand-in publishable key. It does not identify a Stripe account. */
export const STRIPE_TEST_KEY_PLACEHOLDER = "pk_test_tydlii_placeholder";

export type PaymentSheetConfig = {
  publishableKey: string;
  merchantDisplayName: string;
  mode: "test";
  currency: "cad";
  amountCents: number;
};

export type PaymentSheetResult =
  | { status: "completed"; testMode: true }
  | { status: "canceled"; testMode: true }
  | { status: "failed"; testMode: true };

export type StripeTestConfigResult =
  | { ok: true; config: PaymentSheetConfig }
  | { ok: false; reason: string };

export function amountToCents(amount: number): number {
  return Math.round(amount * 100);
}

/** Stripe live publishable keys are refused, including mixed or odd-cased values. */
export function isLiveStripeKey(key: string): boolean {
  return key.toLowerCase().includes("pk_live_");
}

export function isStripeTestKey(key: string): boolean {
  return key.startsWith("pk_test_") && !isLiveStripeKey(key);
}

export function maskPublishableKey(key: string): string {
  if (!isStripeTestKey(key) || key.length <= 14) return "pk_test_…";
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

/**
 * Test mode only. A `pk_live_` key is refused so this path cannot point at a live account.
 * An empty value uses the placeholder publishable key. No PaymentIntent is created and
 * nothing in this module calls Stripe.
 */
export function resolveStripeTestConfig(
  env: { publishableKey?: string },
  amountCents: number,
): StripeTestConfigResult {
  const raw = env.publishableKey?.trim() ?? "";
  if (isLiveStripeKey(raw)) {
    return { ok: false, reason: "Live Stripe keys are refused. Use a pk_test_ publishable key." };
  }
  const publishableKey = raw || STRIPE_TEST_KEY_PLACEHOLDER;
  if (!isStripeTestKey(publishableKey)) {
    return { ok: false, reason: "Stripe test mode expects a pk_test_ publishable key." };
  }
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return { ok: false, reason: "Amount must be a positive number of cents." };
  }
  return {
    ok: true,
    config: {
      publishableKey,
      merchantDisplayName: "Tydlii",
      mode: "test",
      currency: "cad",
      amountCents,
    },
  };
}

export type PaymentSheetClient = {
  mode: "test";
  init(config: PaymentSheetConfig): Promise<{ ready: true }>;
  present(): Promise<PaymentSheetResult>;
  cancel(): Promise<PaymentSheetResult>;
};

/**
 * Stand-in for `@stripe/stripe-react-native` PaymentSheet.
 * The real SDK's `initPaymentSheet` / `presentPaymentSheet` can replace this once a
 * test-mode PaymentIntent endpoint exists. This client does not call Stripe.
 */
export function createTestPaymentSheet(): PaymentSheetClient {
  let ready = false;
  return {
    mode: "test",
    async init(config) {
      if (config.mode !== "test" || !isStripeTestKey(config.publishableKey) || isLiveStripeKey(config.publishableKey)) {
        throw new Error("Refusing a non-test Stripe configuration");
      }
      if (!Number.isInteger(config.amountCents) || config.amountCents <= 0) {
        throw new Error("Refusing a non-test Stripe configuration");
      }
      ready = true;
      return { ready: true };
    },
    async present() {
      if (!ready) return { status: "failed", testMode: true };
      return { status: "completed", testMode: true };
    },
    async cancel() {
      return { status: "canceled", testMode: true };
    },
  };
}
