import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Outfit } from "next/font/google";
import { AREAS } from "@/lib/areas";
import { SITE } from "@/lib/site";
import { Footer } from "@/components/Footer";
import "./globals.css";

// Render each document on request so Next does not emit s-maxage=31536000.
// Phones were keeping that cached HTML and its old waitlist bundle.
export const dynamic = "force-dynamic";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

// New filename plus query so iMessage/Twitter cannot reuse the cached navy /og.png.
const OG_IMAGE = `${SITE.url}/og-option-a.png?v=option-a-20261025`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Tydlii — More living. Less cleaning.",
    template: "%s · Tydlii",
  },
  description: SITE.description,
  applicationName: "Tydlii",
  authors: [{ name: "Tydlii" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: "Tydlii — More living. Less cleaning.",
    description: SITE.description,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Tydlii — More living. Less cleaning.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: SITE.social.handle,
    creator: SITE.social.handle,
    title: "Tydlii — More living. Less cleaning.",
    description: SITE.description,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Tydlii — More living. Less cleaning.",
      },
    ],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#070707",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: SITE.name,
  url: SITE.url,
  image: OG_IMAGE,
  slogan: SITE.slogan,
  description: SITE.description,
  areaServed: AREAS.filter((area) => area.name !== "Other").map((area) => ({
    "@type": "Place",
    name: `${area.name}, Toronto`,
  })),
  address: {
    "@type": "PostalAddress",
    addressLocality: "Toronto",
    addressRegion: "ON",
    addressCountry: "CA",
  },
  sameAs: [SITE.social.instagram, SITE.social.x, SITE.social.tiktok],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en-CA" className={outfit.variable}>
      <body>
        <a className="skip" href="#content">
          Skip to content
        </a>
        <div id="content">{children}</div>
        <Footer />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}
