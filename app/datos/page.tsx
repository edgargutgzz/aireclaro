import type { Metadata } from "next";
import getDiasInsalubres from "@/lib/get-dias-insalubres";
import DiasInsalubresPager from "@/components/datos/dias-insalubres-pager";

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
      <div className="container mx-auto flex max-w-2xl flex-col gap-6 px-4 pb-10 pt-8 md:pt-6">
        <DiasInsalubresPager meses={meses} />
      </div>
    </div>
  );
}
