import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { pageMetadata, sectionCard } from "@/lib/metadata";
import Section from "@/components/observatorio/section";

// The five steps grouped in three phases, one editorial row each (the shared
// Section, like /proyectos and /quienes-somos): the phase on the left, its
// steps as one continuous numbered list and a picture on the right. No visible
// header: the page opens on the steps; the h1 stays for search engines and
// screen readers, the lead is the description for Google and link previews.

const LEAD =
  "Únete a la iniciativa adoptando un sensor de forma gratuita y colabora en la medición de la calidad del aire en tu comunidad.";

const FORMULARIO = "https://forms.gle/gzNU3aEbJ6tTqX8J6";

export const metadata: Metadata = pageMetadata({
  title: "Adopta un sensor",
  description: LEAD,
  path: "/adopta-sensor",
  images: sectionCard("adopta-sensor", "Adopta un sensor, Observatorio del Aire"),
});

const linkClass =
  "font-medium text-neutral-800 underline underline-offset-4 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-800";

type Fase = {
  eyebrow: string;
  title: string;
  start: number;
  steps: React.ReactNode[];
  footer?: React.ReactNode;
  image: string;
  imageAlt: string;
  imagePosition?: string;
};

const FASES: Fase[] = [
  {
    eyebrow: "Paso 1",
    title: "Solicitud",
    start: 1,
    steps: [
      <>
        Envía tu solicitud con el{" "}
        <a href={FORMULARIO} target="_blank" rel="noopener noreferrer" className={linkClass}>
          formulario en línea
          <span className="sr-only"> (abre en una nueva pestaña)</span>
        </a>
        , toma 2 minutos.
      </>,
      "Revisaremos tu ubicación y te responderemos por correo electrónico.",
    ],
    image: "/adopta-sensor/paso1.webp",
    imageAlt: "Sensor de calidad del aire instalado en un poste",
  },
  {
    eyebrow: "Paso 2",
    title: "Visita e instalación",
    start: 3,
    steps: [
      "Si es aprobada, te contactaremos para agendar una visita de revisión del sitio.",
      "Si tu sitio es aprobado, agendaremos una visita final para instalar el sensor y firmar el acuerdo de adopción.",
    ],
    image: "/adopta-sensor/paso4.webp",
    imageAlt: "Instalación de un sensor en una pared",
    imagePosition: "object-[50%_40%]",
  },
  {
    eyebrow: "Paso 3",
    title: "Tus datos",
    start: 5,
    steps: ["Consulta los registros de tu sensor hora con hora en el mapa de calidad del aire."],
    footer: (
      <Link
        href="/calidad-del-aire"
        className="group mt-5 inline-flex items-center gap-1.5 text-base font-medium text-neutral-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-800"
      >
        Ver el mapa
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    ),
    image: "/adopta-sensor/paso5.webp",
    imageAlt: "Mapa de calidad del aire",
  },
];

export default function AdoptaSensor() {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-24 pt-12 lg:px-8 lg:pb-32 lg:pt-20">
      <h1 className="sr-only">Adopta un sensor</h1>
      <div>
        {FASES.map((fase) => (
          <Section key={fase.title} eyebrow={fase.eyebrow} title={fase.title}>
            <div className="grid gap-8 md:grid-cols-2 md:gap-10">
              <div>
                <ol start={fase.start} className="flex list-decimal flex-col gap-3.5 pl-5 text-lg leading-relaxed text-neutral-700 marker:text-neutral-500">
                  {fase.steps.map((step, i) => (
                    <li key={i} className="pl-1">{step}</li>
                  ))}
                </ol>
                {fase.footer}
              </div>
              <Image
                src={fase.image}
                alt={fase.imageAlt}
                width={1080}
                height={1080}
                sizes="(min-width: 1280px) 420px, (min-width: 768px) 35vw, 100vw"
                className={`aspect-[4/3] w-full rounded-xl bg-stone-100 object-cover ${fase.imagePosition ?? ""}`}
              />
            </div>
          </Section>
        ))}
      </div>
    </div>
  );
}
