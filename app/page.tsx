import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import JsonLd from "@/components/json-ld";
import { OG_BASE, SITE_DESCRIPTION, SITE_NAME, sectionCard } from "@/lib/metadata";
import { SITE_URL } from "@/lib/site";
import AirQualitySlider from "@/components/home/air-quality-slider";
import AirNowCard from "@/components/home/air-now-card";
import LiveRefresh from "@/components/data/live-refresh";
import PurpleAirSensors from "@/components/data/purple-air-sensors";
import PurpleAirData from "@/components/data/purple-air-data";
import SimaSensors from "@/components/data/sima-sensors";
import SimaData from "@/components/data/sima-data";
import { fetchWithFallback } from "@/utils/fetch";
import { buildSelection, pickDefaultSensor } from "@/components/mapa/lib";
import type { Data, Sensor } from "@/components/mapa/types";

// The live card reads the map's own cached feeds (components/data/cache.ts);
// the page re-renders at most every 5 minutes, and LiveRefresh keeps an open
// tab current.
export const revalidate = 300;

// Homepage. The hero is ported from observatoriodelaire.com's homepage. The map
// lives at /calidad-del-aire; proxy.ts sends embeds and legacy map links that still point
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

// The station the live card shows: the map sidebar's rule (pickDefaultSensor)
// over the same data the map gets, so the two always agree.
async function getAirNow() {
  const [paSensors, paData, simaSensors, simaData] = await Promise.all([
    fetchWithFallback(PurpleAirSensors, []),
    fetchWithFallback(PurpleAirData, []),
    fetchWithFallback(SimaSensors, []),
    fetchWithFallback(SimaData, []),
  ]);
  const reporting = new Set(paData.map((r) => r.sensor_id));
  const sensors = [
    ...paSensors.filter((s) => reporting.has(s.sensor_id)).map((s) => ({ ...s, source: "purpleAir" })),
    ...simaSensors.map((s) => ({ ...s, source: "sima" })),
  ] as Sensor[];
  const data = [...paData, ...simaData] as Data[];
  const def = pickDefaultSensor(sensors, data);
  return def ? buildSelection(def, data) : null;
}

export default async function Home() {
  const airNow = await getAirNow().catch(() => null);
  return (
    // The live card first, then the hero, centered in what's left of the
    // screen. Ends like every page (pb-24 lg:pb-32 before the footer).
    <div className="flex min-h-below-header flex-col">
      <JsonLd data={websiteSchema} />
      <AirNowCard subject={airNow} />
      <LiveRefresh />
      {/* Desktop (2026-11-04, option F of the hero mockups): the photo whole,
          uncropped 16:9 across the grid under the live card, then headline and
          paragraph side by side in a white card with the live card's border
          (option D of the text mockups), so the text doesn't float. Phones
          keep the stacked hero (headline, paragraph, cropped photo). */}
      <div className="flex flex-1 items-center pb-24 lg:block lg:pb-32">
        <div className="mx-auto flex w-full max-w-7xl flex-col px-6 pt-16 lg:px-8 lg:pt-14">
          <div className="grid grid-cols-1 gap-8 lg:mt-10 lg:grid-cols-2 lg:items-start lg:gap-12 lg:rounded-2xl lg:border lg:border-stone-200 lg:bg-white lg:p-10">
            <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight text-neutral-900 md:text-6xl lg:text-5xl">
              Trabajamos por una mejor{" "}
              <span className="text-[#226caf]">calidad del aire.</span>
            </h1>
            <div>
              <p className="max-w-lg text-lg leading-relaxed text-neutral-700 md:text-xl">
                Somos una organización de la sociedad civil dedicada a generar
                esfuerzos colaborativos y fundamento técnico para mejorar la calidad
                del aire en la Zona Metropolitana de Monterrey.
              </p>
              {/* The /proyectos card link's shape. */}
              <Link
                href="/quienes-somos"
                className="group mt-5 inline-flex items-center gap-1.5 text-base font-medium text-neutral-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-800"
              >
                Conoce quiénes somos
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </div>
          </div>

          <div className="mt-12 w-full lg:order-first lg:mt-0">
            <AirQualitySlider />
          </div>
        </div>
      </div>
    </div>
  );
}
