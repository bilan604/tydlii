import { AREAS } from "@/lib/areas";
import { SITE } from "@/lib/site";
import { Wordmark } from "./Wordmark";

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm10 1.8H7A2.2 2.2 0 0 0 4.8 7v10A2.2 2.2 0 0 0 7 19.2h10a2.2 2.2 0 0 0 2.2-2.2V7A2.2 2.2 0 0 0 17 4.8zM12 8.2A3.8 3.8 0 1 1 8.2 12 3.8 3.8 0 0 1 12 8.2zm0 1.6A2.2 2.2 0 1 0 14.2 12 2.2 2.2 0 0 0 12 9.8zM17.4 6.4a1 1 0 1 1-1 1 1 1 0 0 1 1-1z"
      />
    </svg>
  );
}

function IconX() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14.7 10.3 22.4 2h-1.8l-6.7 7.2L8.2 2H2l8.1 11.2L2 22h1.8l7.1-7.6L15.8 22H22l-7.3-11.7Zm-2.5 2.7-.8-1.1L4.6 3.3h2.8l5.2 7 .8 1.1 6.8 9.3h-2.8l-5.2-7.1Z"
      />
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14.2 3c.4 2.4 1.8 4.1 4.1 4.4v2.3c-1.4 0-2.7-.4-4-1.2v6.4c0 3.4-2.6 6.1-6.2 6.1S2 18.3 2 14.9s2.7-6.1 6.2-6.1c.3 0 .7 0 1 .1v2.5a3.7 3.7 0 0 0-1-.1 3.6 3.6 0 1 0 3.6 3.6V3h2.4Z"
      />
    </svg>
  );
}

const SOCIAL = [
  { href: SITE.social.instagram, label: "Tydlii on Instagram", icon: IconInstagram },
  { href: SITE.social.x, label: "Tydlii on X", icon: IconX },
  { href: SITE.social.tiktok, label: "Tydlii on TikTok", icon: IconTikTok },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <a className="brand footer-brand" href="/#top" aria-label="Tydlii">
            <Wordmark variant="light" />
          </a>
          <p>More living. Less cleaning.</p>
        </div>
        <div>
          <h2>Neighbourhoods</h2>
          <ul>
            {AREAS.map((area) => (
              <li key={area.name}>
                {area.name}
                {area.wave === "next" ? <span> Next</span> : null}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Visit</h2>
          <ul>
            <li>
              <a href="/#quote">Instant quote</a>
            </li>
            <li>
              <a href="/#how">How it works</a>
            </li>
            <li>
              <a href="/#waitlist">Customer waitlist</a>
            </li>
            <li>
              <a href="/#waitlist">Cleaner waitlist</a>
            </li>
          </ul>
        </div>
        <div>
          <h2>Social</h2>
          <p className="handle">{SITE.social.handle}</p>
          <ul className="social-list">
            {SOCIAL.map((item) => (
              <li key={item.href}>
                <a href={item.href} target="_blank" rel="noopener noreferrer">
                  <item.icon />
                  <span>{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="wrap footer-base">
        <p>© {year} Tydlii. Prices in Canadian dollars. HST is extra where a visit price is shown before tax.</p>
      </div>
    </footer>
  );
}
