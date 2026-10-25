import type { Metadata } from "next";
import Image from "next/image";
import { pageMetadata, sectionCard } from "@/lib/metadata";
import { EQUIPO } from "@/lib/equipo";
import Section from "@/components/observatorio/section";

// Quiénes somos and the team on one page (approved 2026-10-18; /equipo
// redirects to #equipo). Editorial layout: each section's title in a narrow left column, its content
// on the right, sections split by a hairline. Text carries Misión, Visión and
// the líneas (no stock photos); the only pictures are the team,
// every portrait in one crop.

const LEAD =
  "Somos una organización de la sociedad civil dedicada a generar esfuerzos colaborativos y fundamento técnico para mejorar la calidad del aire en la Zona Metropolitana de Monterrey.";

const MISION =
  "Fortalecer a la sociedad, al marco normativo, y a las instituciones para coadyuvar a resolver la problemática de la contaminación atmosférica en el Área Metropolitana de Monterrey.";

const VISION =
  "Ser reconocidos internacionalmente como una organización que ha tenido una influencia significativa en el cambio de modelo de desarrollo del Área Metropolitana de Monterrey; en especial en cuanto a la calidad del aire se refiere.";

const LINEAS = [
  "Mejorar el marco normativo.",
  "Fortalecer las instituciones encargadas de gestionar la calidad del aire.",
  "Fortalecer a la sociedad civil.",
];

// The search and link-preview description: what the page holds, shorter than
// the lead.
const DESCRIPTION = "Conoce al equipo, la misión y las alianzas del Observatorio.";

export const metadata: Metadata = pageMetadata({ title: "Quiénes somos", description: DESCRIPTION, path: "/quienes-somos", images: sectionCard("quienes-somos", "Quiénes somos, Observatorio del Aire") });

const LABEL = "text-xs font-semibold uppercase leading-snug tracking-wide text-neutral-500";

// By portrait key, in lib/equipo.ts's order.
const OPERATIVO = ["selene", "yessica", "edgar", "lucina"];
const JUVENIL = ["guillermo", "lucia", "juanpablo", "andrea"];
const enGrupo = (keys: string[]) => EQUIPO.filter((p) => keys.includes(p.image));
const operativo = enGrupo(OPERATIVO);
const juvenil = enGrupo(JUVENIL);
// Hand-ordered (the user's picks). Roberta first (2026-10-23);
// the rest keep their earlier order.
const CIUDADANO = [
  "roberta", "lorenzo", "rosario", "gerardo",
  "carlos", "adrian", "uriel", "ana",
  "rodolfo", "horacio", "maria", "cosijopii",
];
const ciudadano = CIUDADANO.map((key) => EQUIPO.find((p) => p.image === key)!);

// Each logo links to the ally's site. The logo carries the name, so it's the alt.
// Logos in public/alianzas/, trimmed to the mark on a transparent background.
// Heights are per logo so each covers about the same area (height ∝ 1/√aspect):
// a wide wordmark sits shorter, a square badge taller.
// Chipinque and Pronatura first (the user's pick, 2026-10-24).
const ALIANZAS = [
  {
    name: "Reserva Natural Chipinque",
    url: "https://www.chipinque.org.mx/",
    logo: "/alianzas/reserva-chipinque.webp",
    width: 900,
    height: 247,
    className: "h-10",
  },
  {
    name: "Pronatura Noreste",
    url: "https://pronaturanoreste.org/",
    logo: "/alianzas/pronatura-noreste.webp",
    width: 540,
    height: 454,
    className: "h-18",
  },
  {
    name: "Alianza del Aire Nuevo León",
    url: "https://www.alianzadelaire.org/",
    logo: "/alianzas/alianza-del-aire.webp",
    width: 1557,
    height: 305,
    className: "h-9",
  },
  {
    name: "Consejo Cívico",
    url: "https://consejocivico.org.mx/",
    logo: "/alianzas/consejo-civico.webp",
    width: 652,
    height: 277,
    className: "h-13",
  },
  {
    name: "Comité Ecológico Integral",
    url: "https://comiteecologicointegral.org/",
    logo: "/alianzas/comite-ecologico-integral.webp",
    width: 320,
    height: 320,
    className: "h-20",
  },
  {
    name: "Pueblo Bicicletero",
    url: "https://pueblobicicletero.org/",
    logo: "/alianzas/pueblo-bicicletero.webp",
    width: 600,
    height: 362,
    className: "h-14",
  },
  {
    name: "Red ESPESIES",
    url: "https://www.redespesies.mx/",
    logo: "/alianzas/red-espesies.webp",
    width: 588,
    height: 563,
    className: "h-20",
  },
];

type Persona = (typeof EQUIPO)[number];

// One portrait treatment for everyone: a square crop, the same radius, name
// and role under it, the same size in every group.
function Grupo({ title, personas }: { title: string; personas: Persona[] }) {
  return (
    <div>
      <h3 className={LABEL}>{title}</h3>
      <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {personas.map((persona) => (
          <li key={persona.image}>
            <Image
              src={`/equipo/${persona.image}.webp`}
              alt=""
              width={480}
              height={480}
              sizes="(min-width: 1024px) 200px, 45vw"
              className="aspect-square w-full rounded-xl bg-stone-100 object-cover"
            />
            <p className="mt-3 text-sm font-semibold leading-snug text-neutral-800">
              {persona.name}
            </p>
            <p className="mt-1 text-sm leading-snug text-neutral-600">{persona.puesto}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function QuienesSomos() {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-24 pt-12 lg:px-8 lg:pb-32 lg:pt-20">
      <div>
        <Section title="Quiénes somos" as="h1">
          <p className="max-w-3xl text-lg leading-relaxed text-neutral-800 md:text-xl">{LEAD}</p>
        </Section>

        <Section title="Propósito">
          <div className="grid gap-10 md:grid-cols-2">
            {[
              { title: "Misión", text: MISION },
              { title: "Visión", text: VISION },
            ].map((item) => (
              <div key={item.title}>
                <h3 className={LABEL}>{item.title}</h3>
                <p className="mt-3 text-lg leading-relaxed text-neutral-700">{item.text}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Líneas de trabajo">
          <ol className="divide-y divide-stone-200 border-y border-stone-200">
            {LINEAS.map((linea, i) => (
              <li key={linea} className="flex items-baseline gap-6 py-5">
                <span aria-hidden="true" className="w-8 shrink-0 text-2xl font-semibold tabular-nums text-neutral-300">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-xl font-semibold leading-snug text-neutral-800">{linea}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Equipo" id="equipo">
          <div className="flex flex-col gap-14">
            <Grupo title="Equipo operativo" personas={operativo} />
            <Grupo title="Consejo Ciudadano" personas={ciudadano} />
            <Grupo title="Consejo Juvenil" personas={juvenil} />
          </div>
        </Section>

        <Section title="Alianzas" id="alianzas">
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {ALIANZAS.map((aliado) => (
              <li key={aliado.name}>
                <a
                  href={aliado.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-28 items-center justify-center rounded-xl border border-stone-200 bg-white px-5 transition-colors hover:border-stone-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-800"
                >
                  <Image
                    src={aliado.logo}
                    alt={aliado.name}
                    width={aliado.width}
                    height={aliado.height}
                    sizes="250px"
                    className={`${aliado.className} w-auto max-w-full object-contain`}
                  />
                </a>
              </li>
            ))}
          </ul>
        </Section>

      </div>
    </div>
  );
}
