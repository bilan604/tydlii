import assert from "node:assert/strict";
import { test } from "node:test";
import { AREAS } from "./areas";
import { HONEYPOT_FIELD, parseWaitlist } from "./waitlist";

const customer = {
  type: "customer",
  name: "Mina Chen",
  email: "mina@example.com",
  phone: "416-555-0148",
  neighbourhood: "CityPlace",
  notes: "One bedroom on Fort York.",
  consent: true,
};

test("customer signup keeps a single neighbourhood", () => {
  const parsed = parseWaitlist(customer);
  assert.equal(parsed.ok, true);
  if (!parsed.ok || parsed.spam) return;
  assert.deepEqual(parsed.value.neighbourhoods, ["CityPlace"]);
  assert.equal(parsed.value.email, "mina@example.com");
});

test("cleaner signup accepts several neighbourhoods and drops duplicates", () => {
  const parsed = parseWaitlist({
    type: "cleaner",
    name: "Jordan Hale",
    email: "jordan@example.com",
    phone: "",
    neighbourhoods: ["King West", "CityPlace", "King West", "Yonge-Eglinton"],
    consent: true,
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok || parsed.spam) return;
  assert.deepEqual(parsed.value.neighbourhoods, ["King West", "CityPlace", "Yonge–Eglinton"]);
});

test("cleaner signup can include every area", () => {
  const parsed = parseWaitlist({
    type: "cleaner",
    name: "Jordan Hale",
    email: "jordan@example.com",
    neighbourhoods: AREAS.map((area) => area.name),
    consent: true,
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok || parsed.spam) return;
  assert.equal(parsed.value.neighbourhoods.length, AREAS.length);
});

test("cleaner signup rejects an empty neighbourhood list", () => {
  const parsed = parseWaitlist({
    type: "cleaner",
    name: "Jordan Hale",
    email: "jordan@example.com",
    neighbourhoods: [],
    consent: true,
  });
  assert.deepEqual(parsed, {
    ok: false,
    error: "Choose at least one neighbourhood. You can select more than one.",
  });
});

test("other is a valid neighbourhood on its own or with a launch area", () => {
  const parsed = parseWaitlist({
    type: "cleaner",
    name: "Jordan Hale",
    email: "jordan@example.com",
    neighbourhoods: ["Other", "Liberty Village"],
    consent: true,
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok || parsed.spam) return;
  assert.deepEqual(parsed.value.neighbourhoods, ["Other", "Liberty Village"]);
});

test("unknown neighbourhoods and missing consent are rejected", () => {
  const badArea = parseWaitlist({
    ...customer,
    neighbourhood: "The Beaches",
  });
  assert.equal(badArea.ok, false);

  const noConsent = parseWaitlist({ ...customer, consent: false });
  assert.equal(noConsent.ok, false);
});

test("a filled honeypot is accepted as spam and not stored as a signup", () => {
  const parsed = parseWaitlist({ ...customer, [HONEYPOT_FIELD]: "filled by a bot" });
  assert.deepEqual(parsed, { ok: true, spam: true });
  assert.equal(HONEYPOT_FIELD.includes("web"), false);
  assert.equal(HONEYPOT_FIELD.includes("url"), false);
});

test("a legacy website field is still a honeypot", () => {
  const parsed = parseWaitlist({ ...customer, website: "https://spam.example" });
  assert.deepEqual(parsed, { ok: true, spam: true });
});

test("an empty honeypot is a normal signup", () => {
  const parsed = parseWaitlist({ ...customer, [HONEYPOT_FIELD]: "  ", website: "" });
  assert.equal(parsed.ok, true);
  if (!parsed.ok || parsed.spam) return;
  assert.equal(parsed.value.email, "mina@example.com");
});
