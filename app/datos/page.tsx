import type { Metadata } from "next";
import { DATA_CITATION, DATA_LICENSE, ORGANIZATION_REF, pageMetadata } from "@/lib/metadata";
import { fetchUltimoMes } from "@/lib/datos-cache";
import { SITE_URL } from "@/lib/site";
import JsonLd from "@/components/json-ld";
import { Suspense } from "react";
import DiasInsalubres from "@/components/datos/dias-insalubres";
import ActualizacionMensual from "@/components/datos/actualizacion-mensual";
import DiasInsalubresSkeleton from "@/components/datos/dias-insalubres-skeleton";
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
  const image = `/api/og/dias-insalubres?format=link&year=${ultimo.ano}&mes=${ultimo.mes}&d=4`;
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
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 lg:px-8 lg:pb-32 lg:pt-12">
        <h1 className="sr-only">Datos de calidad del aire de la Zona Metropolitana de Monterrey</h1>
        <Suspense fallback={<div className="mb-16 h-64 rounded-2xl border border-stone-200 bg-white" />}>
          <ActualizacionMensual />
        </Suspense>
        <Suspense fallback={<DiasInsalubresSkeleton />}>
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
        {/* The monthly summary card (DiasInsalubresResumen, with
            DiasInsalubresShareSkeleton as its fallback) is hidden since
            2026-10-25; the component stays. */}
        {/* #descarga: the card's anchor for links from elsewhere; scroll-mt
            leaves a little air above it. */}
        <div id="descarga" className="mt-16 scroll-mt-6">
          <Suspense fallback={<DescargaDatosSkeleton />}>
            <DescargaDatos />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
