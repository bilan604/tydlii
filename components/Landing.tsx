"use client";

import { useEffect, useRef, useState } from "react";
import { quoteHome } from "@/lib/pricing";
import { normalizeReferralCode, REFERRAL_STORAGE_KEY } from "@/lib/referral";
import { CleanerPitch } from "./CleanerPitch";
import { Closer } from "./Closer";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { Pillars } from "./Pillars";
import { DEFAULT_QUOTE_INPUT, QuoteCalculator, type QuoteSnapshot } from "./QuoteCalculator";
import { CleanerWaitlist, CustomerWaitlist } from "./Waitlist";

type Path = "customer" | "cleaner";

function scrollToId(id: string) {
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  document.getElementById(id)?.scrollIntoView({ behavior, block: "start" });
}

export function Landing({ accessKey = "" }: { accessKey?: string }) {
  const [path, setPath] = useState<Path>("customer");
  const [snapshot, setSnapshot] = useState<QuoteSnapshot>(() => ({
    quote: quoteHome(DEFAULT_QUOTE_INPUT),
    bedrooms: DEFAULT_QUOTE_INPUT.bedrooms,
    fullBaths: DEFAULT_QUOTE_INPUT.fullBaths,
    halfBaths: DEFAULT_QUOTE_INPUT.halfBaths,
    frequency: DEFAULT_QUOTE_INPUT.frequency,
  }));
  const pending = useRef<string | null>(null);

  function choose(next: Path, anchor: string) {
    pending.current = anchor;
    setPath(next);
    if (next === path) {
      pending.current = null;
      scrollToId(anchor);
    }
  }

  useEffect(() => {
    const anchor = pending.current;
    if (!anchor) return;
    pending.current = null;
    scrollToId(anchor);
  }, [path]);

  useEffect(() => {
    const code = normalizeReferralCode(new URLSearchParams(window.location.search).get("ref"));
    if (!code) return;
    try {
      sessionStorage.setItem(REFERRAL_STORAGE_KEY, code);
    } catch {
      /* private mode can block storage; the query string is still read on submit */
    }
  }, []);

  return (
    <>
      <Hero onPrice={() => choose("customer", "price")} onClean={() => choose("cleaner", "join")} />
      <Pillars />
      <section className="audience" id="join">
        <p className="eyebrow">Join the waitlist</p>
        <div className="tabs" role="tablist" aria-label="Choose your waitlist">
          <button
            type="button"
            role="tab"
            id="tab-customer"
            aria-selected={path === "customer"}
            aria-controls="customer-path"
            className={path === "customer" ? "on" : ""}
            onClick={() => setPath("customer")}
          >
            I need cleaning
          </button>
          <button
            type="button"
            role="tab"
            id="tab-cleaner"
            aria-selected={path === "cleaner"}
            aria-controls="cleaner-path"
            className={path === "cleaner" ? "on" : ""}
            onClick={() => setPath("cleaner")}
          >
            I want to clean
          </button>
        </div>
      </section>
      {path === "customer" ? (
        <div role="tabpanel" id="customer-path" aria-labelledby="tab-customer">
          <QuoteCalculator onChange={setSnapshot} />
          <HowItWorks />
          <CustomerWaitlist snapshot={snapshot} accessKey={accessKey} />
        </div>
      ) : (
        <div role="tabpanel" id="cleaner-path" aria-labelledby="tab-cleaner">
          <CleanerPitch />
          <CleanerWaitlist accessKey={accessKey} />
        </div>
      )}
      <Closer />
    </>
  );
}
