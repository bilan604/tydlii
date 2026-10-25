import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Outfit } from "next/font/google";
import { AREAS } from "@/lib/areas";
import { SITE } from "@/lib/site";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

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
        url: "/og.png",
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
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0b2f6b",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: SITE.name,
  url: SITE.url,
  image: `${SITE.url}/og.png`,
  slogan: SITE.slogan,
  description: SITE.description,
  areaServed: AREAS.map((area) => ({
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
    <html lang="en-CA" className={`${outfit.variable} ${fraunces.variable}`}>
      <body>
        <a className="skip" href="#content">
          Skip to content
        </a>
        <Header />
        <div id="content">{children}</div>
        <Footer />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}
