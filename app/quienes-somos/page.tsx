import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import Image from "next/image";
import FeatureCard from "@/components/observatorio/feature-card";
import PageShell from "@/components/observatorio/page-shell";

// Ported from observatoriodelaire.com/quienes-somos: same copy, images and
// layout. Misión/Visión share the Proyectos card; the three líneas de trabajo
// are an ordered list whose photos are decorative (the text sits on them),
// under a light tint so the white text stays legible.

const LEAD =
  "Somos una organización de la sociedad civil dedicada a generar esfuerzos colaborativos y fundamento técnico para mejorar la calidad del aire en Nuevo León.";

export const metadata: Metadata = pageMetadata({
  title: "Quiénes somos",
  description: LEAD,
  path: "/quienes-somos",
});

const LINEAS = [
  { image: "/quienes-somos/linea-1.webp", text: "Mejorar el marco normativo." },
  {
    image: "/quienes-somos/linea-2.webp",
    text: "Fortalecer las instituciones encargadas de gestionar la calidad del aire.",
  },
  { image: "/quienes-somos/linea-3.webp", text: "Fortalecer a la sociedad civil." },
];

export default function QuienesSomos() {
  return (
    <PageShell title="Quiénes somos" lead={LEAD}>
      <div className="flex flex-col gap-28 md:gap-48">
        <FeatureCard
          title="Misión"
          description="Fortalecer a la sociedad, al marco normativo, y a las instituciones para coadyuvar a resolver la problemática de la contaminación atmosférica en el Área Metropolitana de Monterrey."
          image="/quienes-somos/mision.webp"
          imageAlt="Misión"
        />
        <FeatureCard
          title="Visión"
          description="Ser reconocidos internacionalmente como una organización que ha tenido una influencia significativa en el cambio de modelo de desarrollo del Área Metropolitana de Monterrey; en especial en cuanto a la calidad del aire se refiere."
          image="/quienes-somos/vision.webp"
          imageAlt="Visión"
        />

        <section className="flex flex-col gap-8 pt-10 md:pt-0">
          <h2 className="text-2xl font-semibold text-gray-900 md:text-3xl">
            Líneas de Trabajo
          </h2>
          <ol className="flex flex-col gap-12 md:flex-row md:gap-8">
            {LINEAS.map((linea, i) => (
              <li key={linea.image} className="relative flex-1 pb-48 md:pb-56">
                <Image
                  src={linea.image}
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 400px, (min-width: 768px) 33vw, 100vw"
                  className="rounded-xl object-cover"
                />
                {/* Tint so the white text reads on light photos too (tile 1). */}
                <div aria-hidden="true" className="absolute inset-0 rounded-xl bg-black/25" />
                <div className="relative z-10 flex flex-col p-4 text-white">
                  <span
                    aria-hidden="true"
                    className="text-3xl font-semibold md:text-4xl"
                  >
                    {i + 1}.
                  </span>
                  <p className="pt-20 text-xl md:pt-40 md:text-xl">
                    {linea.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </PageShell>
  );
}
