import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ChevronRight } from "lucide-react";
import type { IconType } from "react-icons";
import { SiFacebook, SiInstagram, SiWhatsapp } from "react-icons/si";
import { pageMetadata, sectionCard } from "@/lib/metadata";
import Section from "@/components/observatorio/section";

// The Observatory's projects in the same editorial rows as /quienes-somos,
// one row per project (name on the left; description, link and its picture on
// the right). No visible header: like /datos and /publicaciones, the page
// opens on its content. The h1 stays for search engines and screen readers;
// the lead is the description for Google and link previews.

const LEAD = "Conoce los proyectos en los que estamos trabajando para mejorar la calidad del aire en la Zona Metropolitana de Monterrey.";

export const metadata: Metadata = pageMetadata({ title: "Proyectos", description: LEAD, path: "/proyectos", images: sectionCard("proyectos", "Proyectos del Observatorio del Aire") });

type Project = {
  title: string;
  description: string;
  image: string;
  /** Where the 4:3 crop of the square image sits, when not centered. */
  imagePosition?: string;
  href: string;
  cta: string;
  /** The project's own channels, each with what people get there: one card
   *  under the text and picture, a column per channel (the map's OCCAMM card
   *  recipe, laid sideways). Same icon set as the footer. */
  channels?: { heading: string; links: { href: string; label: string; description: string; Icon: IconType }[] };
};

const PROJECTS: Project[] = [
  {
    title: "Alerta Regia",
    description:
      "Consulta la calidad del aire en tu municipio, recibe alertas y aprende acciones simples para cuidarte en días con niveles peligrosos.",
    image: "/proyectos/alerta-regia.webp",
    href: "https://alerta-regia.com/",
    cta: "Visitar alerta-regia.com",
    // Descriptions adapted from alerta-regia.com's own "Únete y recibe alertas" cards.
    channels: {
      heading: "Únete y recibe alertas",
      links: [
        { href: "https://chat.whatsapp.com/CsWgti3vM88BOVjlDigqh3", label: "WhatsApp", description: "Únete a la comunidad de tu municipio y recibe alertas.", Icon: SiWhatsapp },
        { href: "https://www.instagram.com/alertaregiaambiental/", label: "Instagram", description: "Recomendaciones diarias según la calidad del aire.", Icon: SiInstagram },
        { href: "https://www.facebook.com/profile.php?id=61583510995051", label: "Facebook", description: "Forma parte de la comunidad y conoce sus recomendaciones.", Icon: SiFacebook },
      ],
    },
  },
  {
    title: "Adopta un sensor",
    description:
      "Adopta un sensor de forma gratuita y colabora en la medición de la calidad del aire en tu comunidad.",
    image: "/proyectos/adopta-sensor.webp",
    imagePosition: "object-[50%_80%]",
    href: "/adopta-sensor",
    cta: "Cómo adoptar un sensor",
  },
];

export default function Proyectos() {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-24 pt-12 lg:px-8 lg:pb-32 lg:pt-20">
      <h1 className="sr-only">Proyectos del Observatorio del Aire</h1>
      <div>
        {PROJECTS.map((project) => {
          const external = project.href.startsWith("http");
          return (
            <Section key={project.title} title={project.title}>
              <div className="grid gap-8 md:grid-cols-2 md:gap-10">
                <div>
                  <p className="text-lg leading-relaxed text-neutral-700">{project.description}</p>
                  <Link
                    href={project.href}
                    {...(external && { target: "_blank", rel: "noopener noreferrer" })}
                    className="group mt-5 inline-flex items-center gap-1.5 text-base font-medium text-neutral-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-800"
                  >
                    {project.cta}
                    {external ? (
                      <>
                        <ArrowUpRight className="h-4 w-4" aria-hidden />
                        <span className="sr-only"> (abre en una nueva pestaña)</span>
                      </>
                    ) : (
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    )}
                  </Link>
                </div>
                <Image
                  src={project.image}
                  alt=""
                  width={1080}
                  height={1080}
                  sizes="(min-width: 1280px) 420px, (min-width: 768px) 35vw, 100vw"
                  className={`aspect-[4/3] w-full rounded-xl bg-stone-100 object-cover ${project.imagePosition ?? ""}`}
                />
                {/* The channels go under both columns, full width, one per
                    column (stacked on phones), so the text column stays as
                    short as the picture. */}
                {project.channels && (
                  <div className="md:col-span-2">
                    <h3 className="mb-2.5 text-xs font-medium uppercase tracking-wide text-neutral-600">{project.channels.heading}</h3>
                    <ul className="grid overflow-hidden rounded-2xl border border-stone-200 bg-white md:grid-cols-3">
                      {project.channels.links.map(({ href, label, description, Icon }) => (
                        <li key={label} className="border-t border-stone-100 first:border-t-0 md:border-l md:border-t-0 md:first:border-l-0">
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex h-full items-start gap-3.5 px-[18px] py-3.5 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900/15"
                          >
                            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-stone-100 text-neutral-800">
                              <Icon size={20} aria-hidden />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[15px] font-semibold text-neutral-800">{label}</span>
                              <span className="mt-0.5 block text-sm leading-snug text-neutral-600">{description}</span>
                              <span className="sr-only"> (abre en una nueva pestaña)</span>
                            </span>
                            <ChevronRight aria-hidden className="mt-3 h-4 w-4 flex-shrink-0 text-neutral-400 transition-colors group-hover:text-neutral-600" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Section>
          );
        })}
      </div>
    </div>
  );
}
