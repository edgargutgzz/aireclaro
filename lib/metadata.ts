import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

export const SITE_NAME = "Observatorio del Aire";

export const SITE_DESCRIPTION = "Trabajamos por una mejor calidad del aire.";

type OgImages = NonNullable<NonNullable<Metadata["openGraph"]>["images"]>;

export const OG_IMAGES: OgImages = [
  { url: "/observatorio-og.png", width: 1200, height: 630, alt: SITE_NAME },
];

export const OG_BASE = { type: "website", locale: "es_MX" } as const;

// Next inherits a layout's openGraph untouched when a page sets none, and
// replaces it wholesale when the page sets one. So every page builds its card
// here, or a shared link unfurls with the homepage's title and description.
// X falls back to these og tags (the layout only sets twitter's card type).
// The card's title matches the browser tab: section first, then the site name.
// The canonical folds query-string variants (?sensor=, ?v=, chart state) into
// the one page. It lives here, not in the layout, because a layout canonical
// is inherited by every page that doesn't override it.
export function pageMetadata({
  title,
  description,
  path,
  images = OG_IMAGES,
}: {
  title: string;
  description: string;
  path: string;
  images?: OgImages;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      ...OG_BASE,
      title: `${title} | ${SITE_NAME}`,
      description,
      url: path,
      images,
    },
  };
}

// The organization as an author/publisher/creator inside other structured
// data (articles, the dataset). The full Organization entry is in the layout.
// The Observatory as structured data: its official name, NGO type and
// short names, the same everywhere so Google reads one entity (the full
// record, with logo, address and profiles, is in app/layout.tsx).
export const ORGANIZATION_REF = {
  "@type": "NGO",
  name: "Observatorio Ciudadano de la Calidad del Aire del Área Metropolitana de Monterrey",
  alternateName: ["OCCAMM", SITE_NAME],
  url: SITE_URL,
};

// The license /datos publishes under, chosen 2026-10-02. It covers the
// compilation only (column selection, station names, the Diccionario): the
// measurements are INECC's, and SINAICA publishes no terms of its own, so the
// citation credits SINAICA first as the source. One source for the download
// card's text and the Dataset structured data.
export const DATA_LICENSE = {
  name: "CC BY 4.0",
  url: "https://creativecommons.org/licenses/by/4.0/", // canonical, for structured data
  deedUrl: "https://creativecommons.org/licenses/by/4.0/deed.es", // the Spanish summary, for people
};

export const DATA_CITATION =
  "SINAICA (INECC), mediciones horarias de PM2.5 y PM10. Compilación del Observatorio Ciudadano de la Calidad del Aire, observatoriodelaire.com/datos.";
