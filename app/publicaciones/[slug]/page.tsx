import type { Metadata } from "next";
import { ORGANIZATION_REF, pageMetadata } from "@/lib/metadata";
import { SITE_URL } from "@/lib/site";
import JsonLd from "@/components/json-ld";
import Avatares from "@/components/publicaciones/avatares";
import Compartir from "@/components/publicaciones/compartir";
import EnlaceMedido from "@/components/publicaciones/enlace-medido";
import { PublicacionCard } from "@/components/publicaciones/tarjetas";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { ArrowLeft, ArrowUpRight, FileText } from "lucide-react";
import {
  OCCAMM,
  displayDate,
  getPublicacion,
  linkCard,
  pageUrl,
  photos,
  readingMinutes,
  relacionadas,
  shareUrl,
  urlKey,
  publicaciones,
  tipoLabel,
  type Publicacion,
} from "../data";

// One page per publication, all static, and the library opens each one: a
// column shows its full text (one that lives on its outlet's site, the Este
// País column, its summary and a button there); a document, its summary and
// a button to its PDF. Every page can be shared from its header. It opens
// with a way back to the library (many readers arrive from search or a shared link) and ends
// with more by the same author. The newspaper and the authors link to their
// library filters.
// /editoriales/[slug] redirects here
// (next.config.mjs); any slug not in ../data is a static 404.

export const dynamicParams = false;

export function generateStaticParams() {
  return publicaciones.map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

function byline(p: Publicacion): string {
  return [p.author, p.outlet].filter(Boolean).join(", ");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = getPublicacion((await params).slug);
  if (!p) return {};
  // A column's title names its author, so a shared link says who wrote it.
  // The image is its branded link card (app/api/og/publicaciones/[slug]).
  const metadata = pageMetadata({
    title: p.tipo === "columna" ? `${p.title}, por ${p.author}` : p.title,
    description: p.summary ?? `${byline(p)}, ${displayDate(p)}.`,
    path: `/publicaciones/${p.slug}`,
    images: [linkCard(p)],
  });
  // Google Scholar's tags, for the documents (the columns are news).
  if (p.tipo !== "columna" && p.file) {
    metadata.other = {
      citation_title: p.title,
      citation_author: p.author,
      citation_publication_date: p.date?.replaceAll("-", "/") ?? String(p.year),
      citation_pdf_url: `${SITE_URL}${p.file}`,
      ...(p.outlet && { citation_journal_title: p.outlet }),
      ...(p.doi && { citation_doi: p.doi }),
    };
  }
  return metadata;
}

function structuredData(p: Publicacion) {
  const common = {
    "@context": "https://schema.org",
    headline: p.title,
    name: p.title,
    description: p.summary,
    image: `${SITE_URL}${p.image}`,
    datePublished: p.date ?? String(p.year),
    url: pageUrl(p),
    inLanguage: "es-MX",
  };
  if (p.tipo === "columna") {
    return { ...common, "@type": "Article", author: { "@type": "Person", name: p.author }, publisher: ORGANIZATION_REF };
  }
  return {
    ...common,
    "@type": p.doi ? "ScholarlyArticle" : "Report",
    ...(p.author === OCCAMM && { author: ORGANIZATION_REF }),
    ...(p.doi && { sameAs: `https://doi.org/${p.doi}` }),
    encoding: { "@type": "MediaObject", contentUrl: `${SITE_URL}${p.file}`, encodingFormat: "application/pdf" },
  };
}

// A transcribed clipping, in the same shape as the written columns: the
// epigraph and the author's note in italics, the text between.
function TranscripcionText({ t }: { t: NonNullable<Publicacion["transcripcion"]> }) {
  return (
    <>
      {t.epigraph && (
        <p>
          <em>
            {t.epigraph.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {line}
              </Fragment>
            ))}
          </em>
        </p>
      )}
      {t.paragraphs.map((text, i) => (
        <p key={i}>{text}</p>
      ))}
      {t.note && (
        <p>
          <em>{t.note}</em>
        </p>
      )}
    </>
  );
}

const TEXT_LINK =
  "rounded underline decoration-gray-300 underline-offset-2 hover:decoration-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15";

const PROSE =
  "prose prose-lg prose-headings:font-semibold prose-headings:text-gray-800 prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-6 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600 prose-strong:font-semibold prose-strong:text-gray-800 prose-li:text-gray-700 prose-li:mb-2 prose-img:rounded-xl prose-img:shadow-md max-w-none";

const PRIMARY_BUTTON =
  "inline-flex h-10 items-center gap-1.5 rounded-xl bg-gray-800 px-4 text-sm font-medium text-white transition-colors hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15";

export default async function PublicacionPage({ params }: Props) {
  const p = getPublicacion((await params).slug);
  if (!p) notFound();

  // Without full text on the page, the PDF (or the outlet's page) is the read.
  const outbound = p.editorial ? undefined : (p.file ?? p.externalUrl);
  const related = relacionadas(p);
  const fotos = photos(p);
  const column = p.tipo === "columna";
  const minutes = readingMinutes(p);

  return (
    <div className="px-6 pb-24 pt-10 lg:px-8 lg:pb-32 lg:pt-12">
      <JsonLd data={structuredData(p)} />
      <article className="mx-auto max-w-3xl">
        <Link
          href="/publicaciones"
          className="mb-8 inline-flex items-center gap-1.5 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Publicaciones
        </Link>
        {/* Columns and documents share one page: type, title, (a column's
            byline), where and when, the actions, the image, then the text.
            A column's text is the column itself; a document has none (its
            summary stays in the metadata, for Google and link previews), and
            "Abrir documento" sits beside "Compartir". */}
        <header className="mb-10">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">{tipoLabel(p.tipo)}</p>
          <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">{p.title}</h1>

          {/* Only a column has a byline. */}
          {column && (fotos.length > 0 ? (
            // The name, and under it a single author's role (from /equipo):
            // why this voice is worth reading. Two authors: names only.
            <div className="mt-6 flex items-center gap-3">
              <Avatares fotos={fotos} />
              <div className="min-w-0">
                <p className="font-medium text-gray-800">
                  {p.people.map((name, i) => (
                    <span key={name}>
                      {i > 0 && " y "}
                      <Link href={`/publicaciones?autor=${urlKey(name)}`} className={TEXT_LINK}>
                        {name}
                      </Link>
                    </span>
                  ))}
                </p>
                {fotos.length === 1 && fotos[0].puesto && (
                  <p className="mt-0.5 text-sm leading-snug text-gray-500">{fotos[0].puesto}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-6 text-gray-600">{p.author}</p>
          ))}

          <p className="mt-4 text-sm text-gray-500">
            {p.outlet && (
              <>
                {column ? "Publicada en " : ""}
                <Link href={`/publicaciones?medio=${urlKey(p.outlet)}`} className={`font-medium text-gray-700 ${TEXT_LINK}`}>
                  {p.outlet}
                </Link>{" "}
                ·{" "}
              </>
            )}
            {displayDate(p)}
            {minutes && ` · ${minutes} min de lectura`}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
            {outbound && (
              <EnlaceMedido
                href={outbound}
                evento={p.externalUrl ? "enlace_externo" : "pdf_abierto"}
                publicacion={p.slug}
                aviso="abre en una nueva pestaña"
                className={PRIMARY_BUTTON}
              >
                {p.externalUrl ? (
                  <>
                    Leer en {p.outlet} <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" aria-hidden /> Abrir documento
                  </>
                )}
              </EnlaceMedido>
            )}
            <Compartir url={shareUrl(p)} title={p.title} className="h-10 px-4 text-sm" />
          </div>
        </header>

        {outbound ? (
          // The cover (a document's first page), as a preview that also
          // opens it.
          <a href={outbound} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true">
            <Image
              src={p.image}
              alt=""
              width={1200}
              height={675}
              sizes="(min-width: 768px) 768px, 100vw"
              preload
              className="w-full rounded-xl shadow-md"
            />
          </a>
        ) : (
          <Image
            src={p.image}
            alt={p.editorial?.imageAlt ?? ""}
            width={1200}
            height={675}
            sizes="(min-width: 768px) 768px, 100vw"
            preload
            className="mb-12 w-full rounded-xl shadow-md"
          />
        )}

        {p.editorial && (
          <div className={PROSE}>
            {p.editorial.content ?? (p.transcripcion && <TranscripcionText t={p.transcripcion} />)}
          </div>
        )}

      </article>

      {related.items.length > 0 && (
        <section aria-labelledby="relacionadas" className="mx-auto mt-20 max-w-5xl border-t border-gray-200 pt-10">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="relacionadas" className="text-lg font-semibold text-gray-800">
              {related.title}
            </h2>
            {related.more && (
              <Link href={related.more.href} className={`text-sm font-medium text-gray-700 ${TEXT_LINK}`}>
                {related.more.label}
              </Link>
            )}
          </div>
          <ul className="grid gap-4 sm:grid-cols-3">
            {related.items.map((r) => (
              <li key={r.slug}>
                <PublicacionCard publicacion={r} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
