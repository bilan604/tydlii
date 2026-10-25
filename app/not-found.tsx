import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="missing">
      <p className="eyebrow">404</p>
      <h1>That page isn’t on the route.</h1>
      <p>The clean is still in CityPlace, King West, and Liberty Village.</p>
      <a className="btn btn-navy" href="/">
        Back to Tydlii
      </a>
    </main>
  );
}
