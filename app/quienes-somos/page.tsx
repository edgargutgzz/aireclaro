import type { Metadata } from "next";
import Image from "next/image";
import { pageMetadata } from "@/lib/metadata";
import { EQUIPO } from "@/lib/equipo";

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

export const metadata: Metadata = pageMetadata({ title: "Quiénes somos", description: LEAD, path: "/quienes-somos" });

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

type Persona = (typeof EQUIPO)[number];

// The first section carries the page's h1 and no hairline above it.
function Section({ title, id, as: Heading = "h2", children }: { title: string; id?: string; as?: "h1" | "h2"; children: React.ReactNode }) {
  return (
    <section id={id} className="grid gap-6 border-t border-stone-200 py-12 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] md:gap-12 md:py-16 md:first:pt-0">
      <Heading className="text-lg font-semibold text-neutral-800">{title}</Heading>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

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

      </div>
    </div>
  );
}
