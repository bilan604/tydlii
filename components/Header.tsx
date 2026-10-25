"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Wordmark } from "./Wordmark";

const LINKS = [
  { href: "/#quote", label: "Quote" },
  { href: "/#how", label: "How it works" },
  { href: "/#waitlist", label: "Waitlist" },
];

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const onHero = pathname === "/";
  const light = onHero && !scrolled && !open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("nav-open", open);
    return () => document.body.classList.remove("nav-open");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className={light ? "site-header is-light" : "site-header is-solid"}>
      <div className="wrap header-bar">
        <a className="brand" href="/#top" aria-label="Tydlii">
          <Wordmark variant="light" className={light ? "brand-mark" : "brand-mark is-hidden"} />
          <Wordmark variant="ink" className={light ? "brand-mark is-hidden" : "brand-mark"} />
        </a>
        <nav className="desk-nav" aria-label="Primary">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
          <a className="btn btn-teal" href="/#waitlist">
            Join the waitlist
          </a>
        </nav>
        <button
          className="menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr">{open ? "Close menu" : "Open menu"}</span>
          <span className="menu-bars" aria-hidden="true" />
        </button>
      </div>
      <div className={open ? "mobile-nav is-open" : "mobile-nav"} id="mobile-nav" hidden={!open}>
        <nav aria-label="Mobile">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <a className="btn btn-teal" href="/#waitlist" onClick={() => setOpen(false)}>
            Join the waitlist
          </a>
        </nav>
      </div>
    </header>
  );
}
