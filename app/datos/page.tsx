import type { Metadata } from "next";
import { DATA_CITATION, DATA_LICENSE, ORGANIZATION_REF, pageMetadata } from "@/lib/metadata";
import { fetchUltimoMes } from "@/lib/datos-cache";
import { SITE_URL } from "@/lib/site";
import JsonLd from "@/components/json-ld";
import { Suspense } from "react";
import { ArrowDownToLine } from "lucide-react";
import DatosAcerca from "@/components/datos/datos-acerca";
import DatosAcercaSkeleton from "@/components/datos/datos-acerca-skeleton";
import DiasInsalubres from "@/components/datos/dias-insalubres";
import DiasInsalubresSkeleton from "@/components/datos/dias-insalubres-skeleton";
import DiasInsalubresShareSkeleton from "@/components/datos/dias-insalubres-share-skeleton";
import CoberturaEstaciones from "@/components/datos/cobertura-estaciones";
import CoberturaEstacionesSkeleton from "@/components/datos/cobertura-estaciones-skeleton";
import PromedioAnualEstacion from "@/components/datos/promedio-anual-estacion";
import PromedioAnualSkeleton from "@/components/datos/promedio-anual-skeleton";
import DescargaDatos from "@/components/datos/descarga-datos";
import DescargaDatosSkeleton from "@/components/datos/descarga-datos-skeleton";

// DiasInsalubres reads a cached aggregate (see that component), but the
// underlying query is occasionally slow/flaky (small Supabase instance,
// intermittent contention -- confirmed 2026-09-12, not a hard failure).
// Without this, Next tries to run that query at *build* time to prerender
// the page statically, and a single slow build hit fails the whole
// deployment. Forcing dynamic keeps it a request-time read instead, served from
// the data cache (lib/datos-cache.ts) after the first visit.
export const dynamic = "force-dynamic";

const DATOS_TITLE = "Datos";
const DATOS_DESCRIPTION = "Explora y descarga los datos históricos de calidad del aire en la Zona Metropolitana de Monterrey.";

// A shared /datos link unfurls with the month's result (the monthly summary
// as a 1200x630 card, app/api/og/dias-insalubres?format=link) instead of the
// generic logo card. The month is in the image URL so chat apps, which cache
// previews per image URL, fetch a new card each month. Falls back to the
// generic card if the latest month can't be read.
export async function generateMetadata(): Promise<Metadata> {
  const ultimo = await fetchUltimoMes().catch(() => null);
  if (!ultimo) return pageMetadata({ title: DATOS_TITLE, description: DATOS_DESCRIPTION, path: "/datos" });
  // d= is the card design's version: bump it when the design changes so chat
  // apps (which cache per image URL) fetch the new one.
  const image = `/api/og/dias-insalubres?format=link&year=${ultimo.ano}&mes=${ultimo.mes}&d=3`;
  return pageMetadata({
    title: DATOS_TITLE,
    description: DATOS_DESCRIPTION,
    path: "/datos",
    images: [{ url: image, width: 1200, height: 630, alt: "Días sobre la norma de salud en la Zona Metropolitana de Monterrey" }],
  });
}

// Lists the download in Google Dataset Search.
const datasetSchema = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Calidad del aire (PM2.5 y PM10) en la Zona Metropolitana de Monterrey",
  description:
    "Mediciones horarias de PM2.5 y PM10 de las estaciones de monitoreo del SIMA en la Zona Metropolitana de Monterrey, publicadas por SINAICA (INECC). Una fila por estación, contaminante, fecha y hora, sin validación ni redondeo. Se actualiza cada mes.",
  url: `${SITE_URL}/datos`,
  keywords: ["calidad del aire", "PM2.5", "PM10", "Monterrey", "Nuevo León", "SIMA", "SINAICA"],
  creator: ORGANIZATION_REF,
  isBasedOn: "https://sinaica.inecc.gob.mx",
  isAccessibleForFree: true,
  license: DATA_LICENSE.url,
  creditText: DATA_CITATION,
  inLanguage: "es-MX",
  temporalCoverage: "2025-01-01/..",
  spatialCoverage: {
    "@type": "Place",
    name: "Zona Metropolitana de Monterrey, Nuevo León, México",
  },
  variableMeasured: ["PM2.5", "PM10"],
  distribution: {
    "@type": "DataDownload",
    encodingFormat: "text/csv",
    contentUrl: `${SITE_URL}/api/datos/sima-horario?anio=todos&parametro=todos&estacion=todas`,
  },
};

export default function Datos() {
  return (
    <div className="min-h-screen">
      <JsonLd data={datasetSchema} />
      <div className="mx-auto max-w-7xl px-6 pb-32 pt-10 lg:px-8 lg:pt-12">
        <h1 className="sr-only">Datos de calidad del aire de la Zona Metropolitana de Monterrey</h1>
        {/* Charts first; the context (sources, period, pollutants, health)
            and the download sit at the foot. This one quiet link keeps the
            download findable on arrival, since the open data is the point
            of the page. Same tinted h-8 button the chart headers use. */}
        <div className="mb-6 flex justify-end">
          <a
            href="#descarga"
            className="flex h-8 w-fit items-center gap-1.5 rounded-xl bg-gray-100 px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200/70 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden />
            Descargar datos
          </a>
        </div>
        {/* DiasInsalubres also renders its monthly summary card below it. */}
        <Suspense
          fallback={
            <>
              <DiasInsalubresSkeleton />
              <div className="mt-16">
                <DiasInsalubresShareSkeleton />
              </div>
            </>
          }
        >
          <DiasInsalubres />
        </Suspense>
        <div className="mt-16">
          <Suspense fallback={<CoberturaEstacionesSkeleton />}>
            <CoberturaEstaciones />
          </Suspense>
        </div>
        <div className="mt-16">
          <Suspense fallback={<PromedioAnualSkeleton />}>
            <PromedioAnualEstacion />
          </Suspense>
        </div>
        <div className="mt-16">
          <Suspense fallback={<DatosAcercaSkeleton />}>
            <DatosAcerca />
          </Suspense>
        </div>
        {/* Target of the top "Descargar datos" link; scroll-mt leaves a
            little air above the card when it jumps here. */}
        <div id="descarga" className="mt-8 scroll-mt-6">
          <Suspense fallback={<DescargaDatosSkeleton />}>
            <DescargaDatos />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
