import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar/navbar";
import MainContent from "@/components/main-content";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SITE_URL } from "@/lib/site";

// Latin only: it covers all of Spanish (áéíóúñü¿¡); latin-ext was a whole
// extra font file no page text uses.
const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Observatorio del Aire, calidad del aire en Monterrey",
    template: "%s | Observatorio del Aire",
  },
  appleWebApp: {
    capable: true,
    title: "Observatorio del Aire",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
  description:
    "Monitorea en tiempo real la calidad del aire (PM2.5) en Monterrey y Zona Metropolitana. Datos de estaciones SIMA y sensores ciudadanos PurpleAir.",
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
    title: "Observatorio del Aire, calidad del aire en Monterrey",
    description:
      "Monitorea en tiempo real la calidad del aire (PM2.5) en Monterrey y Zona Metropolitana. Datos de estaciones SIMA y sensores ciudadanos PurpleAir.",
    url: "/",
    type: "website",
    locale: "es_MX",
    images: [
      {
        url: "/aireclaro-logo-fb.png",
        width: 1200,
        height: 630,
        alt: "Observatorio del Aire, calidad del aire en Monterrey",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Observatorio del Aire, calidad del aire en Monterrey",
    description:
      "Monitorea en tiempo real la calidad del aire (PM2.5) en Monterrey y Zona Metropolitana.",
    images: [
      {
        url: "/aireclaro-logo-fb.png",
        alt: "Observatorio del Aire, calidad del aire en Monterrey",
      },
    ],
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Observatorio Ciudadano de la Calidad del Aire (OCCAMM)",
  url: SITE_URL,
  logo: `${SITE_URL}/aireclaro-logo.png`,
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
