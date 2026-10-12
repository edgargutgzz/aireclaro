import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import Image from "next/image";
import PageShell from "@/components/observatorio/page-shell";
import { EQUIPO } from "@/lib/equipo";

// Ported from observatoriodelaire.com/equipo: same people, photos and card
// grid. Fixed on the way over: two typos in the puestos ("Extema",
// "Cardiopulmunar"), and the cards no longer lift on hover, since they aren't
// links and the lift read as clickable.

const LEAD =
  "Conoce al equipo detrás del Observatorio del Aire, comprometido con un aire más limpio.";

export const metadata: Metadata = pageMetadata({
  title: "Equipo",
  description: LEAD,
  path: "/equipo",
});


export default function Equipo() {
  return (
    <PageShell title="Equipo" lead={LEAD}>
      <ul className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-x-8 md:gap-y-20">
        {EQUIPO.map((persona) => (
          <li
            key={persona.image}
            className="flex flex-col items-center justify-center rounded-xl bg-white p-6 text-center shadow-lg"
          >
            <Image
              src={`/equipo/${persona.image}.webp`}
              alt={persona.name}
              width={288}
              height={288}
              className="h-36 w-36 rounded-xl object-cover"
            />
            <h2 className="pt-5 text-lg font-semibold text-gray-800">{persona.name}</h2>
            <p className="pt-1.5 text-sm leading-relaxed text-gray-600">
              {persona.puesto}
            </p>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
