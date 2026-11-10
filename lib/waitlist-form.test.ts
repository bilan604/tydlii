import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DuplicateNotice } from "../components/Waitlist";

test("a duplicate tells the person nothing was sent and which list they are already on", () => {
  for (const existingType of ["customer", "cleaner", null] as const) {
    const html = renderToStaticMarkup(
      createElement(DuplicateNotice, { existingType, onReset: () => undefined }),
    );
    assert.match(html, /role="alert"/);
    assert.match(html, /This email is already on the waitlist/);
    assert.match(html, /Customer and cleaner forms share one email/);
    assert.match(html, /no welcome email/);
    assert.match(html, /no notice to the team/);
    assert.match(html, /Use a different email/);
    assert.doesNotMatch(html, /You&#x27;re on the list/);
    assert.doesNotMatch(html, /You&#x27;re already on the list/);
    assert.doesNotMatch(html, /class="success"/);
  }

  const customer = renderToStaticMarkup(
    createElement(DuplicateNotice, { existingType: "customer", onReset: () => undefined }),
  );
  assert.match(customer, /already on the customer list/);
  const cleaner = renderToStaticMarkup(
    createElement(DuplicateNotice, { existingType: "cleaner", onReset: () => undefined }),
  );
  assert.match(cleaner, /already on the cleaner list/);
  const unknown = renderToStaticMarkup(
    createElement(DuplicateNotice, { existingType: null, onReset: () => undefined }),
  );
  assert.match(unknown, /This address is already saved/);
});

test("the success screens stay the existing welcome copy", async () => {
  const source = await readFile(new URL("../components/Waitlist.tsx", import.meta.url), "utf8");
  assert.match(source, /title="You're on the list."/);
  assert.match(source, /title="You're on the cleaner list."/);
  assert.match(source, /Check your email for your referral link/);
  assert.match(source, /Start onboarding/);
});
