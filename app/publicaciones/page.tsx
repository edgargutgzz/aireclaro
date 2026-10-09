import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import Biblioteca from "@/components/publicaciones/biblioteca";

// Every publication in one library (./data.ts). Replaces /editoriales and
// /recursos, which redirect here (next.config.mjs). No visible header: like
// /datos, the page opens on its content (same container, so the edges line
// up with the navbar, which already marks the section). On mobile the search
// sits close under the navbar (pt-4). The h1 stays for search engines and
// screen readers; the description is for Google and link previews.

const DESCRIPTION = "Columnas, estudios y posicionamientos del Observatorio sobre la calidad del aire.";

// The link card is app/api/og/publicaciones (d= is its design version: bump
// it on any change, chat apps cache per image URL); the RSS feed is ./rss.xml.
const base = pageMetadata({
  title: "Publicaciones",
  description: DESCRIPTION,
  path: "/publicaciones",
  images: [{ url: "/api/og/publicaciones?d=2", width: 1200, height: 630, alt: "Publicaciones del Observatorio del Aire" }],
});

export const metadata: Metadata = {
  ...base,
  alternates: {
    ...base.alternates,
    types: { "application/rss+xml": [{ url: "/publicaciones/rss.xml", title: "Publicaciones del Observatorio del Aire" }] },
  },
};

export default function Publicaciones() {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-32 pt-4 lg:px-8 lg:pt-12">
      <h1 className="sr-only">Publicaciones del Observatorio sobre la calidad del aire</h1>
      <Biblioteca />
    </div>
  );
}
