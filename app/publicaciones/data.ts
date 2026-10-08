import { editoriales, type Editorial } from "./editoriales";

// Everything the Observatory has published, in one list for /publicaciones:
// the newspaper columns (./editoriales.ts) and the documents (below). The
// documents' PDFs and covers live in public/recursos, the columns' in
// public/editoriales; those paths are linked from outside, so they stay put.

// The filter's types, in menu order. `value` is what ?tipo= carries.
export const TIPOS = [
  { value: "columna", label: "Columna de opinión" },
  { value: "informe", label: "Informe" },
  { value: "investigacion", label: "Investigación" },
  { value: "comunicado", label: "Comunicado" },
  { value: "boletin", label: "Boletín de prensa" },
  { value: "manual", label: "Manual" },
  { value: "iniciativa", label: "Iniciativa" },
] as const;

export type Tipo = (typeof TIPOS)[number]["value"];

export type Publicacion = {
  key: string;
  title: string;
  tipo: Tipo;
  year: number;
  /** "2026-08-30"; the documents only carry a year. */
  date?: string;
  author?: string;
  outlet?: string;
  href: string;
  /** An article page on this site, a PDF, or another site's page. */
  format: "articulo" | "pdf" | "externo";
};

// The documents. Each `file` names both public/recursos/<file>.pdf and its
// cover .webp.
const DOCUMENTOS: { title: string; file: string; tipo: Tipo; year: number }[] = [
  {
    title: "Comentarios a propuesta 2026 del Programa de Respuesta a Contingencias Atmosféricas de la ZMM",
    file: "2026-prca",
    tipo: "comunicado",
    year: 2026,
  },
  {
    title: "Posición Común de America Latina y el Caribe Sobre el Cambio Climático y Salud",
    file: "2025-america-latina",
    tipo: "comunicado",
    year: 2025,
  },
  { title: "Revista Informativa sobre Calidad de Aire y Salud", file: "2025-aire-salud", tipo: "investigacion", year: 2025 },
  { title: "Cruzada por una Gasolina de Calidad para Monterrey", file: "2025-gasolina", tipo: "informe", year: 2025 },
  { title: "Uso de Acolchado en la Zona Metropolitana de Monterrey", file: "2024-acolchado", tipo: "comunicado", year: 2024 },
  {
    title: "Mecanismo Financiero de Servicios de Agua y Drenaje de Monterrey",
    file: "2024-mecanismos",
    tipo: "comunicado",
    year: 2024,
  },
  { title: "Índice de Calidad del Aire NOM-172-SEMARNAT-2023", file: "2024-indice", tipo: "informe", year: 2024 },
  { title: "Mala Calidad del Aire Amenaza al Fútbol Mexicano", file: "2023-futbol", tipo: "boletin", year: 2023 },
  { title: "Sobre la Necesaria Actualización de la NOM-043-SEMARNAT-1993", file: "2023-norma", tipo: "informe", year: 2023 },
  { title: "Día Mundial del Aire Limpio por un Cielo Azul", file: "2022-dia", tipo: "boletin", year: 2022 },
  { title: "Calidad de Combustibles y Calidad del Aire en la ZMM", file: "2021-combustibles", tipo: "informe", year: 2021 },
  { title: "Emisiones del Sector de la Construcción en Monterrey", file: "2020-emisiones", tipo: "manual", year: 2020 },
  { title: "Externalidades de la Reforma Eléctrica", file: "2020-reforma", tipo: "informe", year: 2020 },
  { title: "Calidad del Aire Durante la Cuarentena en Nuevo León", file: "2020-cuarentena", tipo: "informe", year: 2020 },
  {
    title: "Institución Local sobre los Efectos de la Mala Calidad del Aire",
    file: "2020-investigacion",
    tipo: "investigacion",
    year: 2020,
  },
  { title: "Creación de la Comisión de la Calidad del Aire en Nuevo León", file: "2019-comision", tipo: "iniciativa", year: 2019 },
];

function fromEditorial(e: Editorial): Publicacion {
  // Every column has one or the other.
  const href = e.content ? `/publicaciones/${e.slug}` : e.pdfLink!;
  return {
    key: e.slug,
    title: e.title,
    tipo: "columna",
    year: Number(e.date.slice(0, 4)),
    date: e.date,
    author: e.author,
    outlet: e.newspaper,
    href,
    format: e.content ? "articulo" : href.startsWith("/") ? "pdf" : "externo",
  };
}

// Newest first. Within a year, the dated columns come before the documents,
// which only carry the year.
export const publicaciones: Publicacion[] = [
  ...editoriales.map(fromEditorial),
  ...DOCUMENTOS.map((d): Publicacion => ({
    key: d.file,
    title: d.title,
    tipo: d.tipo,
    year: d.year,
    href: `/recursos/${d.file}.pdf`,
    format: "pdf",
  })),
].sort((a, b) => b.year - a.year || (b.date ?? "").localeCompare(a.date ?? ""));

export function tipoLabel(tipo: Tipo): string {
  return TIPOS.find((t) => t.value === tipo)!.label;
}

// The columns with an article page (/publicaciones/[slug]).
export const articulos = editoriales.filter((e) => e.content);

export function getArticulo(slug: string): Editorial | undefined {
  return articulos.find((e) => e.slug === slug);
}

// "2026-08-30" → "30 ago 2026".
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function formatDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
