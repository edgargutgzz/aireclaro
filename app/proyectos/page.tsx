import type { Metadata } from "next";
import FeatureCard from "@/components/observatorio/feature-card";
import PageShell from "@/components/observatorio/page-shell";
import Link from "next/link";
import { SquareArrowOutUpRight, Youtube } from "lucide-react";

// Ported from observatoriodelaire.com/proyectos: same copy, images and card
// layout. The six hand-copied cards are one data list here, and the links are
// styled directly instead of wrapping a <button> (invalid inside an <a>).

export const metadata: Metadata = {
  title: "Proyectos",
  description:
    "Conoce los proyectos en los que estamos trabajando para mejorar la calidad del aire en Nuevo León.",
};

type ProjectLink = { href: string; label: string; video?: boolean };

type Project = {
  title: string;
  description: string;
  tag: string;
  image: string;
  links: ProjectLink[];
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
    title: "Adopta un Sensor",
    description:
      "Únete a la iniciativa adoptando un sensor de forma gratuita y colabora en la medición de la calidad del aire en tu comunidad.",
    tag: "Monitoreo Ambiental",
    image: "/proyectos/adopta-sensor.webp",
    links: [
      { href: "https://www.observatoriodelaire.com/adopta-sensor", label: "Visitar" },
    ],
  },
  {
    title: "Aire Claro",
    description:
      "Aire Claro brinda información sobre la contaminación atmosférica en la Zona Metropolitana de Monterrey y Saltillo.",
    tag: "Aplicación Web",
    image: "/proyectos/aireclaro.webp",
    links: [
      { href: "https://www.youtube.com/watch?v=zUt6HwlZB08", label: "Video", video: true },
      { href: "/mapa", label: "Visitar" },
    ],
  },
  {
    title: "Red Espesies",
    description:
      "Somos colaboradores para afrontar determinantes sociales y ambientales desde la salud, protegiendo los derechos de la naturaleza.",
    tag: "Red colaborativa",
    image: "/proyectos/red-espesies.webp",
    links: [{ href: "https://saludplanetaria.espm.mx/", label: "Visitar" }],
  },
  {
    title: "Impactos del Cambio Climático y de la Contaminación del Aire en la Salud",
    description:
      "El proyecto estudia cómo la contaminación del aire y el cambio climático impactan la salud de la población, destacando la importancia de la adaptación y mitigación en las zonas metropolitanas de México.",
    tag: "Investigación",
    image: "/proyectos/impactos.webp",
    links: [],
  },
  {
    title: "Caballo de Troya",
    description:
      "Caballo de Troya es un documental que explora la calidad del aire en la ciudad, revelando el impacto de la contaminación atmosférica en la salud de sus habitantes.",
    tag: "Documental",
    image: "/proyectos/caballo-troya.webp",
    links: [
      { href: "https://www.youtube.com/watch?v=X1UfphH4pLc&t=2s", label: "Visitar" },
    ],
  },
];

// The Observatory site's secondary button (gray-100 fill), built to the style
// guide's secondary-button recipe and house focus ring.
const buttonClass =
  "flex items-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15";

function ProjectButton({ href, label, video }: ProjectLink) {
  const external = href.startsWith("http");
  return (
    <Link
      href={href}
      className={buttonClass}
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
    >
      {video && <Youtube className="mr-2 h-4 w-4 text-red-500" aria-hidden />}
      {label}
      {!video && <SquareArrowOutUpRight className="ml-2 h-4 w-4" aria-hidden />}
      {external && <span className="sr-only"> (abre en una nueva pestaña)</span>}
    </Link>
  );
}

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
              <p className="whitespace-nowrap rounded-lg bg-blue-100 px-2 py-1 text-sm">
                {project.tag}
              </p>
              {project.links.length > 0 && (
                <div className="flex gap-2">
                  {project.links.map((link) => (
                    <ProjectButton key={link.href} {...link} />
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
