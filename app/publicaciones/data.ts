import { editoriales, type Editorial } from "./editoriales";
import { transcripciones, type Transcripcion } from "./transcripciones";
import { SITE_URL } from "@/lib/site";

// Everything the Observatory has published, in one list for /publicaciones:
// the newspaper columns (./editoriales.ts) and the documents (below). Every
// item has its own page, /publicaciones/[slug]: a column with written content
// shows it in full; everything else shows a summary, a citation and a link to
// the PDF (or the outlet's page). The documents' PDFs and covers live in
// public/recursos, the columns' in public/editoriales; those paths are linked
// from outside, so they stay put.

// The filter's types, in menu order. `value` is what ?tipo= carries.
export const TIPOS = [
  { value: "columna", label: "Columna de opinión" },
  { value: "infografia", label: "Infografía" },
  { value: "informe", label: "Informe" },
  { value: "investigacion", label: "Investigación" },
  { value: "comunicado", label: "Comunicado" },
  { value: "boletin", label: "Boletín de prensa" },
  { value: "manual", label: "Manual" },
  { value: "iniciativa", label: "Iniciativa" },
  { value: "normativa", label: "Normativa" },
] as const;

export type Tipo = (typeof TIPOS)[number]["value"];

export const OCCAMM = "Observatorio Ciudadano de la Calidad del Aire del Área Metropolitana de Monterrey (OCCAMM)";

export type Publicacion = {
  slug: string;
  title: string;
  tipo: Tipo;
  year: number;
  /** "2026-08-30" when the item carries a full date. */
  date?: string;
  /** Who wrote or signed it, as shown on the page. */
  author: string;
  /** The column's authors, one name each, from its byline, for the Autoría
   *  filter. Only columns carry people; other documents keep just `author`. */
  people: string[];
  /** The author as cited ("Chavarría, U."), when it differs from `author`. */
  citeAuthor?: string;
  /** Where it was published (newspaper, journal), if not by the Observatory. */
  outlet?: string;
  summary?: string;
  /** The PDF on this site, another site's page, or none (an article). */
  file?: string;
  externalUrl?: string;
  /** For the documents. */
  pages?: number;
  doi?: string;
  image: string;
  /** Set for a column with its full text on the page: written `content`, or
   *  a `transcripcion` of its clipping (./transcripciones.ts). */
  editorial?: Editorial;
  transcripcion?: Transcripcion;
};

// The documents: all 16 from the old /recursos page. Credits, dates and
// summaries come from each PDF itself.
// Each `file` names both public/recursos/<file>.pdf and its cover .webp.
type Documento = Omit<Publicacion, "file" | "image" | "editorial" | "transcripcion" | "people"> & { file: string };

const DOCUMENTOS: Documento[] = [
  {
    slug: "comentarios-programa-contingencias-2026",
    title: "Comentarios a propuesta 2026 del Programa de Respuesta a Contingencias Atmosféricas de la ZMM",
    file: "2026-prca",
    tipo: "comunicado",
    year: 2026,
    author: OCCAMM,
    pages: 5,
    summary:
      "Comentarios del Observatorio a la actualización del Programa de Respuesta a Contingencias Atmosféricas de la Zona Metropolitana de Monterrey, sometida a consulta pública en abril y mayo de 2026, con una comparación de sus umbrales frente al programa de 2021.",
  },
  {
    slug: "posicion-comun-america-latina-cambio-climatico-salud",
    title: "Posición Común de América Latina y el Caribe sobre Cambio Climático y Salud",
    file: "2025-america-latina",
    tipo: "comunicado",
    year: 2025,
    author: "Organizaciones de salud y sociedad civil de América Latina y el Caribe, entre ellas el OCCAMM",
    citeAuthor: "Organizaciones de salud y sociedad civil de América Latina y el Caribe",
    pages: 32,
    summary:
      "Documento de posición regional, firmado por decenas de organizaciones de salud y sociedad civil, sobre los efectos del cambio climático en la salud y las acciones que piden a los gobiernos.",
  },
  {
    slug: "estudio-calidad-aire-salud",
    title: "Estudio sobre Calidad de Aire y Salud",
    file: "2025-aire-salud",
    tipo: "investigacion",
    year: 2025,
    author: OCCAMM,
    pages: 22,
    summary:
      "Revista del Observatorio sobre los efectos de la contaminación del aire en la salud, el panorama de la contaminación en la Zona Metropolitana de Monterrey, la perspectiva social del problema y sus cifras principales.",
  },
  {
    slug: "cruzada-gasolina-de-calidad-monterrey",
    title: "Cruzada por una Gasolina de Calidad para Monterrey",
    file: "2025-gasolina",
    tipo: "informe",
    year: 2025,
    author: OCCAMM,
    pages: 19,
    summary:
      "Análisis de la presión de vapor permitida en la gasolina de Monterrey: con el modelo Complex estima que produce 83.5% más compuestos orgánicos volátiles que la de la Ciudad de México, e incluye muestras tomadas en nueve estaciones de servicio.",
  },
  {
    slug: "acolchado-zona-metropolitana-monterrey",
    title: "Uso de Acolchado en la Zona Metropolitana de Monterrey",
    file: "2024-acolchado",
    tipo: "comunicado",
    year: 2024,
    date: "2024-08-08",
    author: "Organizaciones de la sociedad civil de la Zona Metropolitana de Monterrey",
    pages: 1,
    summary:
      "Solicitud a los municipios de la metrópoli para usar acolchado de madera triturada en parques y espacios públicos, por sus beneficios para el material particulado, el suelo, el agua y los costos de mantenimiento.",
  },
  {
    slug: "mecanismo-financiero-agua-drenaje-monterrey",
    title: "Mecanismo Financiero de Servicios de Agua y Drenaje de Monterrey",
    file: "2024-mecanismos",
    tipo: "comunicado",
    year: 2024,
    date: "2024-07-05",
    author: "Nueve organizaciones civiles de Nuevo León, entre ellas el OCCAMM",
    citeAuthor: "Consejo Cívico de Nuevo León et al.",
    pages: 4,
    summary:
      "Propuesta de un fideicomiso público-privado, con participación ciudadana, para proteger las cuencas hidrológicas y las zonas de recarga de acuíferos de Nuevo León.",
  },
  {
    slug: "nom-172-semarnat-2023-indice-calidad-aire",
    title: "Índice de Calidad del Aire NOM-172-SEMARNAT-2023",
    file: "2024-indice",
    tipo: "normativa",
    year: 2024,
    date: "2024-01-25",
    author: "Secretaría de Medio Ambiente y Recursos Naturales (SEMARNAT)",
    outlet: "Diario Oficial de la Federación",
    pages: 23,
    summary:
      "Texto oficial de la NOM-172-SEMARNAT-2023, publicado en el Diario Oficial de la Federación, con los lineamientos para obtener y comunicar el Índice de Calidad del Aire y Riesgos a la Salud.",
  },
  {
    slug: "mala-calidad-aire-futbol-mexicano",
    title: "Mala Calidad del Aire Amenaza al Fútbol Mexicano",
    file: "2023-futbol",
    tipo: "boletin",
    year: 2023,
    author: "Organizaciones ambientales de México, entre ellas el OCCAMM",
    citeAuthor: "Organizaciones ambientales de México",
    pages: 3,
    summary:
      "Investigación colaborativa sobre partidos de fútbol profesional jugados con contaminación por encima de las recomendaciones de la OMS; en Monterrey, 18 de 41 partidos superaron el valor para PM2.5.",
  },
  {
    slug: "actualizacion-nom-043-semarnat-1993",
    title: "Sobre la Necesaria Actualización de la NOM-043-SEMARNAT-1993",
    file: "2023-norma",
    tipo: "informe",
    year: 2023,
    date: "2023-10-23",
    author: "52 organizaciones de la sociedad civil, entre ellas el OCCAMM",
    citeAuthor: "52 organizaciones de la sociedad civil",
    pages: 3,
    summary:
      "A 30 años de su entrada en vigor, las organizaciones firmantes piden actualizar la norma que fija los límites de emisión de partículas de la industria, sin cambios desde 1993.",
  },
  {
    slug: "dia-internacional-aire-limpio-2022",
    title: "Día Mundial del Aire Limpio por un Cielo Azul",
    file: "2022-dia",
    tipo: "boletin",
    year: 2022,
    date: "2022-09-06",
    author: "Observatorio Ciudadano de Calidad del Aire (OCCA) y OCCAMM",
    pages: 3,
    summary:
      "Pronunciamiento por el Día Internacional del Aire Limpio por un Cielo Azul sobre el repunte de alertas y contingencias en 2022 y las medidas que se piden a las autoridades.",
  },
  {
    slug: "calidad-combustibles-calidad-aire-zmm",
    title: "Calidad de Combustibles y Calidad del Aire en la ZMM",
    file: "2021-combustibles",
    tipo: "informe",
    year: 2021,
    author: OCCAMM,
    pages: 20,
    summary:
      "Reporte que cuantifica el efecto de la calidad de las gasolinas en el aire de la Zona Metropolitana de Monterrey: con la misma gasolina que el Valle de México, sus emisiones de compuestos orgánicos volátiles bajarían entre 9.4% y 13.3%.",
  },
  {
    slug: "emisiones-sector-construccion-monterrey",
    title: "Emisiones del Sector de la Construcción en Monterrey",
    file: "2020-emisiones",
    tipo: "manual",
    year: 2020,
    author: "Alfonso Martínez Muñoz, Horacio Villalón Mendoza y Selene Martínez Guajardo",
    citeAuthor: "Martínez Muñoz, A., Villalón Mendoza, H. y Martínez Guajardo, S.",
    pages: 104,
    summary:
      "Manual de mejores prácticas para reducir las emisiones de polvo y contaminantes en obras de construcción y demolición, desde el plan de gestión ambiental hasta el diseño y los materiales.",
  },
  {
    slug: "externalidades-reforma-electrica",
    title: "Externalidades de la Reforma Eléctrica",
    file: "2020-reforma",
    tipo: "informe",
    year: 2020,
    author: OCCAMM,
    pages: 2,
    summary:
      "Carta al Congreso de la Unión sobre la reforma a la Ley de la Industria Eléctrica: privilegiar plantas de combustibles fósiles aumentaría las emisiones de PM2.5, dióxido de azufre y óxidos de nitrógeno, y con ellas las enfermedades y muertes prematuras.",
  },
  {
    slug: "calidad-aire-cuarentena-nuevo-leon",
    title: "Calidad del Aire Durante la Cuarentena en Nuevo León",
    file: "2020-cuarentena",
    tipo: "informe",
    year: 2020,
    author: "Cómo Vamos Nuevo León y OCCAMM",
    citeAuthor: "Martínez Muñoz, A., Armendáriz Olivo, A., Escalante Díaz del Campo, J. y Garza Rodríguez, L.",
    pages: 22,
    summary:
      "Análisis de PM2.5, PM10, ozono y monóxido de carbono durante el confinamiento por COVID-19: del 31 de marzo al 17 de junio de 2020, el material particulado bajó en promedio 6.41 µg/m³ (finas) y 7.49 µg/m³ (gruesas).",
  },
  {
    slug: "mortalidad-particulas-suspendidas-zmm",
    title:
      "Mortalidad aguda asociada con partículas suspendidas finas y gruesas en habitantes de la Zona Metropolitana de Monterrey",
    file: "2020-investigacion",
    tipo: "investigacion",
    year: 2020,
    author: "Alfonso Martínez-Muñoz, Magali Hurtado-Díaz, Julio César Cruz y Horacio Riojas-Rodríguez",
    citeAuthor: "Martínez-Muñoz, A., Hurtado-Díaz, M., Cruz, J. C. y Riojas-Rodríguez, H.",
    outlet: "Salud Pública de México",
    doi: "10.21149/11184",
    pages: 9,
    summary:
      "Artículo científico que estima el riesgo de mortalidad asociado con la exposición a partículas finas (PM2.5) y gruesas en la Zona Metropolitana de Monterrey, con series de tiempo de 2004 a 2014.",
  },
  {
    slug: "comision-calidad-aire-nuevo-leon",
    title: "Creación de la Comisión de la Calidad del Aire en Nuevo León",
    file: "2019-comision",
    tipo: "iniciativa",
    year: 2019,
    author: "Organizaciones de la sociedad civil de Nuevo León",
    pages: 56,
    summary:
      "Iniciativa ciudadana presentada al Congreso de Nuevo León para crear un organismo autónomo de calidad del aire en el estado.",
  },
];

// The infographics, opened from the list as PDFs like the documents. Each
// `file` names both public/infografias/<file>.pdf and its poster .webp
// (2400px wide, taken from the PDF; the list shows its top).
const INFOGRAFIAS: Documento[] = [
  {
    slug: "efectos-contaminacion-aire-salud",
    title: "Los efectos de la contaminación del aire en la salud humana",
    file: "infografia_salud",
    tipo: "infografia",
    year: 2026,
    author: OCCAMM,
    pages: 1,
    summary:
      "Cómo afecta la contaminación del aire a la salud a corto y largo plazo, qué son las partículas PM10 y PM2.5, y su concentración promedio anual en cada estación de monitoreo de Monterrey.",
  },
  {
    slug: "perspectiva-social-contaminacion-aire",
    title: "Perspectiva social sobre la contaminación del aire en la ZMM",
    file: "infografia_social",
    tipo: "infografia",
    year: 2025,
    author: OCCAMM,
    pages: 1,
    summary:
      "Los problemas que la contaminación del aire causa en la Zona Metropolitana de Monterrey, las soluciones que proponemos, el marco internacional y su costo en salud.",
  },
  {
    slug: "contaminacion-aire-mundial-en-numeros",
    title: "La contaminación del aire a nivel mundial en números",
    file: "infografia_numeros",
    tipo: "infografia",
    year: 2025,
    author: OCCAMM,
    pages: 1,
    summary:
      "Cifras mundiales de la contaminación del aire en 2021: muertes atribuibles por causa, población expuesta y el peso de las PM2.5 como factor de riesgo.",
  },
  {
    slug: "panorama-contaminacion-aire-zmm",
    title: "Panorama general de la contaminación del aire en la ZMM",
    file: "infografia_contaminacion",
    tipo: "infografia",
    year: 2025,
    author: OCCAMM,
    pages: 1,
    summary:
      "La contaminación del aire en la Zona Metropolitana de Monterrey: cómo funciona una estación de monitoreo, los límites de la norma, las pérdidas económicas y en salud, y el derecho a un aire limpio.",
  },
];

function fromEditorial(e: Editorial): Publicacion {
  const external = e.pdfLink && !e.pdfLink.startsWith("/");
  return {
    slug: e.slug,
    title: e.title,
    tipo: "columna",
    year: Number(e.date.slice(0, 4)),
    date: e.date,
    author: e.author,
    people: e.author.split(" y ").map((name) => name.trim()),
    citeAuthor: citeName(e.author),
    outlet: e.newspaper,
    summary: e.summary,
    file: external ? undefined : e.pdfLink,
    externalUrl: external ? e.pdfLink : undefined,
    image: e.image,
    editorial: e.content || transcripciones[e.slug] ? e : undefined,
    transcripcion: transcripciones[e.slug],
  };
}

// Column bylines as cited (surnames first, the way APA lists them).
const CITE_NAMES: Record<string, string> = {
  "Uriel Chavarría": "Chavarría, U.",
  "Selene M. Guajardo": "Martínez Guajardo, S.",
  "Lorenzo J. de Rosenzweig": "de Rosenzweig, L. J.",
  "Ana Cristina García Luna": "García Luna, A. C.",
  "Gabriel Todd": "Todd, G.",
  "Alberto E. Garza Santos": "Garza Santos, A. E.",
};

function citeName(byline: string): string {
  return byline
    .split(" y ")
    .map((name) => CITE_NAMES[name.trim()] ?? name.trim())
    .join(" y ");
}

// Newest first. Within a year, the dated items come before those that only
// carry the year.
export const publicaciones: Publicacion[] = [
  ...editoriales.map(fromEditorial),
  ...DOCUMENTOS.map(
    (d): Publicacion => ({
      ...d,
      people: [],
      file: `/recursos/${d.file}.pdf`,
      image: `/recursos/${d.file}.webp`,
    }),
  ),
  ...INFOGRAFIAS.map(
    (d): Publicacion => ({
      ...d,
      people: [],
      file: `/infografias/${d.file}.pdf`,
      image: `/infografias/${d.file}.webp`,
    }),
  ),
].sort((a, b) => b.year - a.year || (b.date ?? "").localeCompare(a.date ?? ""));

if (new Set(publicaciones.map((p) => p.slug)).size !== publicaciones.length) {
  throw new Error("Two publications share a slug");
}

// The one item the library features above everything else (unfiltered): the
// health infographic, the Observatory's most useful piece for a reader asking
// what the air does to them. Change or empty it here.
export const DESTACADA: string | undefined = "efectos-contaminacion-aire-salud";

// The Autoría filter's people, most published first (a fixed order, so the
// list doesn't reshuffle as the other filters change its counts).
export const PERSONAS = (() => {
  const counts = new Map<string, number>();
  for (const p of publicaciones) for (const name of p.people) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es")).map(([name]) => name);
})();

// Portraits (public/equipo), by the names in `people`: each columnist's from
// their own columns. Shown only when every person on an item has one (see
// `photos`), so a co-signed column never shows one face as if that person
// led it.
const PHOTOS = new Map<string, string>([
  ...editoriales.filter((e) => !e.author.includes(" y ")).map((e): [string, string] => [e.author, e.authorProfile]),
]);

export function photos(p: Publicacion): { name: string; src: string }[] {
  if (p.people.length === 0 || !p.people.every((name) => PHOTOS.has(name))) return [];
  return p.people.map((name) => ({ name, src: PHOTOS.get(name)! }));
}

// Lowercase, accents dropped, so a search for "futbol" finds "fútbol".
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

// A person's ?autor= / an outlet's ?medio= value on /publicaciones:
// "Selene M. Guajardo" → "selene-m-guajardo", "El Norte" → "el-norte".
export function urlKey(name: string): string {
  return normalize(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// The end of a publication's page: up to three more by the same person (a
// single author with other work), else the newest of the same type.
export function relacionadas(p: Publicacion): { title: string; items: Publicacion[]; more?: { href: string; label: string } } {
  const others = publicaciones.filter((o) => o.slug !== p.slug);
  if (p.people.length === 1) {
    const [name] = p.people;
    const theirs = others.filter((o) => o.people.includes(name));
    if (theirs.length > 0) {
      return {
        title: `Más de ${name}`,
        items: theirs.slice(0, 3),
        more:
          theirs.length > 3
            ? { href: `/publicaciones?autor=${urlKey(name)}`, label: `Ver sus ${theirs.length + 1} publicaciones` }
            : undefined,
      };
    }
  }
  return {
    title: "Más publicaciones",
    items: others.filter((o) => o.tipo === p.tipo).slice(0, 3),
    more: { href: "/publicaciones", label: "Ver todas las publicaciones" },
  };
}

export function getPublicacion(slug: string): Publicacion | undefined {
  return publicaciones.find((p) => p.slug === slug);
}

export function tipoLabel(tipo: Tipo): string {
  return TIPOS.find((t) => t.value === tipo)!.label;
}

// "2026-08-30" → "30 ago 2026".
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTHS_LONG = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function formatDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

// The date as the page shows it: a column's full date, a document's year.
export function displayDate(p: Publicacion): string {
  return p.tipo === "columna" && p.date ? formatDate(p.date) : String(p.year);
}

export function pageUrl(p: Publicacion): string {
  return `${SITE_URL}/publicaciones/${p.slug}`;
}

// APA style, in Spanish: a column carries its full date ("2025, 16 de
// febrero"), a document its year. A paper links its DOI, everything else
// this site's page for it.
export function citation(p: Publicacion): string {
  const author = p.citeAuthor ?? p.author;
  let when = String(p.year);
  if (p.tipo === "columna" && p.date) {
    const [, m, d] = p.date.split("-").map(Number);
    when = `${p.year}, ${d} de ${MONTHS_LONG[m - 1]}`;
  }
  const outlet = p.outlet ? ` ${p.outlet}.` : "";
  const link = p.doi ? `https://doi.org/${p.doi}` : pageUrl(p);
  return `${author} (${when}). ${p.title}.${outlet} ${link}`;
}
