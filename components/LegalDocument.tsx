import type { ReactNode } from "react";
import { LEGAL_UPDATED } from "@/lib/legal";
import { Wordmark } from "./Wordmark";

export function LegalDocument({
  current,
  kicker,
  title,
  lede,
  updated = LEGAL_UPDATED,
  children,
}: {
  current: "privacy" | "terms";
  kicker: string;
  title: string;
  lede: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <main>
      <header className="legal-hero shell">
        <div className="hero">
          <svg className="hero-art" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
            <polygon points="640,0 1000,0 1000,600 470,600" fill="var(--teal)" opacity="0.92" />
            <polygon points="760,0 1000,0 1000,600 640,600" fill="var(--blue)" opacity="0.28" />
            <circle cx="120" cy="560" r="220" fill="color-mix(in srgb, var(--on-ink) 4%, transparent)" />
          </svg>
          <div className="legal-mast">
            <div className="hero-brand">
              <a href="/" aria-label="Tydlii">
                <Wordmark variant="light" className="brand-logo" />
              </a>
              <span className="badge">Toronto, Ontario</span>
            </div>
            <nav className="legal-nav" aria-label="Policies">
              <a href="/privacy" aria-current={current === "privacy" ? "page" : undefined}>
                Privacy
              </a>
              <a href="/terms" aria-current={current === "terms" ? "page" : undefined}>
                Terms
              </a>
            </nav>
            <div className="legal-title">
              <p className="eyebrow on-dark">{kicker}</p>
              <h1>{title}</h1>
            </div>
            <p className="lede">{lede}</p>
            <p className="legal-updated">Updated {updated}</p>
          </div>
        </div>
      </header>
      <article className="legal-copy">{children}</article>
    </main>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId}>
      <span className="accent-bar" />
      <h2 id={headingId}>{title}</h2>
      {children}
    </section>
  );
}
