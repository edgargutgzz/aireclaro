import type { Metadata } from "next";
import Image from "next/image";

// Ported from observatoriodelaire.com/infografias: same copy, same PDFs, same
// card grid. The previews are resized copies (1600px wide, not the 7087px
// originals), declared at their real portrait ratio, and each card is one
// entry in a list instead of a hand-copied block.

export const metadata: Metadata = {
  title: "Infografías",
  description:
    "Conoce las infografías que hemos creado para informarnos sobre la calidad del aire en Nuevo León.",
};

const INFOGRAFIAS = [
  {
    slug: "infografia_salud",
    alt: "Calidad del aire en Monterrey",
    height: 2400,
  },
  {
    slug: "infografia_contaminacion",
    alt: "Contaminación en Monterrey",
    height: 2400,
  },
  {
    slug: "infografia_social",
    alt: "Impacto social de la contaminación en Monterrey",
    height: 2400,
  },
  {
    slug: "infografia_numeros",
    alt: "Estadísticas y números sobre la contaminación en Monterrey",
    height: 2461,
  },
];

export default function Infografias() {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-32 pt-16 lg:px-8 lg:pb-48 lg:pt-40">
      <div className="flex flex-col text-center">
        <h1 className="text-md md:text-lg">Infografías</h1>
        <p className="pt-4 text-2xl font-bold md:px-20 md:pt-6 md:text-4xl md:leading-tight">
          Conoce las infografías que hemos creado para informarnos sobre la
          calidad del aire en Nuevo León.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 pt-32 md:grid-cols-2 md:gap-20 md:pt-56">
        {INFOGRAFIAS.map(({ slug, alt, height }) => (
          <a
            key={slug}
            href={`/infografias/${slug}.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="block transform overflow-hidden rounded-lg bg-white p-3 shadow-md transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
          >
            <Image
              src={`/infografias/${slug}.webp`}
              alt={alt}
              width={1600}
              height={height}
              sizes="(min-width: 1280px) 560px, (min-width: 768px) 45vw, 100vw"
              className="rounded-lg"
            />
            <span className="sr-only"> (PDF, abre en una nueva pestaña)</span>
          </a>
        ))}
      </div>
    </div>
  );
}
