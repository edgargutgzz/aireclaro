import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar/navbar";
import MainContent from "@/components/main-content";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SITE_URL } from "@/lib/site";
import { OG_BASE, OG_IMAGES, SITE_DESCRIPTION, SITE_NAME } from "@/lib/metadata";

// Latin only: it covers all of Spanish (áéíóúñü¿¡); latin-ext was a whole
// extra font file no page text uses.
const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "calidad del aire Monterrey",
    "PM2.5 Monterrey",
    "calidad del aire Zona Metropolitana",
    "SIMA Monterrey",
    "contaminación aire Monterrey",
    "air quality Monterrey",
    "calidad del aire Nuevo León",
    "monitoreo aire Monterrey",
  ],
  openGraph: {
    ...OG_BASE,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
    images: OG_IMAGES,
  },
  twitter: { card: "summary_large_image" },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Observatorio Ciudadano de la Calidad del Aire (OCCAMM)",
  url: SITE_URL,
  logo: `${SITE_URL}/navbar/occamm-logo.png`,
  description:
    "Organización de la sociedad civil dedicada a monitorear y mejorar la calidad del aire en Nuevo León.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Blvd. Antonio L. Rodríguez 2100",
    addressLocality: "Monterrey",
    addressRegion: "Nuevo León",
    addressCountry: "MX",
  },
  contactPoint: {
    "@type": "ContactPoint",
    email: "contacto@observatoriodelaire.com",
    contactType: "customer support",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className={inter.className}>
        <div className="flex min-h-svh flex-col">
          {/* Navbar - mobile bottom bar is self-contained fixed; desktop header is in normal flow */}
          <Navbar />
          {/* Content - no padding */}
          <MainContent>{children}</MainContent>
        </div>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
