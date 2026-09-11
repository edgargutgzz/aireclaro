import type { Metadata } from "next";
import DiasInsalubres from "@/components/datos/dias-insalubres";

export const metadata: Metadata = {
  title: "Calidad del aire",
  description:
    "Explora y descarga los datos históricos de calidad del aire de Aire Claro.",
};

export default function Datos() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-16 lg:px-8 lg:pt-28">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Calidad del aire</h1>
        <div className="mt-6">
          <DiasInsalubres />
        </div>
      </div>
    </div>
  );
}
