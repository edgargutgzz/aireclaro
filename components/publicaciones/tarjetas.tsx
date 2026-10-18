import Image from "next/image";
import Link from "next/link";
import { formatDate, tipoLabel, type Publicacion } from "@/app/publicaciones/data";

// The ways a publication is listed: a card with its cover (the library's
// "Lo más reciente", a page's "Más de…"), a row with a thumbnail (the
// library's list) and, for the one featured item, a wide card with its
// summary. Shared so both pages show an item the same way.

// A card or a featured item reads in three steps: who (the author, dark;
// a document's type), what (the title, the largest), and where and when
// (quiet, last). The library's rows follow their own order (see
// PublicacionRow). Portraits are for the publication's own page only.

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
    </p>
  );
}

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15";

// Every item opens its page here (it carries the full text, or the summary
// and a button to the PDF or the outlet's site and "Compartir").
function ItemLink({ p, className, children }: { p: Publicacion; className: string; children: React.ReactNode }) {
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
        className={`aspect-video w-full object-cover ${p.tipo === "infografia" ? "object-top" : ""}`}
      />
      <div className="flex flex-1 flex-col p-4">
        <Who p={p} />
        <p className="mt-1.5 text-lg font-semibold leading-snug text-gray-800 group-hover:text-gray-600">{p.title}</p>
        <WhereWhen p={p} className="mt-auto pt-4" />
      </div>
    </ItemLink>
  );
}

// The context line every library row and featured card opens with: type
// (dark) · outlet · date (a column's full date, a document's year).
function Contexto({ p }: { p: Publicacion }) {
  const when = p.tipo === "columna" && p.date ? formatDate(p.date) : String(p.year);
  return (
    <p className="text-xs text-gray-500">
      <span className="font-semibold text-gray-700">{tipoLabel(p.tipo)}</span>
      {p.outlet && ` · ${p.outlet}`} · {when}
    </p>
  );
}

// A library row, text first and the photo to its right, the way opinion
// sections list their pieces: one context line, the same on every row
// (type · outlet · date), the title, and for a column its author. Summaries
// and a document's credits are on the item's page. The whole row is the link; sharing is on the
// item's page. A poster (an infographic) shows its top, where its title is.
export function PublicacionRow({ publicacion: p }: { publicacion: Publicacion }) {
  return (
    <ItemLink
      p={p}
      className={`flex items-start gap-4 px-4 py-4 transition-colors hover:bg-gray-100/70 sm:gap-5 sm:px-5 ${FOCUS_RING} focus-visible:ring-inset`}
    >
      <div className="min-w-0 flex-1">
        <Contexto p={p} />
        <p className="mt-1 text-base font-semibold leading-snug text-gray-800 text-pretty sm:text-[17px]">{p.title}</p>
        {p.tipo === "columna" && <p className="mt-2 truncate text-sm font-medium text-gray-700">{p.author}</p>}
      </div>
      <Image
        src={p.image}
        alt=""
        width={336}
        height={189}
        sizes="(min-width: 640px) 168px, 96px"
        className={`aspect-video w-24 shrink-0 rounded-lg object-cover sm:w-[168px] ${p.tipo === "infografia" ? "object-top" : ""}`}
      />
    </ItemLink>
  );
}

// A library's featured item: wider than the rows, photo first, its full
// summary showing. It reads like a row (the same context line, title, and
// a column's author last) so the library has one pattern. The title is the
// link, stretched over the whole card (an ::after layer). Sharing is on the
// item's page.
export function PublicacionDestacada({ publicacion: p, priority = false }: { publicacion: Publicacion; priority?: boolean }) {
  return (
    <div className="group relative grid overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-md has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-gray-900/15 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Image
        src={p.image}
        alt=""
        width={640}
        height={360}
        sizes="(min-width: 1024px) 380px, (min-width: 640px) 40vw, 100vw"
        preload={priority}
        className={`aspect-video h-full w-full object-cover ${p.tipo === "infografia" ? "object-top" : ""}`}
      />
      <div className="flex flex-col justify-center p-5 sm:p-6">
        <Contexto p={p} />
        <p className="mt-1.5 text-xl font-semibold leading-snug text-gray-800 group-hover:text-gray-600 sm:text-2xl">
          <ItemLink p={p} className="focus-visible:outline-none after:absolute after:inset-0 after:content-['']">
            {p.title}
          </ItemLink>
        </p>
        {p.summary && <p className="mt-3 text-sm leading-relaxed text-gray-600">{p.summary}</p>}
        {p.tipo === "columna" && <p className="mt-3 text-sm font-medium text-gray-700">{p.author}</p>}
      </div>
    </div>
  );
}
