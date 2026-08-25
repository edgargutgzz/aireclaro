import type { Metadata } from "next";
import SimaDiasInsalubres from "@/components/data/sima-dias-insalubres";
import DiasInsalubresPager from "@/components/datos/dias-insalubres-pager";

export const metadata: Metadata = {
  title: "Datos",
  description:
    "Explora y descarga los datos históricos de calidad del aire de Aire Claro.",
};

const MESES_A_MOSTRAR = [
  { year: 2026, month: 8 },
  { year: 2026, month: 7 },
];

export default async function Datos() {
  const meses = await Promise.all(
    MESES_A_MOSTRAR.map(async ({ year, month }) => ({
      year,
      month,
      dias: await SimaDiasInsalubres(year, month),
    })),
  );

  return (
    <div className="min-h-screen">
      <div className="container mx-auto flex max-w-2xl flex-col gap-6 px-4 pb-10 pt-8 md:pt-6 md:pl-24">
        <DiasInsalubresPager meses={meses} />
      </div>
    </div>
  );
}
