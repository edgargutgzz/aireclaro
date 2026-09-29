import type { Metadata } from "next";
import Image from "next/image";
import PageShell from "@/components/observatorio/page-shell";
import Link from "next/link";
import { editoriales, formatEditorialDate, type Editorial } from "./data";

// Ported from observatoriodelaire.com/editoriales: same copy, data and card
// grid. An editorial with a PDF opens it in a new tab; one with written
// content opens its article page (./[slug]).

export const metadata: Metadata = {
  title: "Editoriales",
  description:
    "Explora nuestras publicaciones y artículos sobre la calidad del aire en la ciudad.",
};

const cardClass =
  "transform rounded-lg bg-white p-4 shadow-md transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15";

function EditorialCard({ editorial }: { editorial: Editorial }) {
  const body = (
    <>
      <Image
        src={editorial.image}
        alt={editorial.imageAlt}
        width={1024}
        height={576}
        sizes="(min-width: 1280px) 384px, (min-width: 1024px) 30vw, 100vw"
        className="aspect-video w-full rounded-lg object-cover"
      />
      <h2 className="pt-4 text-lg font-semibold md:pt-6 md:text-2xl lg:pt-4 lg:text-lg">
        {editorial.title}
      </h2>
      <div className="flex items-center gap-2 pt-4 md:pt-6 lg:pt-4">
        <Image
          src={editorial.authorProfile}
          alt={editorial.authorProfileAlt}
          width={64}
          height={64}
          className="h-8 w-8 rounded-full"
        />
        <p className="text-sm md:text-lg lg:text-sm">{editorial.author}</p>
      </div>
      <div className="flex items-center justify-between pt-8 md:pt-10 lg:pt-8">
        <p className="text-sm text-gray-600 md:text-lg lg:text-sm">
          {editorial.newspaper}
        </p>
        <p className="text-sm text-gray-600 md:text-lg lg:text-sm">
          {formatEditorialDate(editorial.date)}
        </p>
      </div>
    </>
  );

  if (editorial.pdfLink) {
    return (
      <a
        href={editorial.pdfLink}
        target="_blank"
        rel="noopener noreferrer"
        className={cardClass}
      >
        {body}
        <span className="sr-only"> (PDF, abre en una nueva pestaña)</span>
      </a>
    );
  }

  return (
    <Link href={`/editoriales/${editorial.slug}`} className={cardClass}>
      {body}
    </Link>
  );
}

export default function Editoriales() {
  return (
    <PageShell
      title="Editoriales"
      lead="Explora nuestras publicaciones y artículos sobre la calidad del aire en la ciudad."
    >
      <div className="grid grid-cols-1 gap-12 md:gap-y-20 lg:grid-cols-3 lg:gap-x-8">
        {editoriales.map((editorial) => (
          <EditorialCard key={editorial.slug} editorial={editorial} />
        ))}
      </div>
    </PageShell>
  );
}
