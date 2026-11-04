import assert from "node:assert/strict";
import { test } from "node:test";
import {
  STRIPE_TEST_KEY_PLACEHOLDER,
  amountToCents,
  createTestPaymentSheet,
  maskPublishableKey,
  resolveStripeTestConfig,
} from "./payments";

test("test-mode config accepts the placeholder and refuses live keys", () => {
  const empty = resolveStripeTestConfig({}, amountToCents(258.77));
  assert.equal(empty.ok, true);
  if (!empty.ok) return;
  assert.equal(empty.config.publishableKey, STRIPE_TEST_KEY_PLACEHOLDER);
  assert.equal(empty.config.mode, "test");
  assert.equal(empty.config.currency, "cad");
  assert.equal(empty.config.amountCents, 25877);
  assert.equal(empty.config.merchantDisplayName, "Tydlii");

  const live = resolveStripeTestConfig({ publishableKey: "pk_live_secret" }, 100);
  assert.equal(live.ok, false);
  const other = resolveStripeTestConfig({ publishableKey: "sk_test_nope" }, 100);
  assert.equal(other.ok, false);
  assert.match(maskPublishableKey(STRIPE_TEST_KEY_PLACEHOLDER), /^pk_test_/);
});

test("payment sheet stub completes in test mode and does not call Stripe", async () => {
  const resolved = resolveStripeTestConfig({ publishableKey: "pk_test_51example" }, 22900);
  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;
  const sheet = createTestPaymentSheet();
  const before = await sheet.present();
  assert.equal(before.status, "failed");
  await sheet.init(resolved.config);
  const result = await sheet.present();
  assert.deepEqual(result, { status: "completed", testMode: true });
  const canceled = await sheet.cancel();
  assert.equal(canceled.status, "canceled");
});
