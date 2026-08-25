import type { Metadata } from "next";
import getDiasInsalubres from "@/lib/get-dias-insalubres";
import DiasInsalubresChart from "@/components/datos/dias-insalubres-chart";

export const metadata: Metadata = {
  title: "Datos",
  description:
    "Explora y descarga los datos históricos de calidad del aire de Aire Claro.",
};

export const revalidate = 21600; // 6 hours - only today's day-cell can actually change; past days are settled

// 2025 is fully historical (static files); 2026 runs through the current
// month, backed by static files up to June and live SIMA data after that.
const MESES_A_MOSTRAR = [
  ...Array.from({ length: 12 }, (_, i) => ({ year: 2025, month: i + 1 })),
  ...Array.from({ length: 8 }, (_, i) => ({ year: 2026, month: i + 1 })),
];

export default async function Datos() {
  const meses = await Promise.all(
    MESES_A_MOSTRAR.map(async ({ year, month }) => ({
      year,
      month,
      dias: await getDiasInsalubres(year, month),
    })),
  );

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-16 lg:px-8 lg:pt-28">
        <div className="mb-8 flex items-end justify-between border-b border-gray-200 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Zona Metropolitana de Monterrey
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">Calidad del Aire</h1>
          </div>
          <div className="inline-flex items-center gap-1 rounded-2xl bg-gray-100 p-1">
            <button className="rounded-xl bg-white px-5 py-2 text-sm font-semibold text-stone-800 shadow-sm">
              PM2.5
            </button>
            <button
              disabled
              title="Próximamente"
              className="cursor-not-allowed rounded-xl px-5 py-2 text-sm font-semibold text-gray-300"
            >
              PM10
            </button>
          </div>
        </div>

        <DiasInsalubresChart meses={meses} />
      </div>
    </div>
  );
}
