"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AREAS, type AreaName } from "@/lib/areas";
import { cad } from "@/lib/format";
import type { Frequency } from "@/lib/pricing";
import { REFERRAL_CREDIT_PROMISE, REFERRAL_STORAGE_KEY, referralCodeFromInput } from "@/lib/referral";
import { HONEYPOT_FIELD } from "@/lib/waitlist";
import {
  SAVE_ERROR,
  configuredAccessKey,
  deliverWaitlist,
  type WaitlistSubmitResult,
} from "@/lib/waitlist-notify";
import type { QuoteSnapshot } from "./QuoteCalculator";
import { Check } from "./ui";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FREQ_SHORT: Record<Frequency, string> = {
  weekly: "weekly",
  biweekly: "bi-weekly",
  every4: "every 4 weeks",
  onetime: "one-time",
};

const EXPERIENCE = ["None yet", "Under 1 year", "1–2 years", "3–5 years", "5+ years"] as const;
const RIDES = ["Yes, I have a vehicle", "No vehicle", "Transit is fine"] as const;

type Status = "idle" | "sending" | "done" | "duplicate" | "error";

function quoteLine(snapshot: QuoteSnapshot): string {
  const half = snapshot.halfBaths > 0 ? ` + ${snapshot.halfBaths} half` : "";
  const price = snapshot.quote.custom
    ? "custom quote"
    : `${cad((snapshot.quote.plan ?? snapshot.quote.first).beforeHst)} + HST`;
  return `${snapshot.bedrooms} bed, ${snapshot.fullBaths} bath${half}, ${snapshot.quote.label.toLowerCase()}, ${FREQ_SHORT[snapshot.frequency]}, ${price}`;
}

function joinNotes(lines: string[], note: string): string {
  const parts = lines.map((line) => line.trim()).filter(Boolean);
  if (note.trim()) parts.push(note.trim());
  return parts.join("\n").slice(0, 500);
}

function rememberedReferralCode(): string {
  if (typeof window === "undefined") return "";
  const fromUrl = referralCodeFromInput({ ref: new URLSearchParams(window.location.search).get("ref") ?? "" });
  let stored = "";
  try {
    stored = sessionStorage.getItem(REFERRAL_STORAGE_KEY) ?? "";
  } catch {
    stored = "";
  }
  const code = fromUrl || referralCodeFromInput({ ref: stored });
  if (code) {
    try {
      sessionStorage.setItem(REFERRAL_STORAGE_KEY, code);
    } catch {
      /* the code is still sent from memory on this submit */
    }
  }
  return code;
}

async function submitForm(body: Record<string, unknown>, accessKey: string): Promise<WaitlistSubmitResult> {
  try {
    return await deliverWaitlist(body, configuredAccessKey(accessKey));
  } catch {
    return { status: "error", error: SAVE_ERROR };
  }
}

/**
 * Bot trap. Not named or labeled as a website or URL: mobile browsers autofill
 * those from the contact card and a real signup would never be emailed.
 * It sits after the real fields so it is not the first input Safari assigns.
 */
function Honeypot({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="hp" aria-hidden="true">
      <label>
        Leave blank
        <input
          type="text"
          name={HONEYPOT_FIELD}
          tabIndex={-1}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-hidden="true"
          data-1p-ignore="true"
          data-lpignore="true"
          data-bwignore="true"
          data-form-type="other"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  inputMode,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "email" | "tel" | "text";
  maxLength?: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Actions({
  ready,
  sending,
  label,
  checked,
  hint,
  error,
  onCheck,
}: {
  ready: boolean;
  sending: boolean;
  label: string;
  checked: boolean;
  hint: string;
  error: string;
  onCheck: () => void;
}) {
  return (
    <>
      <div className="form-actions">
        <button className="btn btn-navy" type="submit" disabled={!ready || sending}>
          {sending ? "Sending…" : label}
        </button>
        <button className="btn btn-line" type="button" onClick={onCheck}>
          Check my details
        </button>
      </div>
      {checked ? (
        <p className="form-hint" role="status">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}

function AlreadyListed({ onReset }: { onReset: () => void }) {
  return (
    <Success kicker="Waitlist" title="You're already on the list." onReset={onReset}>
      This email is already signed up, so we didn't send it again.
    </Success>
  );
}

function Success({
  kicker,
  title,
  children,
  onReset,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
  onReset: () => void;
}) {
  return (
    <div className="success" role="status">
      <p className="eyebrow">{kicker}</p>
      <h3>{title}</h3>
      <p>{children}</p>
      <button className="btn btn-line" type="button" onClick={onReset}>
        Submit another
      </button>
    </div>
  );
}

export function CustomerWaitlist({
  snapshot,
  accessKey = "",
}: {
  snapshot: QuoteSnapshot;
  accessKey?: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [postal, setPostal] = useState("");
  const [hood, setHood] = useState<AreaName | "">("");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [checked, setChecked] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [referred, setReferred] = useState(false);

  useEffect(() => {
    setReferred(rememberedReferralCode() !== "");
  }, []);

  const emailOk = EMAIL.test(email.trim());
  const nameOk = name.trim().length >= 2;
  const placeOk = postal.trim().length > 0 || hood !== "";
  const ready = nameOk && emailOk && placeOk && consent;

  function edit(apply: () => void) {
    apply();
    setChecked(false);
    setError("");
  }

  const hint = ready
    ? "Ready. Tap Join waitlist to send."
    : !nameOk || !emailOk || !placeOk
      ? "Almost there: add your name, a valid email, and a postal code or neighbourhood."
      : "Consent is required so we can contact you.";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChecked(true);
    setError("");
    if (!ready) return;

    const neighbourhoods: AreaName[] = hood ? [hood] : ["Other"];
    setStatus("sending");
    const result = await submitForm(
      {
        type: "customer",
        name,
        email,
        phone: "",
        notes: joinNotes([postal.trim() ? `Postal: ${postal.trim().toUpperCase()}` : ""], note),
        consent: true,
        [HONEYPOT_FIELD]: honeypot,
        neighbourhoods,
        quote: snapshot.quote,
        ref: rememberedReferralCode(),
      },
      accessKey,
    );
    if (result.status === "sent") {
      setStatus("done");
      return;
    }
    if (result.status === "duplicate") {
      setStatus("duplicate");
      return;
    }
    setStatus("error");
    setError(result.error);
  }

  return (
    <section className="block card-block" aria-labelledby="customer-wait-title">
      <div className="wait-card">
        <div className="wait-copy">
          <p className="eyebrow">Early access</p>
          <h2 id="customer-wait-title">Be first in your building.</h2>
          <p>
            We&apos;re opening downtown neighbourhood by neighbourhood. Waitlist members get the first chance
            to book.
          </p>
          <div className="ticks">
            <Check>Your quote comes with you: {quoteLine(snapshot)}</Check>
            <Check>No payment details. Ever, on this page.</Check>
            <Check>We only contact you about Tydlii&apos;s launch.</Check>
            <Check>{REFERRAL_CREDIT_PROMISE}</Check>
          </div>
          {referred ? (
            <p className="form-hint">A friend referred you. {REFERRAL_CREDIT_PROMISE}</p>
          ) : null}
        </div>
        {status === "done" ? (
          <Success
            kicker="Customer list"
            title="You're on the list."
            onReset={() => {
              setStatus("idle");
              setConsent(false);
              setChecked(false);
            }}
          >
            We&apos;ll write when Tydlii opens
            {hood ? ` in ${hood}` : postal.trim() ? ` near ${postal.trim().toUpperCase()}` : " in your area"}.
            Check your email for your referral link. {REFERRAL_CREDIT_PROMISE}
          </Success>
        ) : status === "duplicate" ? (
          <AlreadyListed
            onReset={() => {
              setStatus("idle");
              setConsent(false);
              setChecked(false);
            }}
          />
        ) : (
          <form className="signup" onSubmit={onSubmit} noValidate>
            <div className="form-grid">
              <TextField
                label="Name"
                value={name}
                placeholder="Your name"
                autoComplete="name"
                maxLength={80}
                onChange={(value) => edit(() => setName(value))}
              />
              <TextField
                label="Email"
                value={email}
                type="email"
                inputMode="email"
                placeholder="you@example.com"
                autoComplete="email"
                maxLength={120}
                onChange={(value) => edit(() => setEmail(value))}
              />
              <TextField
                label="Postal code"
                value={postal}
                placeholder="M5V 0A1"
                autoComplete="postal-code"
                maxLength={12}
                onChange={(value) => edit(() => setPostal(value))}
              />
              <label className="field">
                <span>Neighbourhood</span>
                <select
                  value={hood}
                  onChange={(event) =>
                    edit(() => setHood(event.target.value === "" ? "" : (event.target.value as AreaName)))
                  }
                >
                  <option value="">Choose one</option>
                  {AREAS.map((area) => (
                    <option key={area.name} value={area.name}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field">
              <span>Anything we should know? (optional)</span>
              <textarea
                rows={3}
                maxLength={500}
                placeholder="Building, pets, best days"
                value={note}
                onChange={(event) => edit(() => setNote(event.target.value))}
              />
            </label>
            <label className="consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => edit(() => setConsent(event.target.checked))}
              />
              <span>I agree to be contacted about Tydlii&apos;s launch.</span>
            </label>
            <Actions
              ready={ready}
              sending={status === "sending"}
              label="Join waitlist"
              checked={checked}
              hint={hint}
              error={error}
              onCheck={() => setChecked(true)}
            />
            <Honeypot value={honeypot} onChange={setHoneypot} />
          </form>
        )}
      </div>
    </section>
  );
}

export function CleanerWaitlist({ accessKey = "" }: { accessKey?: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hoods, setHoods] = useState<AreaName[]>([]);
  const [experience, setExperience] = useState("");
  const [ride, setRide] = useState("");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [checked, setChecked] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const emailOk = EMAIL.test(email.trim());
  const nameOk = name.trim().length >= 2;
  const ready = nameOk && emailOk && hoods.length > 0 && consent;

  function edit(apply: () => void) {
    apply();
    setChecked(false);
    setError("");
  }

  function toggle(area: AreaName) {
    edit(() =>
      setHoods((current) =>
        current.includes(area)
          ? current.filter((item) => item !== area)
          : AREAS.map((item) => item.name).filter((name) => name === area || current.includes(name)),
      ),
    );
  }

  const hint = ready
    ? "Ready. Tap Join cleaner waitlist to send."
    : !nameOk || !emailOk || hoods.length === 0
      ? "Almost there: add your name, a valid email, and at least one area you'd like to work in."
      : "Consent is required so we can contact you.";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChecked(true);
    setError("");
    if (!ready) return;
    if (phone.trim() && phone.replace(/\D/g, "").length < 7) {
      setStatus("error");
      setError("Enter a phone number we can reach, or leave it blank.");
      return;
    }

    setStatus("sending");
    const result = await submitForm(
      {
        type: "cleaner",
        name,
        email,
        phone,
        notes: joinNotes(
          [experience ? `Experience: ${experience}` : "", ride ? `Getting to jobs: ${ride}` : ""],
          note,
        ),
        consent: true,
        [HONEYPOT_FIELD]: honeypot,
        neighbourhoods: hoods,
        quote: null,
      },
      accessKey,
    );
    if (result.status === "sent") {
      setStatus("done");
      return;
    }
    if (result.status === "duplicate") {
      setStatus("duplicate");
      return;
    }
    setStatus("error");
    setError(result.error);
  }

  return (
    <section className="block flush" aria-labelledby="cleaner-wait-title">
      <div className="wait-card">
        <div className="wait-copy">
          <p className="eyebrow">Cleaner waitlist</p>
          <h2 id="cleaner-wait-title">Start with a paid trial clean.</h2>
          <p>
            We&apos;ll reach out as we open each neighbourhood. Launch areas: CityPlace, King West, Liberty
            Village, Yonge–Eglinton and North York Centre.
          </p>
          <div className="ticks">
            <Check>Independent work, your own schedule.</Check>
            <Check>We never ask for banking details here.</Check>
          </div>
        </div>
        {status === "done" ? (
          <Success
            kicker="Cleaner list"
            title="You're on the cleaner list."
            onReset={() => {
              setStatus("idle");
              setConsent(false);
              setChecked(false);
            }}
          >
            We&apos;ll be in touch about {hoods.length} neighbourhood{hoods.length === 1 ? "" : "s"}:{" "}
            {hoods.join(", ")}.
          </Success>
        ) : status === "duplicate" ? (
          <AlreadyListed
            onReset={() => {
              setStatus("idle");
              setConsent(false);
              setChecked(false);
            }}
          />
        ) : (
          <form className="signup" onSubmit={onSubmit} noValidate>
            <div className="form-grid">
              <TextField
                label="Name"
                value={name}
                placeholder="Your name"
                autoComplete="name"
                maxLength={80}
                onChange={(value) => edit(() => setName(value))}
              />
              <TextField
                label="Email"
                value={email}
                type="email"
                inputMode="email"
                placeholder="you@example.com"
                autoComplete="email"
                maxLength={120}
                onChange={(value) => edit(() => setEmail(value))}
              />
              <TextField
                label="Phone (optional)"
                value={phone}
                type="tel"
                inputMode="tel"
                placeholder="416-555-0123"
                autoComplete="tel"
                maxLength={40}
                onChange={(value) => edit(() => setPhone(value))}
              />
              <label className="field">
                <span>Cleaning experience</span>
                <select value={experience} onChange={(event) => edit(() => setExperience(event.target.value))}>
                  <option value="">Choose one</option>
                  {EXPERIENCE.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Getting to jobs</span>
                <select value={ride} onChange={(event) => edit(() => setRide(event.target.value))}>
                  <option value="">Choose one</option>
                  {RIDES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="hoods" role="group" aria-label="Where you'd like to work">
              <p>Where you&apos;d like to work (pick all that apply)</p>
              <div className="pills">
                {AREAS.map((area) => {
                  const on = hoods.includes(area.name);
                  return (
                    <button
                      key={area.name}
                      type="button"
                      className={on ? "pill on" : "pill"}
                      aria-pressed={on}
                      onClick={() => toggle(area.name)}
                    >
                      {on ? "✓ " : ""}
                      {area.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="field">
              <span>Anything we should know? (optional)</span>
              <textarea
                rows={3}
                maxLength={500}
                placeholder="Languages, availability, own clients"
                value={note}
                onChange={(event) => edit(() => setNote(event.target.value))}
              />
            </label>
            <label className="consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => edit(() => setConsent(event.target.checked))}
              />
              <span>I agree to be contacted about Tydlii&apos;s launch.</span>
            </label>
            <Actions
              ready={ready}
              sending={status === "sending"}
              label="Join cleaner waitlist"
              checked={checked}
              hint={hint}
              error={error}
              onCheck={() => setChecked(true)}
            />
            <Honeypot value={honeypot} onChange={setHoneypot} />
          </form>
        )}
      </div>
    </section>
  );
}
