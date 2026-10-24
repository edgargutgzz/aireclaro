import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import FeatureCard from "@/components/observatorio/feature-card";
import LinkButton, { type LinkButtonProps } from "@/components/observatorio/link-button";
import PageShell from "@/components/observatorio/page-shell";

// Ported from observatoriodelaire.com/proyectos: same copy, images and card
// layout. The six hand-copied cards are one data list here, and the links are
// styled directly (LinkButton) instead of wrapping a <button>, invalid in an <a>.

export const metadata: Metadata = pageMetadata({
  title: "Proyectos",
  description: "Conoce los proyectos en los que estamos trabajando para mejorar la calidad del aire en Nuevo León.",
  path: "/proyectos",
});

type Project = {
  title: string;
  description: string;
  tag: string;
  image: string;
  links: LinkButtonProps[];
};

const PROJECTS: Project[] = [
  {
    title: "Alerta Regia",
    description:
      "Consulta la calidad del aire en tu zona y conoce las medidas para protegerte.",
    tag: "Monitoreo Ambiental",
    image: "/proyectos/alerta-regia.webp",
    links: [{ href: "https://alerta-regia.com/", label: "Visitar" }],
  },
  {
    title: "Adopta un sensor",
    description:
      "Únete a la iniciativa adoptando un sensor de forma gratuita y colabora en la medición de la calidad del aire en tu comunidad.",
    tag: "Monitoreo Ambiental",
    image: "/proyectos/adopta-sensor.webp",
    links: [
      { href: "/adopta-sensor", label: "Visitar" },
    ],
  },
  {
    title: "Impactos del Cambio Climático y de la Contaminación del Aire en la Salud",
    description:
      "El proyecto estudia cómo la contaminación del aire y el cambio climático impactan la salud de la población, destacando la importancia de la adaptación y mitigación en las zonas metropolitanas de México.",
    tag: "Investigación",
    image: "/proyectos/impactos.webp",
    links: [],
  },
];

export default function Proyectos() {
  return (
    <PageShell
      title="Proyectos"
      lead="Conoce los proyectos en los que estamos trabajando para mejorar la calidad del aire en Nuevo León."
    >
      <div className="flex flex-col gap-28 md:gap-48">
        {PROJECTS.map((project) => (
          <FeatureCard
            key={project.title}
            title={project.title}
            description={project.description}
            image={project.image}
            imageAlt={project.title}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pt-6 md:pt-12">
              <p className="whitespace-nowrap rounded-xl bg-blue-100 px-2 py-1 text-sm">
                {project.tag}
              </p>
              {project.links.length > 0 && (
                <div className="flex gap-2">
                  {project.links.map((link) => (
                    <LinkButton key={link.href} {...link} />
                  ))}
                </div>
              )}
            </div>
          </FeatureCard>
        ))}
      </div>
    </PageShell>
  );
}
