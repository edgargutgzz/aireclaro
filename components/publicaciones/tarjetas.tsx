import Image from "next/image";
import Link from "next/link";
import { formatDate, tipoLabel, type Publicacion } from "@/app/publicaciones/data";

// The two ways a publication is listed: a card with its cover (the library's
// "Lo más reciente", a page's "Más de…") and a row with a thumbnail (the
// library's list). Shared so both pages show an item the same way.

// Every item reads in three steps, the way opinion sections list columns:
// who (the author, dark), what (the title, the largest), and where and when
// (quiet, last). A column: "Uriel Chavarría" / title / "El Norte · 16 feb
// 2025". A document, whose authors are often long organization names: its
// type ("Informe") on top, and who signed it with the year at the bottom.
// Portraits are for the publication's own page only.

function Who({ p }: { p: Publicacion }) {
  return (
    <p className="text-sm font-medium text-gray-800">{p.tipo === "columna" ? p.author : tipoLabel(p.tipo)}</p>
  );
}

function WhereWhen({ p, className }: { p: Publicacion; className: string }) {
  const where = p.tipo === "columna" ? p.outlet : [p.outlet, p.author].filter(Boolean).join(", ");
  const when = p.tipo === "columna" && p.date ? formatDate(p.date) : String(p.year);
  return (
    <p className={`text-xs text-gray-500 ${className}`}>
      {where && <span className="font-medium text-gray-600">{where}</span>}
      {where && " · "}
      {when}
    </p>
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
        <Who p={p} />
        <p className="mt-1 text-lg font-semibold leading-snug text-gray-800 group-hover:text-gray-600">{p.title}</p>
        <WhereWhen p={p} className="mt-auto pt-4" />
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
        <Who p={p} />
        <p className="mt-0.5 text-base font-semibold leading-snug text-gray-800">{p.title}</p>
        <WhereWhen p={p} className="mt-2" />
      </div>
    </Link>
  );
}
