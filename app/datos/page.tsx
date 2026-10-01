import type { Metadata } from "next";
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

// DiasInsalubres reads a cached aggregate (see that component), but the
// underlying query is occasionally slow/flaky (small Supabase instance,
// intermittent contention -- confirmed 2026-09-12, not a hard failure).
// Without this, Next tries to run that query at *build* time to prerender
// the page statically, and a single slow build hit fails the whole
// deployment. Forcing dynamic keeps it a per-request (cached) fetch instead.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Calidad del aire",
  description:
    "Explora y descarga los datos históricos de calidad del aire del Observatorio del Aire.",
};

export default function Datos() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-6 pb-32 pt-10 lg:px-8 lg:pt-12">
        <div className="mb-16">
          <Suspense fallback={<DatosHeaderSkeleton />}>
            <DatosHeader />
          </Suspense>
        </div>
        {/* DiasInsalubres also renders its monthly summary card, above it. */}
        <Suspense
          fallback={
            <>
              <div className="mb-16">
                <DiasInsalubresShareSkeleton />
              </div>
              <DiasInsalubresSkeleton />
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
      </div>
    </div>
  );
}
