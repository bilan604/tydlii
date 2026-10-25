import { Wordmark } from "./Wordmark";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-row">
        <a href="/" aria-label="Tydlii">
          <Wordmark variant="ink" className="footer-logo" />
        </a>
        <p>Every clean, guaranteed. · Toronto, Ontario · Prices before HST</p>
      </div>
    </footer>
  );
}
