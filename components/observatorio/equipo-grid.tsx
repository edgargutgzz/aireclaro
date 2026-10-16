import Image from "next/image";
import { EQUIPO } from "@/lib/equipo";

// The team's card grid. The cards aren't links, so they don't lift on hover.
// `heading` is the level of each person's name: h2 on its own page, h3 under
// a section heading.
export function EquipoGrid({ heading: Heading = "h2" }: { heading?: "h2" | "h3" }) {
  return (
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
          <Heading className="pt-5 text-lg font-semibold text-gray-800">{persona.name}</Heading>
          <p className="pt-1.5 text-sm leading-relaxed text-gray-600">
            {persona.puesto}
          </p>
        </li>
      ))}
    </ul>
  );
}
