"use client";

import { useState } from "react";
import { Heart, MapPin, Wind, ChevronDown } from "lucide-react";

const features = [
  {
    icon: Heart,
    title: "Recomendaciones de salud",
    description: (
      <>
        Recomendaciones oficiales según el Índice de Aire y Salud{" "}
        <a href="https://dof.gob.mx/nota_detalle.php?codigo=5715154&fecha=25/01/2024#gsc.tab=0" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-gray-600 hover:text-gray-800">NOM-172-SEMARNAT-2023</a>
        , para la población general y grupos sensibles.
      </>
    ),
  },
  {
    icon: MapPin,
    title: "Todos los sensores",
    description: (
      <>
        Combinamos estaciones oficiales{" "}
        <a href="https://aire.nl.gob.mx/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-gray-600 hover:text-gray-800">SIMA</a>{" "}
        y sensores ciudadanos{" "}
        <a href="https://www.purpleair.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-gray-600 hover:text-gray-800">PurpleAir</a>{" "}
        para darte la cobertura más completa.
      </>
    ),
  },
  {
    icon: Wind,
    title: "El contaminante más peligroso",
    description: "PM2.5, actualizado cada hora: la partícula más dañina para tu salud.",
  },
];

export default function Questions() {
  const [openMobile, setOpenMobile] = useState<string | null>(null);
  const [openDesktop, setOpenDesktop] = useState<string | null>(null);

  return (
    <>
      {/* Mobile: dropdown list, matching the mapa section's expandable rows */}
      <div className="flex flex-col gap-3 px-4 md:hidden">
        {features.map(({ icon: Icon, title, description }) => {
          const isOpen = openMobile === title;
          return (
            <div key={title}>
              <button
                onClick={() => setOpenMobile(isOpen ? null : title)}
                className="flex w-full items-center justify-between gap-3 py-3.5 pr-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Icon className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span className="truncate text-sm font-normal text-gray-600">{title}</span>
                </div>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="pb-4 pl-7">
                  <p className="text-sm leading-relaxed text-gray-600">{description}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: dropdown list, matching the mobile version above */}
      <div className="hidden flex-col gap-3 px-4 md:flex">
        {features.map(({ icon: Icon, title, description }) => {
          const isOpen = openDesktop === title;
          return (
            <div key={title}>
              <button
                onClick={() => setOpenDesktop(isOpen ? null : title)}
                className="flex w-full items-center justify-between gap-3 py-3.5 pr-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Icon className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span className="truncate text-sm font-normal text-gray-600">{title}</span>
                </div>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="pb-4 pl-7">
                  <p className="text-sm leading-relaxed text-gray-600">{description}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
