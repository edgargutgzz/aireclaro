import type { Metadata } from "next";
import Image from "next/image";

// Ported from observatoriodelaire.com/recursos: same copy, documents and card
// grid. Each card opens its PDF in a new tab. The PDF and cover share a file
// name, so each entry names it once.

export const metadata: Metadata = {
  title: "Recursos",
  description:
    "Descarga los documentos e investigaciones que hemos recopilado para entender la calidad del aire en la ciudad.",
};

const TYPE_COLORS = {
  Comunicado: "bg-green-100",
  Informe: "bg-blue-100",
  "Boletín de Prensa": "bg-red-100",
  Manual: "bg-purple-100",
  Investigación: "bg-yellow-100",
  Iniciativa: "bg-orange-100",
} as const;

type Recurso = {
  title: string;
  file: string;
  type: keyof typeof TYPE_COLORS;
  year: number;
};

const RECURSOS: Recurso[] = [
  {
    title:
      "Comentarios a propuesta 2026 del Programa de Respuesta a Contingencias Atmosféricas de la ZMM",
    file: "2026-prca",
    type: "Comunicado",
    year: 2026,
  },
  {
    title:
      "Posición Común de America Latina y el Caribe Sobre el Cambio Climático y Salud",
    file: "2025-america-latina",
    type: "Comunicado",
    year: 2025,
  },
  {
    title: "Revista Informativa sobre Calidad de Aire y Salud",
    file: "2025-aire-salud",
    type: "Investigación",
    year: 2025,
  },
  {
    title: "Cruzada por una Gasolina de Calidad para Monterrey",
    file: "2025-gasolina",
    type: "Informe",
    year: 2025,
  },
  {
    title: "Uso de Acolchado en la Zona Metropolitana de Monterrey",
    file: "2024-acolchado",
    type: "Comunicado",
    year: 2024,
  },
  {
    title: "Mecanismo Financiero de Servicios de Agua y Drenaje de Monterrey",
    file: "2024-mecanismos",
    type: "Comunicado",
    year: 2024,
  },
  {
    title: "Índice de Calidad del Aire NOM-172-SEMARNAT-2023",
    file: "2024-indice",
    type: "Informe",
    year: 2024,
  },
  {
    title: "Mala Calidad del Aire Amenaza al Fútbol Mexicano",
    file: "2023-futbol",
    type: "Boletín de Prensa",
    year: 2023,
  },
  {
    title: "Sobre la Necesaria Actualización de la NOM-043-SEMARNAT-1993",
    file: "2023-norma",
    type: "Informe",
    year: 2023,
  },
  {
    title: "Día Mundial del Aire Limpio por un Cielo Azul",
    file: "2022-dia",
    type: "Boletín de Prensa",
    year: 2022,
  },
  {
    title: "Calidad de Combustibles y Calidad del Aire en la ZMM",
    file: "2021-combustibles",
    type: "Informe",
    year: 2021,
  },
  {
    title: "Emisiones del Sector de la Construcción en Monterrey",
    file: "2020-emisiones",
    type: "Manual",
    year: 2020,
  },
  {
    title: "Externalidades de la Reforma Eléctrica",
    file: "2020-reforma",
    type: "Informe",
    year: 2020,
  },
  {
    title: "Calidad del Aire Durante la Cuarentena en Nuevo León",
    file: "2020-cuarentena",
    type: "Informe",
    year: 2020,
  },
  {
    title: "Institución Local sobre los Efectos de la Mala Calidad del Aire",
    file: "2020-investigacion",
    type: "Investigación",
    year: 2020,
  },
  {
    title: "Creación de la Comisión de la Calidad del Aire en Nuevo León",
    file: "2019-comision",
    type: "Iniciativa",
    year: 2019,
  },
];

export default function Recursos() {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-32 pt-16 lg:px-8 lg:pb-48 lg:pt-40">
      <div className="flex flex-col text-center">
        <h1 className="text-md md:text-lg">Recursos</h1>
        <p className="pt-4 text-2xl font-bold md:px-20 md:pt-6 md:text-4xl md:leading-tight">
          Descarga los documentos e investigaciones que hemos recopilado para
          entender la calidad del aire en la ciudad.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-12 pt-32 md:gap-y-20 md:pt-56 lg:grid-cols-3 lg:gap-x-8">
        {RECURSOS.map((recurso) => (
          <a
            key={recurso.file}
            href={`/recursos/${recurso.file}.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="transform rounded-lg bg-white p-4 shadow-md transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
          >
            <Image
              src={`/recursos/${recurso.file}.webp`}
              alt={recurso.title}
              width={1024}
              height={576}
              sizes="(min-width: 1280px) 384px, (min-width: 1024px) 30vw, 100vw"
              className="aspect-video w-full rounded-lg object-cover"
            />
            <h2 className="pt-4 text-lg font-semibold md:pt-6 md:text-2xl lg:pt-4 lg:text-lg">
              {recurso.title}
            </h2>
            <div className="flex items-center justify-between pt-8 md:pt-10 lg:pt-8">
              <p
                className={`rounded-lg px-2 py-1 text-sm text-gray-600 md:text-lg lg:text-sm ${TYPE_COLORS[recurso.type]}`}
              >
                {recurso.type}
              </p>
              <p className="text-sm text-gray-600 md:text-lg lg:text-sm">
                {recurso.year}
              </p>
            </div>
            <span className="sr-only"> (PDF, abre en una nueva pestaña)</span>
          </a>
        ))}
      </div>
    </div>
  );
}
