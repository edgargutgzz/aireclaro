import type { Metadata } from "next";
import Image from "next/image";
import { pageMetadata } from "@/lib/metadata";
import { EQUIPO } from "@/lib/equipo";
import { LINEAS, MISION, VISION } from "@/components/observatorio/quienes-somos-sections";

// Draft: Quiénes somos and Equipo on one page. Hidden while it's reviewed: no
// nav link, not in the sitemap, noindex. /quienes-somos and /equipo stay live.
//
// Editorial layout: each section's title in a narrow left column, its content
// on the right, sections split by a hairline. Text carries Misión, Visión and
// the líneas (no stock photos); the only pictures are the team,
// every portrait in one crop.

const LEAD =
  "Somos una organización de la sociedad civil dedicada a generar esfuerzos colaborativos y fundamento técnico para mejorar la calidad del aire en la Zona Metropolitana de Monterrey.";

export const metadata: Metadata = {
  ...pageMetadata({ title: "Quiénes somos", description: LEAD, path: "/quienes-somos" }),
  robots: { index: false, follow: false },
};

const LABEL = "text-xs font-semibold uppercase leading-snug tracking-wide text-gray-500";

// By portrait key, in lib/equipo.ts's order.
const OPERATIVO = ["selene", "yessica", "edgar"];
const JUVENIL = ["guillermo", "lucia", "juanpablo", "andrea"];
const enGrupo = (keys: string[]) => EQUIPO.filter((p) => keys.includes(p.image));
const operativo = enGrupo(OPERATIVO);
const juvenil = enGrupo(JUVENIL);
// Hand-ordered (the user's picks). Women at positions 2, 4, 6 and 11: one in
// every row at the 4-column grid; at 3 columns the third row has none.
const CIUDADANO = [
  "lorenzo", "rosario", "gerardo", "ana",
  "adrian", "roberta", "uriel", "carlos",
  "rodolfo", "horacio", "maria", "cosijopii",
];
const ciudadano = CIUDADANO.map((key) => EQUIPO.find((p) => p.image === key)!);

type Persona = (typeof EQUIPO)[number];

// Misión and Visión are long sentences: the core phrase stands out, the rest
// reads quieter.
function Destacado({ text, phrase }: { text: string; phrase: string }) {
  const [before, after] = text.split(phrase);
  return (
    <p className="mt-3 text-lg leading-relaxed text-gray-500">
      {before}
      <strong className="font-semibold text-gray-900">{phrase}</strong>
      {after}
    </p>
  );
}

// The first section carries the page's h1 and no hairline above it.
function Section({ title, as: Heading = "h2", children }: { title: string; as?: "h1" | "h2"; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-t border-gray-200 py-12 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] md:gap-12 md:py-16 md:first:pt-0">
      <Heading className="text-lg font-semibold text-gray-800">{title}</Heading>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

// One portrait treatment for everyone: a square crop, the same radius, name
// and role under it. `size` only changes how many fit a row.
function Grupo({ title, personas, size }: { title: string; personas: Persona[]; size: "lg" | "sm" }) {
  const cols = size === "lg" ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
  return (
    <div>
      <h3 className={LABEL}>{title}</h3>
      <ul className={`mt-5 grid gap-x-6 gap-y-8 ${cols}`}>
        {personas.map((persona) => (
          <li key={persona.image}>
            <Image
              src={`/equipo/${persona.image}.webp`}
              alt=""
              width={480}
              height={480}
              sizes={size === "lg" ? "(min-width: 1024px) 280px, 45vw" : "(min-width: 1024px) 200px, 45vw"}
              className="aspect-square w-full rounded-xl bg-gray-100 object-cover"
            />
            <p className={`mt-3 font-semibold leading-snug text-gray-800 ${size === "lg" ? "text-base" : "text-sm"}`}>
              {persona.name}
            </p>
            <p className="mt-1 text-sm leading-snug text-gray-600">{persona.puesto}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function QuienesSomos2() {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-24 pt-12 lg:px-8 lg:pb-32 lg:pt-20">
      <div>
        <Section title="Quiénes somos" as="h1">
          <p className="max-w-3xl text-lg leading-relaxed text-gray-800 md:text-xl">{LEAD}</p>
        </Section>

        <Section title="Propósito">
          <div className="grid gap-10 md:grid-cols-2">
            {[
              {
                title: "Misión",
                text: MISION,
                phrase: "Fortalecer a la sociedad, al marco normativo, y a las instituciones",
              },
              {
                title: "Visión",
                text: VISION,
                phrase: "una influencia significativa en el cambio de modelo de desarrollo",
              },
            ].map((item) => (
              <div key={item.title}>
                <h3 className={LABEL}>{item.title}</h3>
                <Destacado text={item.text} phrase={item.phrase} />
              </div>
            ))}
          </div>
        </Section>

        <Section title="Líneas de trabajo">
          <ol className="divide-y divide-gray-200 border-y border-gray-200">
            {LINEAS.map((linea, i) => (
              <li key={linea.image} className="flex items-baseline gap-6 py-5">
                <span aria-hidden="true" className="w-8 shrink-0 text-2xl font-semibold tabular-nums text-gray-300">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-xl font-semibold leading-snug text-gray-800">{linea.text}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Equipo">
          <div className="flex flex-col gap-14">
            <Grupo title="Equipo operativo" personas={operativo} size="lg" />
            <Grupo title="Consejo Ciudadano" personas={ciudadano} size="sm" />
            <Grupo title="Consejo Juvenil" personas={juvenil} size="sm" />
          </div>
        </Section>

      </div>
    </div>
  );
}
