import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  STRIPE_TEST_KEY_PLACEHOLDER,
  amountToCents,
  createTestPaymentSheet,
  isLiveStripeKey,
  maskPublishableKey,
  resolveStripeTestConfig,
} from "./payments";

describe("Stripe test mode", () => {
  it("uses the placeholder and prices CAD cents", () => {
    const empty = resolveStripeTestConfig({}, amountToCents(258.77));
    assert.equal(empty.ok, true);
    if (!empty.ok) return;
    assert.equal(empty.config.publishableKey, STRIPE_TEST_KEY_PLACEHOLDER);
    assert.equal(empty.config.mode, "test");
    assert.equal(empty.config.currency, "cad");
    assert.equal(empty.config.amountCents, 25877);
    assert.equal(empty.config.merchantDisplayName, "Tydlii");
    assert.match(maskPublishableKey(STRIPE_TEST_KEY_PLACEHOLDER), /^pk_test_/);
  });

  it("refuses live keys, secret keys, and a non-positive amount", () => {
    assert.equal(isLiveStripeKey("pk_live_123"), true);
    assert.equal(isLiveStripeKey("PK_LIVE_123"), true);
    const live = resolveStripeTestConfig({ publishableKey: "pk_live_secret" }, 100);
    assert.equal(live.ok, false);
    if (!live.ok) assert.match(live.reason, /Live Stripe keys are refused/);
    const mixed = resolveStripeTestConfig({ publishableKey: "pk_test_ok pk_live_no" }, 100);
    assert.equal(mixed.ok, false);
    const secret = resolveStripeTestConfig({ publishableKey: "sk_test_nope" }, 100);
    assert.equal(secret.ok, false);
    const cents = resolveStripeTestConfig({ publishableKey: "pk_test_51example" }, 0);
    assert.equal(cents.ok, false);
  });

  it("accepts a trimmed pk_test_ key", () => {
    const resolved = resolveStripeTestConfig({ publishableKey: "  pk_test_51example  " }, 22900);
    assert.equal(resolved.ok, true);
    if (!resolved.ok) return;
    assert.equal(resolved.config.publishableKey, "pk_test_51example");
    assert.equal(resolved.config.amountCents, 22900);
  });

  it("completes the sheet stand-in without calling Stripe", async () => {
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

  it("refuses to init a live configuration", async () => {
    const sheet = createTestPaymentSheet();
    await assert.rejects(() =>
      sheet.init({
        publishableKey: "pk_live_no",
        merchantDisplayName: "Tydlii",
        mode: "test",
        currency: "cad",
        amountCents: 100,
      }),
    );
  });
});
