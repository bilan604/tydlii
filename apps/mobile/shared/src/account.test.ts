import assert from "node:assert/strict";
import { test } from "node:test";
import { requestAccountDeletion } from "./account";

test("account deletion is a local stub until the API exists", () => {
  const unconfirmed = requestAccountDeletion({ role: "customer", confirmed: false });
  assert.equal(unconfirmed.status, "rejected");
  const pending = requestAccountDeletion({ role: "cleaner", confirmed: true });
  assert.equal(pending.status, "pending_api");
  assert.match(pending.message, /Not sent/);
  assert.match(pending.message, /cleaner/);
});
