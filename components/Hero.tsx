"use client";

import { useEffect, useState } from "react";
import { SLOGANS } from "@/lib/site";
import { Wordmark } from "./Wordmark";

type HeroProps = {
  onPrice: () => void;
  onClean: () => void;
};

export function Hero({ onPrice, onClean }: HeroProps) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    let fade: number | undefined;
    const id = window.setInterval(() => {
      setShown(false);
      fade = window.setTimeout(() => {
        setIndex((current) => (current + 1) % SLOGANS.length);
        setShown(true);
      }, 380);
    }, 3500);
    return () => {
      window.clearInterval(id);
      if (fade) window.clearTimeout(fade);
    };
  }, []);

  function show(next: number) {
    setIndex(next);
    setShown(true);
  }

  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <svg className="hero-art" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
        <polygon points="640,0 1000,0 1000,600 470,600" fill="#20c7c7" opacity="0.92" />
        <polygon points="760,0 1000,0 1000,600 640,600" fill="#3c8dff" opacity="0.28" />
        <circle cx="120" cy="560" r="220" fill="rgba(255,255,255,0.04)" />
      </svg>
      <div className="hero-grid">
        <div className="hero-copy">
          <div className="hero-brand">
            <a href="/#top" aria-label="Tydlii">
              <Wordmark variant="light" className="brand-logo" />
            </a>
            <span className="badge">Launching in downtown Toronto</span>
          </div>
          <h1 id="hero-title">
            More living.
            <br />
            Less cleaning.
          </h1>
          <p className={shown ? "slogan" : "slogan is-out"} aria-live="polite">
            {SLOGANS[index]}
          </p>
          <p className="lede">Every clean, guaranteed. Know who&apos;s coming. Know what you&apos;ll pay.</p>
          <div className="hero-actions">
            <a
              className="btn btn-light"
              href="#price"
              onClick={(event) => {
                event.preventDefault();
                onPrice();
              }}
            >
              Get my price
            </a>
            <a
              className="btn btn-ghost"
              href="#join"
              onClick={(event) => {
                event.preventDefault();
                onClean();
              }}
            >
              Clean with Tydlii
            </a>
          </div>
          <div className="dots">
            {SLOGANS.map((slogan, dot) => (
              <button
                key={slogan}
                type="button"
                className={dot === index ? "dot on" : "dot"}
                aria-label={`Show slogan ${dot + 1}`}
                aria-pressed={dot === index}
                onClick={() => show(dot)}
              />
            ))}
          </div>
        </div>
        <div className="phone-wrap">
          <article className="phone" aria-label="App preview">
            <div className="map">
              <svg viewBox="0 0 320 180" role="img" aria-label="Live map showing your cleaner on the way">
                <rect width="320" height="180" fill="#f4f7fb" />
                {[30, 75, 120, 165].map((y) => (
                  <line key={`h${y}`} x1="0" y1={y} x2="320" y2={y} stroke="rgba(11,47,107,0.08)" strokeWidth="7" />
                ))}
                {[40, 110, 190, 260].map((x) => (
                  <line key={`v${x}`} x1={x} y1="0" x2={x} y2="180" stroke="rgba(11,47,107,0.08)" strokeWidth="7" />
                ))}
                <rect x="200" y="85" width="50" height="28" rx="4" fill="rgba(32,199,199,0.25)" />
                <path
                  d="M40 165 L40 120 L110 120 L110 75 L190 75 L225 75 L225 99"
                  fill="none"
                  stroke="#3c8dff"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="2 8"
                />
                <circle cx="110" cy="96" r="13" fill="rgba(60,141,255,0.25)" />
                <circle cx="110" cy="96" r="7" fill="#3c8dff" stroke="#ffffff" strokeWidth="2.5" />
                <circle cx="225" cy="99" r="9" fill="#0b2f6b" stroke="#ffffff" strokeWidth="3" />
              </svg>
            </div>
            <div className="phone-body">
              <div className="phone-row">
                <div>
                  <p className="phone-title">Your cleaner is on the way</p>
                  <p className="phone-sub">Arriving 9:12 · window 9:00–10:00</p>
                </div>
                <span className="live">Live</span>
              </div>
              <div className="hairline" />
              <div className="cleaner-row">
                <span className="avatar" aria-hidden="true">
                  M
                </span>
                <div>
                  <p className="phone-name">Your Tydlii-certified cleaner</p>
                  <p className="phone-sub">Vetted · insured · re-clean guaranteed</p>
                </div>
              </div>
              <div className="lock">
                <span>Price locked</span>
                <strong>
                  $229 <span>+ HST</span>
                </strong>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
