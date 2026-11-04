import { Wordmark } from "./Wordmark";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-row">
        <a href="/" aria-label="Tydlii">
          <Wordmark variant="ink" className="footer-logo" />
        </a>
        <div className="footer-meta">
          <p>Tydlii clean guaranteed. · Toronto, Ontario · Est. 2026</p>
          <nav className="footer-links" aria-label="Policies">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
