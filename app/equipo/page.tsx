import type { Metadata } from "next";
import Image from "next/image";
import PageShell from "@/components/observatorio/page-shell";

// Ported from observatoriodelaire.com/equipo: same people, photos and card
// grid. Fixed on the way over: two typos in the puestos ("Extema",
// "Cardiopulmunar"), and the cards no longer lift on hover, since they aren't
// links and the lift read as clickable.

const LEAD =
  "Conoce al equipo detrás del Observatorio del Aire, comprometido con un aire más limpio.";

export const metadata: Metadata = {
  title: "Equipo",
  description: LEAD,
};

const EQUIPO = [
  { name: "Rosario Álvarez", image: "rosario", puesto: "Directora de Pronatura Noreste A.C." },
  { name: "Guillermo Baillères", image: "guillermo", puesto: "Director General de Energías Limpias de México" },
  { name: "Lucía Barrera", image: "lucia", puesto: "Miembro del Consejo Juvenil del OCCAMM" },
  { name: "Uriel Chavarría", image: "uriel", puesto: "Coord. Médico de Transplante Pulmonar del Hospital Universitario de la UANL" },
  { name: "Juan Pablo Chávez", image: "juanpablo", puesto: "Miembro del Consejo Juvenil del OCCAMM" },
  { name: "Roberta Clariond", image: "roberta", puesto: "Profesora de la Escuela de Ciencias Sociales y Gobierno del ITESM" },
  { name: "María Enriquez", image: "maria", puesto: "Presidenta del Comité Ecológico Integral" },
  { name: "Adrian Fernandez", image: "adrian", puesto: "Director Ejecutivo y Fundador de la Iniciativa Climática de México" },
  { name: "Ana Cristina García Luna", image: "ana", puesto: "Profesora e investigadora en el área de arquitectura, urbanismo y sustentabilidad" },
  { name: "Carlos Gomez", image: "carlos", puesto: "Ecologista, Historiador y Director de Mundo Sustentable A.C." },
  { name: "Selene M. Guajardo", image: "selene", puesto: "Directora Ejecutiva del OCCAMM" },
  { name: "Yessica Guajardo", image: "yessica", puesto: "Asistente de Dirección del OCCAMM" },
  { name: "Edgar Gutiérrez", image: "edgar", puesto: "Miembro del Consejo Juvenil del OCCAMM" },
  { name: "Gerardo Mejía", image: "gerardo", puesto: "Ex-Profesor del Departamento de Tecnologías Sostenibles del ITESM" },
  { name: "Cosijopii Montero", image: "cosijopii", puesto: "Director de Reforestación Extrema A.C." },
  { name: "Rodolfo Posadas", image: "rodolfo", puesto: "Responsable de Rehabilitación Cardiopulmonar en Doctors Hospital" },
  { name: "Horacio Riojas", image: "horacio", puesto: "Director de Salud Ambiental del Instituto Nacional de Salud Pública" },
  { name: "Lorenzo de Rosenzweig", image: "lorenzo", puesto: "Director y Fundador de Terra Habitus A.C." },
  { name: "Andrea Villarreal", image: "andrea", puesto: "Documentalista y Gestora Cultural" },
];

export default function Equipo() {
  return (
    <PageShell title="Equipo" lead={LEAD}>
      <ul className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-x-8 md:gap-y-20">
        {EQUIPO.map((persona) => (
          <li
            key={persona.image}
            className="flex flex-col items-center justify-center rounded-lg bg-white p-6 text-center shadow-lg"
          >
            <Image
              src={`/equipo/${persona.image}.webp`}
              alt={persona.name}
              width={288}
              height={288}
              className="h-36 w-36 rounded-lg object-cover"
            />
            <h2 className="pt-5 text-lg font-semibold">{persona.name}</h2>
            <p className="pt-1.5 text-sm leading-relaxed text-gray-600">
              {persona.puesto}
            </p>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
