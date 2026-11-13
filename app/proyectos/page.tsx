import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
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
  /** The project's own channels, as icon links under the CTA (same icon set as the footer). */
  socials?: { href: string; label: string; Icon: IconType }[];
};

const PROJECTS: Project[] = [
  {
    title: "Alerta Regia",
    description:
      "Consulta la calidad del aire en tu municipio, recibe alertas y aprende acciones simples para cuidarte en días con niveles peligrosos.",
    image: "/proyectos/alerta-regia.webp",
    href: "https://alerta-regia.com/",
    cta: "Visitar alerta-regia.com",
    socials: [
      { href: "https://chat.whatsapp.com/CsWgti3vM88BOVjlDigqh3", label: "WhatsApp", Icon: SiWhatsapp },
      { href: "https://www.instagram.com/alertaregiaambiental/", label: "Instagram", Icon: SiInstagram },
      { href: "https://www.facebook.com/profile.php?id=61583510995051", label: "Facebook", Icon: SiFacebook },
    ],
  },
  {
    title: "Adopta un sensor",
    description:
      "Adopta un sensor de forma gratuita y colabora en la medición de la calidad del aire en tu comunidad.",
    image: "/adopta-sensor/paso1.webp",
    imagePosition: "object-[50%_75%]",
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
                  {project.socials && (
                    <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                      {project.socials.map(({ href, label, Icon }) => (
                        <li key={label}>
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-base text-neutral-700 underline-offset-4 hover:text-neutral-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-800"
                          >
                            <Icon size={16} aria-hidden />
                            {label}
                            <span className="sr-only"> (abre en una nueva pestaña)</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Image
                  src={project.image}
                  alt=""
                  width={1080}
                  height={1080}
                  sizes="(min-width: 1280px) 420px, (min-width: 768px) 35vw, 100vw"
                  className={`aspect-[4/3] w-full rounded-xl bg-stone-100 object-cover ${project.imagePosition ?? ""}`}
                />
              </div>
            </Section>
          );
        })}
      </div>
    </div>
  );
}
