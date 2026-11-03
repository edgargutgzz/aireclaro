import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar/navbar";
import MainContent from "@/components/main-content";
import Analytics from "@/components/analytics";
import { SITE_URL } from "@/lib/site";
import { SOCIAL_LINKS } from "@/components/footer/footer";
import JsonLd from "@/components/json-ld";
import { OG_BASE, OG_IMAGES, ORGANIZATION_REF, SITE_DESCRIPTION, SITE_NAME } from "@/lib/metadata";

// Latin only: it covers all of Spanish (áéíóúñü¿¡); latin-ext was a whole
// extra font file no page text uses.
const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
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

// What Google's Knowledge Graph reads about the Observatory. The logo is the
// square mark (panels show logos square); add the Wikidata item to sameAs
// once it exists.
const organizationSchema = {
  "@context": "https://schema.org",
  ...ORGANIZATION_REF,
  logo: `${SITE_URL}/icon-512.png`,
  foundingDate: "2017-06-09",
  description:
    "Organización de la sociedad civil dedicada a monitorear y mejorar la calidad del aire en Nuevo León.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Blvd. Antonio L. Rodríguez 2100, Col. Rincón de Santa María",
    postalCode: "64650",
    addressLocality: "Monterrey",
    addressRegion: "Nuevo León",
    addressCountry: "MX",
  },
  email: "contacto@observatoriodelaire.com",
  contactPoint: {
    "@type": "ContactPoint",
    email: "contacto@observatoriodelaire.com",
    contactType: "customer support",
  },
  sameAs: SOCIAL_LINKS.map(({ href }) => href),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX">
      <head>
        <JsonLd data={organizationSchema} />
      </head>
      <body className={inter.className}>
        <div className="flex min-h-svh flex-col">
          {/* Skip link: hidden until focused, the first Tab stop on every page. */}
          <a
            href="#contenido"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-stone-900/15"
          >
            Saltar al contenido
          </a>
          <Navbar />
          {/* Content - no padding */}
          <MainContent>{children}</MainContent>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
