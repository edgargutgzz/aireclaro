import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import EnlaceMedido from "@/components/publicaciones/enlace-medido";
import { DESTACADA, formatDate, tipoLabel, type Publicacion } from "@/app/publicaciones/data";

// The ways a publication is listed: a card with its cover (the library's
// "Lo más reciente", a page's "Más de…"), a row with a thumbnail (the
// library's list) and, for the one featured item, a wide card with its
// summary. Shared so both pages show an item the same way.

// Every item reads in three steps, the way opinion sections list columns:
// who (the author, dark), what (the title, the largest), and where and when
// (quiet, last). A column: "Uriel Chavarría" / title / "El Norte · 16 feb
// 2025". A document: its type ("Informe") on top and its title, nothing
// more (its credits, often long organization names, are on its page).
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
  // A document shows only its type and title in a list (its credits are on
  // its page); the year heading above already dates it.
  if (p.tipo !== "columna") return null;
  const where = p.outlet;
  const when = p.date ? formatDate(p.date) : String(p.year);
  return (
    <p className={`text-xs text-gray-500 ${className}`}>
      {where && <span className="font-medium text-gray-600">{where}</span>}
      {where && " · "}
      {when}
      {p.externalUrl && <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 align-[-2px] text-gray-600" aria-hidden />}
    </p>
  );
}

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15";

// A document or an infographic (anything but a column) is its PDF, so the
// list opens that directly. The featured item (DESTACADA) is the exception:
// it opens its page, where the poster is shown whole. Its page stays online, unlinked from here, for search engines,
// Google Scholar and "Cómo citar".
function opensPdf(p: Publicacion): boolean {
  return p.tipo !== "columna" && p.slug !== DESTACADA && Boolean(p.file);
}

// An item opens its page here; a document, its PDF in a new tab; a column
// that lives only on another site, that site in a new tab (marked ↗). Both
// new tabs are announced to screen readers.
function ItemLink({ p, className, children }: { p: Publicacion; className: string; children: React.ReactNode }) {
  if (opensPdf(p)) {
    return (
      <EnlaceMedido href={p.file!} evento="pdf_abierto" publicacion={p.slug} aviso="PDF, abre en una nueva pestaña" className={className}>
        {children}
      </EnlaceMedido>
    );
  }
  if (p.externalUrl) {
    return (
      <EnlaceMedido
        href={p.externalUrl}
        evento="enlace_externo"
        publicacion={p.slug}
        aviso={`abre ${p.outlet} en una nueva pestaña`}
        className={className}
      >
        {children}
      </EnlaceMedido>
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
        className={`aspect-video w-full object-cover ${p.poster ? "object-top" : ""}`}
      />
      <div className="flex flex-1 flex-col p-4">
        <Who p={p} />
        <p className="mt-1.5 text-lg font-semibold leading-snug text-gray-900 group-hover:text-gray-600">{p.title}</p>
        <WhereWhen p={p} className="mt-auto pt-4" />
      </div>
    </ItemLink>
  );
}

// Every row opens the item (see ItemLink), its cover as a thumbnail. A
// poster (an infographic) shows its top, where its title is.
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
        className={`aspect-video w-24 shrink-0 rounded-lg object-cover sm:w-36 ${p.poster ? "object-top" : ""}`}
      />
      <div className="min-w-0">
        <Who p={p} />
        <p className="mt-1 text-base font-semibold leading-snug text-gray-900">{p.title}</p>
        <WhereWhen p={p} className="mt-2" />
      </div>
    </ItemLink>
  );
}

// The library's featured item: wider than the cards, its summary showing.
export function PublicacionDestacada({ publicacion: p }: { publicacion: Publicacion }) {
  return (
    <ItemLink
      p={p}
      className={`group grid overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-md sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] ${FOCUS_RING}`}
    >
      <Image
        src={p.image}
        alt=""
        width={640}
        height={360}
        sizes="(min-width: 1024px) 380px, (min-width: 640px) 40vw, 100vw"
        preload
        className={`aspect-video h-full w-full object-cover ${p.poster ? "object-top" : ""}`}
      />
      <div className="flex flex-col justify-center p-5 sm:p-6">
        <Who p={p} />
        <p className="mt-1.5 text-xl font-semibold leading-snug text-gray-900 group-hover:text-gray-600 sm:text-2xl">{p.title}</p>
        {p.summary && <p className="mt-3 text-sm leading-relaxed text-gray-600">{p.summary}</p>}
      </div>
    </ItemLink>
  );
}
