import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { editoriales, formatEditorialDate, getArticleBySlug } from "../data";

// Ported from observatoriodelaire.com/editoriales/[slug]. Only editorials with
// written content get a page (PDF-only ones open the PDF from the list), and
// any other slug is a static 404.

export const dynamicParams = false;

export function generateStaticParams() {
  return editoriales
    .filter((editorial) => editorial.content)
    .map((editorial) => ({ slug: editorial.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const article = getArticleBySlug((await params).slug);
  if (!article) return {};
  return pageMetadata({
    title: article.title,
    description: `${article.author}, ${article.newspaper.replace(/^\P{L}+/u, "")}, ${formatEditorialDate(article.date)}.`,
    path: `/editoriales/${article.slug}`,
    ogTitle: article.title,
    images: [{ url: article.image, alt: article.imageAlt }],
  });
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article?.content) notFound();

  return (
    <div className="px-6 py-16 lg:px-8 lg:py-40">
      <article className="mx-auto max-w-3xl">
        <header className="mb-12">
          <h1 className="mb-6 text-3xl font-bold md:text-4xl">
            {article.title}
          </h1>

          <div className="mb-8 flex items-center gap-4">
            <Image
              src={article.authorProfile}
              alt={article.authorProfileAlt}
              width={96}
              height={96}
              className="h-12 w-12 rounded-full"
            />
            <div>
              <p className="font-medium">{article.author}</p>
              <p className="text-gray-600">
                {article.newspaper} • {formatEditorialDate(article.date)}
              </p>
            </div>
          </div>

          <Image
            src={article.image}
            alt={article.imageAlt}
            width={1200}
            height={675}
            sizes="(min-width: 768px) 768px, 100vw"
            preload
            className="w-full rounded-lg shadow-md"
          />
        </header>

        <div className="prose prose-lg prose-headings:font-semibold prose-headings:text-gray-800 prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-6 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600 prose-strong:font-semibold prose-strong:text-gray-800 prose-li:text-gray-700 prose-li:mb-2 prose-img:rounded-lg prose-img:shadow-md max-w-none">
          {article.content}
        </div>

        <div className="mt-16 border-t border-gray-200 pt-8">
          <Link
            href="/editoriales"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
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
            Volver a editoriales
          </Link>
        </div>
      </article>
    </div>
  );
}
