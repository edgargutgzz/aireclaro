import type { Metadata } from "next";
import { statSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import { pageMetadata } from "@/lib/metadata";
import EnlaceMedido from "@/components/publicaciones/enlace-medido";

// Laid out like /publicaciones: no visible header, the page opens on its
// content in the same container (the navbar already names the section), and
// each infographic is a card like the library's (cover, title, a quiet facts
// line). The cover is the poster's top, where its title is; the card opens
// the full PDF in a new tab, counted as a pdf_abierto event like the
// library's documents. Newest first.

export const metadata: Metadata = pageMetadata({
  title: "Infografías",
  description: "Conoce las infografías que hemos creado para informarnos sobre la calidad del aire en Nuevo León.",
  path: "/infografias",
});

const INFOGRAFIAS = [
  { slug: "infografia_salud", title: "Los efectos de la contaminación del aire en la salud humana", year: 2026, height: 2400 },
  { slug: "infografia_social", title: "Perspectiva social sobre la contaminación del aire en la ZMM", year: 2025, height: 2400 },
  { slug: "infografia_numeros", title: "La contaminación del aire a nivel mundial en números", year: 2025, height: 2461 },
  { slug: "infografia_contaminacion", title: "Panorama general de la contaminación del aire en la ZMM", year: 2025, height: 2400 },
];

// "2026 · PDF · 35.3 MB", the size read from public/ at build time (some of
// these PDFs are large, worth knowing before opening one on a phone).
function facts(slug: string, year: number): string {
  const bytes = statSync(path.join(process.cwd(), "public", "infografias", `${slug}.pdf`)).size;
  const size = bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.round(bytes / 1e3)} KB`;
  return `${year} · PDF · ${size}`;
}

export default function Infografias() {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-32 pt-4 lg:px-8 lg:pt-12">
      <h1 className="sr-only">Infografías del Observatorio sobre la calidad del aire</h1>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {INFOGRAFIAS.map(({ slug, title, year, height }, i) => (
          <li key={slug}>
            <EnlaceMedido
              href={`/infografias/${slug}.pdf`}
              evento="pdf_abierto"
              publicacion={slug}
              aviso="PDF, abre en una nueva pestaña"
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
            >
              <Image
                src={`/infografias/${slug}.webp`}
                alt=""
                width={1600}
                height={height}
                sizes="(min-width: 1280px) 300px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                preload={i === 0}
                className="aspect-[4/5] w-full object-cover object-top"
              />
              <div className="flex flex-1 flex-col border-t border-gray-100 p-4">
                <p className="text-lg font-semibold leading-snug text-gray-900 group-hover:text-gray-600">{title}</p>
                <p className="mt-auto pt-4 text-xs text-gray-500">{facts(slug, year)}</p>
              </div>
            </EnlaceMedido>
          </li>
        ))}
      </ul>
    </div>
  );
}
