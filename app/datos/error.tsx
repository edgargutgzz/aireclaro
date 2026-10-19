"use client";

// Catches a failed sima_insalubres_mensual read (rare -- it's a trivial
// table select, see components/datos/dias-insalubres.tsx) so a visitor sees
// a plain message instead of Next's generic crash page.
export default function DatosError({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-stone-200 bg-white px-5 py-12 text-center">
      <p className="text-base font-medium text-stone-700">Datos no disponibles en este momento</p>
      <p className="max-w-md text-sm text-stone-500">
        No pudimos cargar los datos de calidad del aire. Intenta de nuevo en unos minutos.
      </p>
      <button
        onClick={reset}
        className="mt-1 rounded-xl bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
      >
        Reintentar
      </button>
    </div>
  );
}
