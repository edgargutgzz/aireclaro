import Image from "next/image";
import Link from "next/link";
import { FileText } from "lucide-react";
import Avatares from "@/components/publicaciones/avatares";
import { formatDate, photos, tipoLabel, type Publicacion } from "@/app/publicaciones/data";

// The two ways a publication is listed: a card with its cover (the library's
// "Lo más reciente", a page's "Más de…") and a row with a thumbnail (the
// library's list). Shared so both pages show an item the same way.

// "El Norte · Columna de opinión · 30 ago 2026 · PDF": where it ran (first,
// so the newspaper reads before anything else), what it is, what's behind it.
function Meta({ p }: { p: Publicacion }) {
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-gray-500">
      {p.outlet && <span className="font-semibold text-gray-700">{p.outlet} ·</span>}
      <span>{tipoLabel(p.tipo)}</span>
      {p.tipo === "columna" && p.date && <span>· {formatDate(p.date)}</span>}
      {p.file && (
        <span className="inline-flex items-center gap-1">
          · <FileText className="h-3 w-3" aria-hidden /> PDF
        </span>
      )}
    </p>
  );
}

// "Uriel Chavarría", led by the authors' portraits when they have them (the
// outlet is in the line above the title).
function Byline({ p, className }: { p: Publicacion; className: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Avatares fotos={photos(p)} size="sm" />
      <p className="min-w-0 text-sm text-gray-600">{p.author}</p>
    </div>
  );
}

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15";

export function PublicacionCard({ publicacion: p, priority = false }: { publicacion: Publicacion; priority?: boolean }) {
  return (
    <Link
      href={`/publicaciones/${p.slug}`}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-md ${FOCUS_RING}`}
    >
      <Image
        src={p.image}
        alt=""
        width={640}
        height={360}
        sizes="(min-width: 1024px) 300px, (min-width: 640px) 33vw, 100vw"
        preload={priority}
        className="aspect-video w-full object-cover"
      />
      <div className="flex flex-1 flex-col p-4">
        <Meta p={p} />
        <p className="mt-1.5 text-base font-semibold leading-snug text-gray-800 group-hover:text-gray-600">{p.title}</p>
        <Byline p={p} className="mt-auto pt-3" />
      </div>
    </Link>
  );
}

// Every row opens the item's page, its cover as a thumbnail.
export function PublicacionRow({ publicacion: p }: { publicacion: Publicacion }) {
  return (
    <Link
      href={`/publicaciones/${p.slug}`}
      className={`flex items-start gap-4 px-4 py-4 transition-colors hover:bg-gray-100/70 sm:px-5 ${FOCUS_RING} focus-visible:ring-inset`}
    >
      <Image
        src={p.image}
        alt=""
        width={288}
        height={162}
        sizes="(min-width: 640px) 144px, 96px"
        className="aspect-video w-24 shrink-0 rounded-lg object-cover sm:w-36"
      />
      <div className="min-w-0">
        <Meta p={p} />
        <p className="mt-1.5 text-base font-semibold leading-snug text-gray-800">{p.title}</p>
        <Byline p={p} className="mt-1.5" />
      </div>
    </Link>
  );
}
