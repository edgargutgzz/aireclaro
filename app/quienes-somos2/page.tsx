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
// the líneas (no stock photos); the only pictures are the city and the team,
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
// Hand-ordered so every row has at least one woman at both the 3- and the
// 4-column grid (positions 2, 6, 8 and 11). Re-check when the list changes.
const CIUDADANO = [
  "uriel", "rosario", "adrian", "carlos",
  "gerardo", "roberta", "cosijopii", "maria",
  "rodolfo", "horacio", "ana", "lorenzo",
];
const ciudadano = CIUDADANO.map((key) => EQUIPO.find((p) => p.image === key)!);

type Persona = (typeof EQUIPO)[number];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-t border-gray-200 py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] md:gap-12 md:py-16">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
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
    <div className="mx-auto max-w-7xl px-6 pb-24 pt-4 lg:px-8 lg:pb-32 lg:pt-8">
      {/* Hero: the photo carries the page's first impression, the text sits on
          a scrim rising from the bottom so it stays legible on the bright sky. */}
      <header className="relative flex min-h-[30rem] items-end overflow-hidden rounded-2xl bg-gray-900 md:min-h-[34rem]">
        <Image
          src="/quienes-somos/portada.webp"
          alt=""
          fill
          sizes="(min-width: 1280px) 1216px, 100vw"
          preload
          className="object-cover object-[center_65%]"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
        <div className="relative max-w-4xl p-6 md:p-12">
          <h1 className="text-xs font-semibold uppercase leading-snug tracking-wide text-white/80">Quiénes somos</h1>
          <p className="mt-3 text-2xl font-bold leading-tight text-white md:text-4xl">{LEAD}</p>
          <p className="mt-5 text-sm text-white/80">
            Organización de la sociedad civil · Monterrey, Nuevo León · Desde 2017
          </p>
        </div>
      </header>

      <div className="mt-8 md:mt-12">
        <Section title="Propósito">
          <div className="grid gap-10 md:grid-cols-2">
            {[
              { title: "Misión", text: MISION },
              { title: "Visión", text: VISION },
            ].map((item) => (
              <div key={item.title}>
                <h3 className={LABEL}>{item.title}</h3>
                <p className="mt-3 text-lg leading-relaxed text-gray-800">{item.text}</p>
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
