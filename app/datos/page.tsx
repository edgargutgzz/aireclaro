import type { Metadata } from "next";
import SimaDiasInsalubres from "@/components/data/sima-dias-insalubres";

export const metadata: Metadata = {
  title: "Datos",
  description:
    "Explora y descarga los datos históricos de calidad del aire de Aire Claro.",
};

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export default async function Datos() {
  const year = 2026;
  const month = 8; // agosto
  const dias = await SimaDiasInsalubres(year, month);
  const totalInsalubres = dias.filter((d) => d.estatus === "insalubre").length;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-2xl px-4 pb-10 pt-8 md:pt-6 md:pl-24">
        <div className="rounded-2xl bg-gray-50 px-5 py-5">
          <h1 className="text-lg font-semibold text-gray-800">
            Días Insalubres en la Zona Metropolitana de Monterrey
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            <span className="font-semibold text-red-500">{totalInsalubres}</span>{" "}
            días insalubres de PM2.5 en {MESES[month - 1]} {year}
          </p>

          <div className="mt-6 grid grid-cols-7 gap-2">
            {dias.map(({ dia, estatus }) => (
              <div
                key={dia}
                className={`flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-medium ${
                  estatus === "insalubre"
                    ? "bg-red-100 text-red-700"
                    : estatus === "saludable"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {dia}
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" /> Insalubre
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-green-400" /> Saludable
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" /> Sin datos
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
