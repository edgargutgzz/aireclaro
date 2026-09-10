import type { Metadata } from "next";
import Pm25DailyTable from "@/components/datos/pm25-daily-table";

export const metadata: Metadata = {
  title: "Datos",
  description:
    "Explora y descarga los datos históricos de calidad del aire de Aire Claro.",
};

export default function Datos() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-16 lg:px-8 lg:pt-28">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Datos</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-500">
          Promedio diario de PM2.5 por estación, agosto 2026. Un día sin
          promedio no tuvo suficientes horas válidas (mínimo 75%).
        </p>
        <div className="mt-6">
          <Pm25DailyTable />
        </div>
      </div>
    </div>
  );
}
