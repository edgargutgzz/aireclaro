import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar/navbar";
import MainContent from "@/components/main-content";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin", "latin-ext"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://aireclaro.com"),
  title: {
    default: "Aire Claro — Calidad del Aire en Monterrey",
    template: "%s | Aire Claro",
  },
  appleWebApp: {
    capable: true,
    title: "Aire Claro",
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
    title: "Aire Claro — Calidad del Aire en Monterrey",
    description:
      "Monitorea en tiempo real la calidad del aire (PM2.5) en Monterrey y Zona Metropolitana. Datos de estaciones SIMA y sensores ciudadanos PurpleAir.",
    url: "https://aireclaro.com",
    type: "website",
    locale: "es_MX",
    images: [
      {
        url: "https://aireclaro.com/aireclaro-logo-fb.png",
        width: 1200,
        height: 630,
        alt: "Aire Claro — Calidad del Aire en Monterrey",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aire Claro — Calidad del Aire en Monterrey",
    description:
      "Monitorea en tiempo real la calidad del aire (PM2.5) en Monterrey y Zona Metropolitana.",
    images: [
      {
        url: "https://aireclaro.com/aireclaro-logo-fb.png",
        alt: "Aire Claro — Calidad del Aire en Monterrey",
      },
    ],
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Observatorio Ciudadano de la Calidad del Aire (OCCAMM)",
  url: "https://aireclaro.com",
  logo: "https://aireclaro.com/aireclaro-logo.png",
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
  sameAs: ["https://observatoriodelaire.com"],
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
          {/* Navbar */}
          <div className="fixed top-0 z-[55] w-full">
            <Navbar />
          </div>
          {/* Content - no padding */}
          <MainContent>{children}</MainContent>
        </div>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
