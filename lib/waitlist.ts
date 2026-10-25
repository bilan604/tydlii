import { matchArea, type AreaName } from "./areas";

export type WaitlistType = "customer" | "cleaner";

export type WaitlistSignup = {
  type: WaitlistType;
  name: string;
  email: string;
  phone: string;
  neighbourhoods: AreaName[];
  notes: string;
  consent: true;
  quote: unknown;
};

export type ParseResult =
  | { ok: true; spam: true }
  | { ok: true; spam: false; value: WaitlistSignup }
  | { ok: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Validate a waitlist body.
 * Cleaner signups must send `neighbourhoods` as an array and may include more than one.
 * Customer signups are one neighbourhood.
 */
export function parseWaitlist(input: unknown): ParseResult {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "That signup could not be read." };
  }
  const body = input as Record<string, unknown>;
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return { ok: true, spam: true };
  }

  const type = body.type;
  if (type !== "customer" && type !== "cleaner") {
    return { ok: false, error: "Choose customer or cleaner." };
  }

  const name = asString(body.name);
  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: "Enter your name." };
  }

  const email = asString(body.email).toLowerCase();
  if (!EMAIL.test(email) || email.length > 120) {
    return { ok: false, error: "Enter a valid email." };
  }

  const phone = asString(body.phone);
  if (phone.length > 40) {
    return { ok: false, error: "That phone number is too long." };
  }
  if (phone && phone.replace(/\D/g, "").length < 7) {
    return { ok: false, error: "Enter a phone number we can reach, or leave it blank." };
  }

  const notes = asString(body.notes);
  if (notes.length > 500) {
    return { ok: false, error: "Keep the note under 500 characters." };
  }

  if (body.consent !== true) {
    return { ok: false, error: "Consent is required so we can contact you." };
  }

  const rawList = Array.isArray(body.neighbourhoods)
    ? body.neighbourhoods
    : body.neighbourhood != null
      ? [body.neighbourhood]
      : [];

  const neighbourhoods: AreaName[] = [];
  for (const item of rawList) {
    if (typeof item !== "string") {
      return { ok: false, error: "Choose a neighbourhood we serve." };
    }
    const match = matchArea(item);
    if (!match) {
      return { ok: false, error: "Choose a neighbourhood we serve." };
    }
    if (!neighbourhoods.includes(match)) neighbourhoods.push(match);
  }

  if (neighbourhoods.length === 0) {
    return {
      ok: false,
      error:
        type === "cleaner"
          ? "Choose at least one neighbourhood. You can select more than one."
          : "Choose your neighbourhood.",
    };
  }

  if (type === "customer" && neighbourhoods.length !== 1) {
    return { ok: false, error: "Choose one neighbourhood for your home." };
  }

  const quote =
    type === "customer" && body.quote && typeof body.quote === "object" ? body.quote : null;

  return {
    ok: true,
    spam: false,
    value: {
      type,
      name,
      email,
      phone,
      neighbourhoods,
      notes,
      consent: true,
      quote,
    },
  };
}
