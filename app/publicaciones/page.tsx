import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import Biblioteca from "@/components/publicaciones/biblioteca";

// Every publication in one library (./data.ts). Replaces /editoriales and
// /recursos, which redirect here (next.config.mjs). No visible header: like
// /datos, the page opens on its content (same container and top padding, so
// the edges line up with the navbar, which already marks the section). The
// h1 stays for search engines and screen readers; the description is for
// Google and link previews.

const DESCRIPTION = "Columnas, estudios y posicionamientos del Observatorio sobre la calidad del aire.";

export const metadata: Metadata = pageMetadata({
  title: "Publicaciones",
  description: DESCRIPTION,
  path: "/publicaciones",
});

export default function Publicaciones() {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-32 pt-10 lg:px-8 lg:pt-12">
      <h1 className="sr-only">Publicaciones del Observatorio sobre la calidad del aire</h1>
      <Biblioteca />
    </div>
  );
}
