import type { Metadata } from "next";
import { Suspense } from "react";
import DiasInsalubres from "@/components/datos/dias-insalubres";
import DiasInsalubresSkeleton from "@/components/datos/dias-insalubres-skeleton";
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
    "Explora y descarga los datos históricos de calidad del aire de Aire Claro.",
};

export default function Datos() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-16 lg:px-8 lg:pt-28">
        {/* Charts hidden temporarily, 2026-09-17 -- re-enable by restoring
            the three <Suspense> blocks below. */}
        {false && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
