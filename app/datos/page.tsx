import type { Metadata } from "next";
import { DATA_CITATION, DATA_LICENSE, ORGANIZATION_REF, pageMetadata } from "@/lib/metadata";
import { SITE_URL } from "@/lib/site";
import JsonLd from "@/components/json-ld";
import { Suspense } from "react";
import DatosHeader from "@/components/datos/datos-header";
import DatosHeaderSkeleton from "@/components/datos/datos-header-skeleton";
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

export const metadata: Metadata = pageMetadata({
  title: "Datos",
  description: "Explora y descarga los datos históricos de calidad del aire del Observatorio del Aire.",
  path: "/datos",
});

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
        <div className="mb-8">
          <Suspense fallback={<DatosHeaderSkeleton />}>
            <DatosHeader />
          </Suspense>
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
        {/* Target of the top bar's "Descargar datos"; scroll-mt leaves a
            little air above the card when it jumps here. */}
        <div id="descarga" className="mt-16 scroll-mt-6">
          <Suspense fallback={<DescargaDatosSkeleton />}>
            <DescargaDatos />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
