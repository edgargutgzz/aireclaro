"use client";

import { useState } from "react";
import { MapPin, Wind, Download, Smartphone } from "lucide-react";

const features = [
  {
    icon: MapPin,
    title: "Enfocado en Monterrey",
    description: (
      <>
        Cobertura local completa combinando estaciones oficiales{" "}
        <a href="https://aire.nl.gob.mx/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          SIMA
        </a>{" "}
        y sensores ciudadanos{" "}
        <a href="https://www.purpleair.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          PurpleAir
        </a>
        .
      </>
    ),
  },
  {
    icon: Wind,
    title: "PM2.5 en tiempo real",
    description: (
      <>
        Medimos el contaminante más dañino para tu salud con base en el{" "}
        <a href="https://dof.gob.mx/nota_detalle.php?codigo=5715154&fecha=25/01/2024#gsc.tab=0" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          Índice de Aire y Salud
        </a>{" "}
        mexicano (NOM-172-SEMARNAT-2023).
      </>
    ),
  },
  {
    icon: Download,
    title: "Datos abiertos",
    description: (
      <>
        Descarga el historial completo de mediciones en{" "}
        <a href="https://datamx.io/dataset/calidad-del-aire-en-la-zona-metropolitana-de-monterrey" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          datamx.io
        </a>
        .
      </>
    ),
  },
  {
    icon: Smartphone,
    title: "Acceso rápido desde tu celular",
    description: (
      <>
        Agrega un ícono a tu pantalla de inicio para consultarlo como una app.{" "}
        <a href="https://www.youtube.com/shorts/dx0NLeoR3cs" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          Ver cómo hacerlo
        </a>
        .
      </>
    ),
  },
];

export default function Questions() {
  const [openCard, setOpenCard] = useState<string | null>(null);

  return (
    <div className="-mx-4 overflow-x-auto">
      <div className="flex gap-3 px-4 pb-2">
        {features.map(({ icon: Icon, title, description }) => {
          const isOpen = openCard === title;
          return (
            <div
              key={title}
              onClick={() => setOpenCard(isOpen ? null : title)}
              className="w-56 flex-shrink-0 cursor-pointer rounded-xl bg-gray-50 px-4 py-6 transition-colors"
            >
              <div className="mb-2 flex items-center gap-2.5">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                  <Icon className="h-3.5 w-3.5 text-gray-600" />
                </div>
                <p className="text-sm font-semibold text-gray-800">{title}</p>
              </div>
              {isOpen && (
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{description}</p>
              )}
            </div>
          );
        })}
        <div className="w-1 flex-shrink-0" />
      </div>
    </div>
  );
}
