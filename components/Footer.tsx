import { Wordmark } from "./Wordmark";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-row">
        <a href="/" aria-label="Tydlii">
          <Wordmark variant="ink" className="footer-logo" />
        </a>
        <p>Tydlii clean guaranteed. · Toronto, Ontario · Est. 2026</p>
      </div>
    </footer>
  );
}
