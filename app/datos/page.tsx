import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datos",
  description:
    "Explora y descarga los datos históricos de calidad del aire de Aire Claro.",
};

export default function Datos() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="container mx-auto max-w-2xl flex-1 px-4 pb-10 pt-6 md:pt-28">
        <h1 className="mb-2 text-lg font-semibold text-gray-800">Datos</h1>
        <p className="text-sm leading-relaxed text-gray-500">
          Próximamente: gráficas históricas y una tabla para explorar y
          descargar los datos de calidad del aire.
        </p>
      </div>
    </div>
  );
}
