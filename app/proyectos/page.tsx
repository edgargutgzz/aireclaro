import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { pageMetadata } from "@/lib/metadata";

// The Observatory's projects, side by side (redesigned 2026-10-24 for the two
// it keeps): a left-aligned header like /quienes-somos, then one card per
// project. The whole card is the link; its last line says where it goes.

const LEAD = "Conoce los proyectos en los que estamos trabajando para mejorar la calidad del aire en Nuevo León.";

export const metadata: Metadata = pageMetadata({ title: "Proyectos", description: LEAD, path: "/proyectos" });

type Project = {
  title: string;
  /** What kind of project it is, the card's first line. */
  tipo: string;
  description: string;
  image: string;
  /** Where the 4:3 crop of the square image sits. */
  imagePosition?: string;
  href: string;
  cta: string;
};

const PROJECTS: Project[] = [
  {
    title: "Alerta Regia",
    tipo: "Alertas de calidad del aire",
    description:
      "Consulta la calidad del aire en tu municipio, recibe alertas y aprende acciones simples para cuidarte en días con niveles peligrosos.",
    image: "/proyectos/alerta-regia.webp",
    href: "https://alerta-regia.com/",
    cta: "Visitar alerta-regia.com",
  },
  {
    title: "Adopta un sensor",
    tipo: "Ciencia ciudadana",
    description:
      "Adopta un sensor de forma gratuita y colabora en la medición de la calidad del aire en tu comunidad.",
    image: "/proyectos/adopta-sensor.webp",
    imagePosition: "object-top",
    href: "/adopta-sensor",
    cta: "Cómo adoptar un sensor",
  },
];

export default function Proyectos() {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-24 pt-12 lg:px-8 lg:pb-32 lg:pt-20">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-bold text-neutral-900 md:text-4xl">Proyectos</h1>
        <p className="mt-4 text-lg leading-relaxed text-neutral-600 md:text-xl">{LEAD}</p>
      </header>

      <ul className="mt-12 grid gap-6 md:mt-16 md:grid-cols-2 lg:gap-8">
        {PROJECTS.map((project) => {
          const external = project.href.startsWith("http");
          return (
            <li key={project.title}>
              <Link
                href={project.href}
                {...(external && { target: "_blank", rel: "noopener noreferrer" })}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
              >
                <Image
                  src={project.image}
                  alt=""
                  width={1080}
                  height={1080}
                  sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw"
                  className={`aspect-[4/3] w-full object-cover ${project.imagePosition ?? ""}`}
                />
                <div className="flex flex-1 flex-col p-6 md:p-8">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{project.tipo}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-neutral-800 md:text-3xl">{project.title}</h2>
                  <p className="mt-3 text-base leading-relaxed text-neutral-600 md:text-lg">{project.description}</p>
                  <p className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-medium text-neutral-800 group-hover:underline">
                    {project.cta}
                    {external ? (
                      <>
                        <ArrowUpRight className="h-4 w-4" aria-hidden />
                        <span className="sr-only"> (abre en una nueva pestaña)</span>
                      </>
                    ) : (
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    )}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
