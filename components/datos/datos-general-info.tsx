"use client";

import { HeartPulse, ShieldCheck, Wind } from "lucide-react";
import InfoTabs, { type InfoTab } from "@/components/datos/info-tabs";

// The "learn more" tabs that apply to every /datos chart (where the data
// comes from, what PM2.5/PM10 are, what they do to health), shown once in the page's top bar instead of
// repeated under each chart. Each chart keeps only its own methodology.
const TABS: InfoTab[] = [
  {
    id: "fuente",
    label: "Datos oficiales",
    icon: ShieldCheck,
    body: (
      <>
        Los datos de calidad del aire provienen de las estaciones de monitoreo
        del{" "}
        <a
          href="http://aire.nl.gob.mx"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
        >
          Sistema Integral de Monitoreo Ambiental (SIMA)
        </a>{" "}
        de Nuevo León.
      </>
    ),
  },
  {
    id: "contaminante",
    label: "Contaminantes",
    icon: Wind,
    body: (
      <>
        PM2.5 y PM10 son partículas en suspensión en el aire, de hasta 2.5 y
        10 micrómetros de diámetro respectivamente (las PM2.5, unas 30 veces
        más delgadas que un cabello humano).
      </>
    ),
  },
  {
    id: "salud",
    label: "Impacto en salud",
    icon: HeartPulse,
    body: (
      <>
        La exposición a PM2.5 y PM10 es dañina para la salud. A corto plazo,
        irritan oídos, ojos, nariz y garganta, y agravan el asma y la
        bronquitis; a largo plazo, se asocian con enfermedades
        cardiovasculares, respiratorias y cerebrovasculares, además de una
        menor esperanza de vida. Si quieres entender mejor cómo nos afecta,
        puedes consultar la siguiente{" "}
        <a
          href="/infografias/infografia_salud.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
        >
          infografía
        </a>
        .
      </>
    ),
  },
];

export default function DatosGeneralInfo() {
  return <InfoTabs tabs={TABS} />;
}
