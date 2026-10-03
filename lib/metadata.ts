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
export const ORGANIZATION_REF = {
  "@type": "Organization",
  name: "Observatorio Ciudadano de la Calidad del Aire (OCCAMM)",
  alternateName: SITE_NAME,
  url: SITE_URL,
};
