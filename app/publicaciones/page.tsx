import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import Biblioteca from "@/components/publicaciones/biblioteca";

// Every publication in one library (./data.ts). Replaces /editoriales and
// /recursos, which redirect here (next.config.mjs). Not the PageShell hero:
// people come here to find something, so the search sits right under a short
// header, the way /datos starts with its content (same container and top
// padding as /datos and the navbar, so the edges line up).

const LEAD = "Columnas, informes y documentos del Observatorio sobre la calidad del aire en la ciudad.";

export const metadata: Metadata = pageMetadata({
  title: "Publicaciones",
  description: LEAD,
  path: "/publicaciones",
});

export default function Publicaciones() {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-32 pt-10 lg:px-8 lg:pt-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 md:text-4xl">Publicaciones</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-gray-600 md:text-lg">{LEAD}</p>
      </header>
      <Biblioteca />
    </div>
  );
}
