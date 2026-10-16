import type { Metadata } from "next";
import Image from "next/image";
import { pageMetadata } from "@/lib/metadata";
import { EQUIPO } from "@/lib/equipo";
import { LINEAS, MISION, VISION } from "@/components/observatorio/quienes-somos-sections";

// Draft: Quiénes somos and Equipo on one page, in the layout Publicaciones
// set (left-aligned, bordered cards, small uppercase labels). Hidden while
// it's reviewed: no nav link, not in the sitemap, noindex. /quienes-somos and
// /equipo stay live.

const LEAD =
  "Somos una organización de la sociedad civil dedicada a generar esfuerzos colaborativos y fundamento técnico para mejorar la calidad del aire en Nuevo León.";

export const metadata: Metadata = {
  ...pageMetadata({ title: "Quiénes somos", description: LEAD, path: "/quienes-somos" }),
  robots: { index: false, follow: false },
};

const LABEL = "text-xs font-semibold uppercase leading-snug tracking-wide text-gray-500";
const SECTION_TITLE = "text-2xl font-semibold text-gray-800 md:text-3xl";
const CARD = "overflow-hidden rounded-2xl border border-gray-200 bg-white";

// By portrait key, in lib/equipo.ts's order. Guillermo Baillères and Andrea
// Villarreal are in no group yet, so not on the draft.
const OPERATIVO = ["selene", "yessica", "edgar"];
const JUVENIL = ["lucia", "juanpablo"];
const SIN_GRUPO = ["guillermo", "andrea"];
const enGrupo = (keys: string[]) => EQUIPO.filter((p) => keys.includes(p.image));
const operativo = enGrupo(OPERATIVO);
const juvenil = enGrupo(JUVENIL);
const ciudadano = EQUIPO.filter((p) => ![...OPERATIVO, ...JUVENIL, ...SIN_GRUPO].includes(p.image));

function Persona({ persona }: { persona: (typeof EQUIPO)[number] }) {
  return (
    <li className={`${CARD} flex items-center gap-4 p-4`}>
      <Image
        src={`/equipo/${persona.image}.webp`}
        alt=""
        width={160}
        height={160}
        className="h-20 w-20 shrink-0 rounded-xl object-cover"
      />
      <div className="min-w-0">
        <h4 className="text-base font-semibold leading-snug text-gray-800">{persona.name}</h4>
        <p className="mt-1 text-sm leading-snug text-gray-600">{persona.puesto}</p>
      </div>
    </li>
  );
}

function Grupo({ title, personas }: { title: string; personas: typeof EQUIPO }) {
  return (
    <section>
      <h3 className={LABEL}>{title}</h3>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {personas.map((persona) => (
          <Persona key={persona.image} persona={persona} />
        ))}
      </ul>
    </section>
  );
}

export default function QuienesSomos2() {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-24 pt-12 lg:px-8 lg:pb-32 lg:pt-20">
      <header className="max-w-4xl">
        <h1 className={LABEL}>Quiénes somos</h1>
        <p className="mt-3 text-2xl font-bold leading-tight text-gray-900 md:text-4xl">{LEAD}</p>
      </header>

      <div className="mt-16 flex flex-col gap-20 md:mt-24 md:gap-28">
        <div className="grid gap-6 md:grid-cols-2">
          {[
            { title: "Misión", text: MISION, image: "/quienes-somos/mision.webp" },
            { title: "Visión", text: VISION, image: "/quienes-somos/vision.webp" },
          ].map((item) => (
            <section key={item.title} className={CARD}>
              <Image
                src={item.image}
                alt=""
                width={1200}
                height={675}
                sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw"
                className="aspect-video w-full object-cover"
              />
              <div className="p-6">
                <h2 className={LABEL}>{item.title}</h2>
                <p className="mt-2 text-lg leading-relaxed text-gray-800">{item.text}</p>
              </div>
            </section>
          ))}
        </div>

        <section>
          <h2 className={SECTION_TITLE}>Líneas de trabajo</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {LINEAS.map((linea, i) => (
              <li key={linea.image} className={CARD}>
                <Image
                  src={linea.image}
                  alt=""
                  width={800}
                  height={600}
                  sizes="(min-width: 1280px) 400px, (min-width: 768px) 33vw, 100vw"
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="flex gap-3 p-5">
                  <span aria-hidden="true" className="text-lg font-semibold leading-snug text-gray-400">
                    {i + 1}.
                  </span>
                  <p className="text-lg font-semibold leading-snug text-gray-800">{linea.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className={SECTION_TITLE}>Equipo</h2>
          <div className="mt-8 flex flex-col gap-12">
            <Grupo title="Equipo operativo" personas={operativo} />
            <Grupo title="Consejo Ciudadano" personas={ciudadano} />
            <Grupo title="Consejo Juvenil" personas={juvenil} />
          </div>
        </section>
      </div>
    </div>
  );
}
