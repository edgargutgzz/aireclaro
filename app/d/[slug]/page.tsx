import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { getPublicacion, linkCard, publicaciones } from "@/app/publicaciones/data";

// Share links for the documents and infographics, /d/<slug>: a chat app
// reads this page's link card (app/api/og/publicaciones/[slug]), a person
// is sent straight on to the PDF. A link to the PDF itself can't carry a
// card (a PDF has no tags for chat apps to read), and the library opens
// documents as PDFs with no page in between, so this page is only ever a
// hop. The redirect is a meta refresh, not an HTTP one: chat apps follow
// HTTP redirects and would land on the PDF, card-less. Not indexed; the
// canonical is the document's own page (/publicaciones/<slug>).

export const dynamicParams = false;

const isDocument = (p: { tipo: string; file?: string }) => p.tipo !== "columna" && Boolean(p.file);

export function generateStaticParams() {
  return publicaciones.filter(isDocument).map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = getPublicacion((await params).slug);
  if (!p) return {};
  return {
    ...pageMetadata({
      title: p.title,
      description: p.summary ?? p.title,
      path: `/publicaciones/${p.slug}`,
      images: [linkCard(p)],
    }),
    robots: { index: false, follow: true },
  };
}

export default async function Compartir({ params }: Props) {
  const p = getPublicacion((await params).slug)!;
  return (
    <div className="px-6 py-16 text-center text-sm text-neutral-600">
      <meta httpEquiv="refresh" content={`0; url=${p.file}`} />
      <a href={p.file} className="font-medium text-neutral-800 underline decoration-neutral-300 underline-offset-2">
        Abrir {p.title}
      </a>
    </div>
  );
}
