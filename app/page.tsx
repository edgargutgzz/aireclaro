import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import JsonLd from "@/components/json-ld";
import { OG_BASE, SITE_DESCRIPTION, SITE_NAME } from "@/lib/metadata";
import { SITE_URL } from "@/lib/site";
import AirQualitySlider from "@/components/home/air-quality-slider";

// Homepage. The hero is ported from observatoriodelaire.com's homepage. The map
// lives at /mapa; proxy.ts sends embeds and legacy map links that still point
// at / over there.
// The homepage keeps the layout's title and link card (the slogan alone); it
// adds a longer description for search results, where Google tends to replace
// one this short, and its canonical (see lib/metadata.ts for why that isn't
// set in the layout).
export const metadata: Metadata = {
  // The link card is set here, not inherited, so the homepage gets its own
  // image (app/api/og/home); Next replaces the layout's openGraph wholesale.
  openGraph: {
    ...OG_BASE,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
    images: [{ url: "/api/og/home", width: 1200, height: 630, alt: SITE_NAME }],
  },
  description:
    "Observatorio ciudadano de la calidad del aire en la Zona Metropolitana de Monterrey, con mapa en vivo, datos abiertos de PM2.5 y PM10, análisis y editoriales.",
  alternates: { canonical: "/" },
};

// Tells Google what to call the site in results ("Observatorio del Aire"
// instead of the bare domain). Homepage only, per Google's site-name guide.
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: "OCCAMM",
  url: `${SITE_URL}/`,
};

export default function Home() {
  return (
    <div className="flex min-h-screen items-center">
      <JsonLd data={websiteSchema} />
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:px-8">
        <div className="flex flex-col gap-8">
          {/* A quiet invitation to /datos above the slogan: small, neutral,
              same 12px radius as the site's other small elements. */}
          <Link
            href="/datos"
            className="group -mb-2 inline-flex w-fit items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 shadow-xs transition-colors hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
          >
            Datos abiertos de PM2.5 y PM10
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight text-gray-900 md:text-6xl lg:text-7xl">
            Trabajamos por una mejor{" "}
            <span className="text-[#226caf]">calidad del aire.</span>
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-gray-600 md:text-xl">
            Somos una organización de la sociedad civil dedicada a generar
            esfuerzos colaborativos y fundamento técnico para mejorar la calidad
            del aire en la Zona Metropolitana de Monterrey.
          </p>
        </div>

        <div className="relative flex items-center justify-center">
          {/* Decorative blobs */}
          <div className="absolute -right-6 -top-6 h-72 w-72 rounded-full bg-blue-200/50 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-64 w-64 rounded-full bg-teal-200/50 blur-3xl" />
          <div className="relative z-10 w-full">
            <AirQualitySlider />
          </div>
        </div>
      </div>
    </div>
  );
}
