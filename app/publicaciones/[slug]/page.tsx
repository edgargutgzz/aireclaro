import type { Metadata } from "next";
import { statSync } from "node:fs";
import path from "node:path";
import { ORGANIZATION_REF, pageMetadata } from "@/lib/metadata";
import { SITE_URL } from "@/lib/site";
import JsonLd from "@/components/json-ld";
import Avatares from "@/components/publicaciones/avatares";
import Cita from "@/components/publicaciones/cita";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, FileText } from "lucide-react";
import {
  OCCAMM,
  citation,
  displayDate,
  getPublicacion,
  pageUrl,
  photos,
  publicaciones,
  tipoLabel,
  type Publicacion,
} from "../data";

// One page per publication, all static. A column with written content shows
// it in full; everything else shows its summary and opens the PDF (or the
// outlet's page). Every page ends with a citation, so a link to it is
// something people can cite. /editoriales/[slug] redirects here
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
  const metadata = pageMetadata({
    title: p.title,
    description: p.summary ?? `${byline(p)}, ${displayDate(p)}.`,
    path: `/publicaciones/${p.slug}`,
    images: [{ url: p.image, alt: p.title }],
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

// "PDF · 3.4 MB · 22 páginas", read from public/ at build time.
function pdfFacts(p: Publicacion): string {
  const bytes = statSync(path.join(process.cwd(), "public", p.file!)).size;
  const size = bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.round(bytes / 1e3)} KB`;
  const pages = p.pages ? ` · ${p.pages} ${p.pages === 1 ? "página" : "páginas"}` : "";
  return `PDF · ${size}${pages}`;
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

const PRIMARY_BUTTON =
  "inline-flex h-10 items-center gap-1.5 rounded-xl bg-gray-800 px-4 text-sm font-medium text-white transition-colors hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15";

export default async function PublicacionPage({ params }: Props) {
  const p = getPublicacion((await params).slug);
  if (!p) notFound();

  const outbound = p.file ?? p.externalUrl;

  return (
    <div className="px-6 pb-32 pt-10 lg:px-8 lg:pt-12">
      <JsonLd data={structuredData(p)} />
      <article className="mx-auto max-w-3xl">
        <header className="mb-12">
          <p className="mb-4 text-sm text-gray-500">
            {tipoLabel(p.tipo)} · {displayDate(p)}
          </p>
          <h1 className="mb-6 text-3xl font-bold md:text-4xl">{p.title}</h1>

          {photos(p).length > 0 ? (
            <div className="flex items-center gap-4">
              <Avatares fotos={photos(p)} size="lg" />
              <div>
                <p className="font-medium">{p.author}</p>
                {p.outlet && <p className="text-gray-600">{p.outlet}</p>}
              </div>
            </div>
          ) : (
            <p className="text-gray-600">{byline(p)}</p>
          )}

          {p.summary && <p className="mt-8 text-lg leading-relaxed text-gray-700">{p.summary}</p>}

          {outbound && (
            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
              <a href={outbound} target="_blank" rel="noopener noreferrer" className={PRIMARY_BUTTON}>
                {p.file ? (
                  <>
                    <FileText className="h-4 w-4" aria-hidden /> Abrir PDF
                  </>
                ) : (
                  <>
                    Leer en {p.outlet} <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </>
                )}
                <span className="sr-only"> (abre en una nueva pestaña)</span>
              </a>
              {p.file && <span className="text-xs text-gray-500">{pdfFacts(p)}</span>}
            </div>
          )}
        </header>

        {p.editorial ? (
          <>
            <Image
              src={p.image}
              alt={p.editorial.imageAlt}
              width={1200}
              height={675}
              sizes="(min-width: 768px) 768px, 100vw"
              preload
              className="mb-12 w-full rounded-xl shadow-md"
            />
            <div className="prose prose-lg prose-headings:font-semibold prose-headings:text-gray-800 prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-6 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600 prose-strong:font-semibold prose-strong:text-gray-800 prose-li:text-gray-700 prose-li:mb-2 prose-img:rounded-xl prose-img:shadow-md max-w-none">
              {p.editorial.content}
            </div>
          </>
        ) : (
          // The cover (a document's first page, a column's clipping), as a
          // preview that also opens it.
          <a href={outbound} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true">
            <Image
              src={p.image}
              alt=""
              width={1024}
              height={576}
              sizes="(min-width: 768px) 768px, 100vw"
              preload
              className="w-full rounded-xl shadow-md"
            />
          </a>
        )}

        <div className="mt-16">
          <Cita text={citation(p)} />
        </div>

        <div className="mt-16 border-t border-gray-200 pt-8">
          <Link
            href="/publicaciones"
            className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mr-2 h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Volver a publicaciones
          </Link>
        </div>
      </article>
    </div>
  );
}
