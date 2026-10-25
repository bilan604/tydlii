"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AREAS, LAUNCH_AREAS } from "@/lib/areas";
import type { Quote } from "@/lib/pricing";
import { isStoredQuote, QUOTE_EVENT, QUOTE_STORAGE_KEY, summarizeQuote } from "@/lib/quote-summary";

type Role = "customer" | "cleaner";
type Status = "idle" | "sending" | "done" | "error";

function readQuote(): Quote | null {
  try {
    const raw = sessionStorage.getItem(QUOTE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isStoredQuote(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function Waitlist() {
  const [role, setRole] = useState<Role>("customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [neighbourhood, setNeighbourhood] = useState("");
  const [neighbourhoods, setNeighbourhoods] = useState<string[]>([]);
  const [website, setWebsite] = useState("");
  const [includeQuote, setIncludeQuote] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const sync = () => setQuote(readQuote());
    sync();
    window.addEventListener(QUOTE_EVENT, sync);
    return () => window.removeEventListener(QUOTE_EVENT, sync);
  }, []);

  function switchRole(next: Role) {
    setRole(next);
    setStatus("idle");
    setError("");
  }

  function toggleArea(area: string) {
    setNeighbourhoods((current) =>
      current.includes(area) ? current.filter((item) => item !== area) : [...current, area],
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const selected = role === "cleaner" ? neighbourhoods : neighbourhood ? [neighbourhood] : [];
    if (role === "cleaner" && selected.length === 0) {
      setError("Choose at least one neighbourhood. You can select more than one.");
      return;
    }
    if (role === "customer" && selected.length !== 1) {
      setError("Choose your neighbourhood.");
      return;
    }
    if (!consent) {
      setError("Consent is required so we can contact you.");
      return;
    }

    setStatus("sending");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: role,
          name,
          email,
          phone,
          notes,
          consent,
          website,
          neighbourhoods: selected,
          quote: role === "customer" && includeQuote ? quote : null,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setStatus("error");
        setError(data.error || "We could not save that just now. Try again in a moment.");
        return;
      }
      setStatus("done");
    } catch {
      setStatus("error");
      setError("We could not save that just now. Try again in a moment.");
    }
  }

  return (
    <section className="section waitlist-section" id="waitlist" aria-labelledby="waitlist-title">
      <div className="wrap waitlist-layout">
        <div className="section-intro">
          <p className="eyebrow">Waitlist</p>
          <h2 id="waitlist-title">Be first in your neighbourhood.</h2>
          <p>
            Two lists. If you want a clean, join as a customer. If you want to clean with Tydlii,
            join as a cleaner and select every neighbourhood you can cover.
          </p>
        </div>

        <div className="waitlist-card">
          <div className="role-toggle" role="radiogroup" aria-label="Which waitlist">
            <button
              type="button"
              role="radio"
              aria-checked={role === "customer"}
              className={role === "customer" ? "on" : ""}
              onClick={() => switchRole("customer")}
            >
              For my home
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={role === "cleaner"}
              className={role === "cleaner" ? "on" : ""}
              onClick={() => switchRole("cleaner")}
            >
              I clean homes
            </button>
          </div>

          {status === "done" ? (
            <div className="success" role="status">
              <p className="eyebrow">{role === "cleaner" ? "Cleaner list" : "Customer list"}</p>
              <h3>{role === "cleaner" ? "You're on the cleaner list." : "You're on the list."}</h3>
              <p>
                {role === "cleaner"
                  ? `We'll be in touch about ${neighbourhoods.length} neighbourhood${neighbourhoods.length === 1 ? "" : "s"}: ${neighbourhoods.join(", ")}.`
                  : `We'll write when Tydlii opens in ${neighbourhood}.`}
              </p>
              <button
                type="button"
                className="btn btn-line"
                onClick={() => {
                  setStatus("idle");
                  setConsent(false);
                }}
              >
                Submit another
              </button>
            </div>
          ) : (
            <form className="signup" onSubmit={onSubmit} noValidate>
              <div className="hp" aria-hidden="true">
                <label>
                  Website
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                  />
                </label>
              </div>

              <h3>{role === "cleaner" ? "Clean with Tydlii" : "Get on the customer list"}</h3>
              <p className="form-intro">
                {role === "cleaner"
                  ? "Tell us every neighbourhood you can cover. Most cleaners pick more than one."
                  : "One home, one neighbourhood. We'll write when booking opens there."}
              </p>

              <div className="form-grid">
                <label className="field-label">
                  Name
                  <input
                    className="field"
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={80}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <label className="field-label">
                  Email
                  <input
                    className="field"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    required
                    maxLength={120}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <label className="field-label">
                  Phone <span>optional</span>
                  <input
                    className="field"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    maxLength={40}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </label>
              </div>

              {role === "cleaner" ? (
                <fieldset className="hood-field">
                  <legend>Neighbourhoods you can cover</legend>
                  <p id="hood-hint">
                    Select every area you can reach. This is a multi-select — leave several on if
                    you cover more than one.
                  </p>
                  <div className="pill-actions">
                    <button
                      type="button"
                      className="text-btn"
                      onClick={() => setNeighbourhoods([...LAUNCH_AREAS])}
                    >
                      Launch areas
                    </button>
                    <button type="button" className="text-btn" onClick={() => setNeighbourhoods([])}>
                      Clear
                    </button>
                  </div>
                  <div className="pills" aria-describedby="hood-hint">
                    {AREAS.map((area) => {
                      const on = neighbourhoods.includes(area.name);
                      return (
                        <label key={area.name} className={on ? "pill on" : "pill"}>
                          <input
                            type="checkbox"
                            name="neighbourhoods"
                            value={area.name}
                            checked={on}
                            onChange={() => toggleArea(area.name)}
                          />
                          <span>{area.name}</span>
                          {area.wave === "next" ? <small className="tag">Next</small> : null}
                        </label>
                      );
                    })}
                  </div>
                  <p className="pill-count" aria-live="polite">
                    {neighbourhoods.length === 0
                      ? "None selected yet. Pick one or more."
                      : `${neighbourhoods.length} neighbourhood${neighbourhoods.length === 1 ? "" : "s"} selected`}
                  </p>
                </fieldset>
              ) : (
                <fieldset className="hood-field">
                  <legend>Your neighbourhood</legend>
                  <p id="home-hint">Choose the one area your home is in.</p>
                  <div className="pills" role="radiogroup" aria-describedby="home-hint" aria-label="Your neighbourhood">
                    {AREAS.map((area) => {
                      const on = neighbourhood === area.name;
                      return (
                        <label key={area.name} className={on ? "pill on" : "pill"}>
                          <input
                            type="radio"
                            name="neighbourhood"
                            value={area.name}
                            checked={on}
                            onChange={() => setNeighbourhood(area.name)}
                          />
                          <span>{area.name}</span>
                          {area.wave === "next" ? <small className="tag">Next</small> : null}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              <label className="field-label">
                {role === "cleaner" ? "Anything we should know" : "About your home"}{" "}
                <span>optional</span>
                <textarea
                  className="field"
                  name="notes"
                  maxLength={500}
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>

              {role === "customer" && quote ? (
                <label className="check">
                  <input
                    type="checkbox"
                    checked={includeQuote}
                    onChange={(event) => setIncludeQuote(event.target.checked)}
                  />
                  <span>Include my instant quote. {summarizeQuote(quote)}</span>
                </label>
              ) : null}

              <label className="check">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                <span>
                  I agree to be contacted about Tydlii. We'll only use this to reach you about
                  launch in the neighbourhoods you picked.
                </span>
              </label>

              {error ? (
                <p className="form-error" role="alert">
                  {error}
                </p>
              ) : null}

              <button className="btn btn-navy" type="submit" disabled={status === "sending"}>
                {status === "sending"
                  ? "Sending…"
                  : role === "cleaner"
                    ? "Join the cleaner list"
                    : "Join the customer list"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
