import type { Metadata } from "next";
import JsonLd from "@/components/json-ld";
import { OG_BASE, SITE_DESCRIPTION, SITE_NAME, sectionCard } from "@/lib/metadata";
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
  // image (sectionCard); Next replaces the layout's openGraph wholesale.
  openGraph: {
    ...OG_BASE,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
    images: sectionCard("inicio", SITE_NAME),
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
    // Ends like every page (pb-24 lg:pb-32 before the footer), centered in
    // the screen below the navbar. That bottom padding lifts the centered
    // hero; lg:pt-8 brings it back down a little on desktop.
    <div className="flex min-h-below-header items-center pb-24 lg:pb-32 lg:pt-8">
      <JsonLd data={websiteSchema} />
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 pt-16 lg:grid-cols-2 lg:px-8">
        <div className="flex flex-col gap-8">
          <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight text-neutral-900 md:text-6xl lg:text-7xl">
            Trabajamos por una mejor{" "}
            <span className="text-[#226caf]">calidad del aire.</span>
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-neutral-700 md:text-xl">
            Somos una organización de la sociedad civil dedicada a generar
            esfuerzos colaborativos y fundamento técnico para mejorar la calidad
            del aire en la Zona Metropolitana de Monterrey.
          </p>
        </div>

        <div className="w-full">
          <AirQualitySlider />
        </div>
      </div>
    </div>
  );
}
