import type { Metadata } from "next";
// import DiasInsalubres from "@/components/datos/dias-insalubres";
// import CoberturaEstaciones from "@/components/datos/cobertura-estaciones";

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
        {/* Both charts hidden for now, 2026-09-14 -- data pipelines (cron
            computation, tables) stay in place, just not rendered. Re-enable
            by uncommenting the imports above and this block. */}
        {/* <DiasInsalubres />
        <div className="mt-16">
          <CoberturaEstaciones />
        </div> */}
      </div>
    </div>
  );
}
