import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, FileText } from "lucide-react";
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

// The style guide's eyebrow label (uppercase, tracked), in gray-500 rather
// than its gray-400 because a name carries information: set apart from the
// title by case, size and color, the way opinion sections set the columnist.
function Who({ p }: { p: Publicacion }) {
  return (
    <p className="text-xs font-semibold uppercase leading-snug tracking-wide text-gray-500">
      {p.tipo === "columna" ? p.author : tipoLabel(p.tipo)}
    </p>
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
      {p.externalUrl && <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 align-[-2px] text-gray-600" aria-hidden />}
      {opensPdf(p) && (
        <span className="ml-1.5 inline-flex items-center gap-1 align-[-2px] font-medium text-gray-600">
          <FileText className="h-3.5 w-3.5" aria-hidden /> PDF
        </span>
      )}
    </p>
  );
}

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15";

// A document (anything but a column) is its PDF, so the list opens that
// directly. Its page stays online, unlinked from here, for search engines,
// Google Scholar and "Cómo citar".
function opensPdf(p: Publicacion): boolean {
  return p.tipo !== "columna" && Boolean(p.file);
}

// An item opens its page here; a document, its PDF in a new tab (marked PDF
// in its line); a column that lives only on another site, that site in a new
// tab (marked ↗). Both announced to screen readers.
function ItemLink({ p, className, children }: { p: Publicacion; className: string; children: React.ReactNode }) {
  if (opensPdf(p)) {
    return (
      <a href={p.file} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
        <span className="sr-only"> (PDF, abre en una nueva pestaña)</span>
      </a>
    );
  }
  if (p.externalUrl) {
    return (
      <a href={p.externalUrl} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
        <span className="sr-only"> (abre {p.outlet} en una nueva pestaña)</span>
      </a>
    );
  }
  return (
    <Link href={`/publicaciones/${p.slug}`} className={className}>
      {children}
    </Link>
  );
}

export function PublicacionCard({ publicacion: p, priority = false }: { publicacion: Publicacion; priority?: boolean }) {
  return (
    <ItemLink
      p={p}
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
        <p className="mt-1.5 text-lg font-semibold leading-snug text-gray-900 group-hover:text-gray-600">{p.title}</p>
        <WhereWhen p={p} className="mt-auto pt-4" />
      </div>
    </ItemLink>
  );
}

// Every row opens the item (see ItemLink), its cover as a thumbnail.
export function PublicacionRow({ publicacion: p }: { publicacion: Publicacion }) {
  return (
    <ItemLink
      p={p}
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
        <p className="mt-1 text-base font-semibold leading-snug text-gray-900">{p.title}</p>
        <WhereWhen p={p} className="mt-2" />
      </div>
    </ItemLink>
  );
}
