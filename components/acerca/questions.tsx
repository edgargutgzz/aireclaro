"use client";

import { useState } from "react";
import { MapPin, Wind, Download, Smartphone, ChevronDown } from "lucide-react";

const features = [
  {
    icon: MapPin,
    title: "Enfocado en Monterrey",
    description: (
      <>
        Cobertura local completa combinando estaciones oficiales{" "}
        <a href="https://aire.nl.gob.mx/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">SIMA</a>{" "}
        y sensores ciudadanos{" "}
        <a href="https://www.purpleair.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">PurpleAir</a>.
      </>
    ),
  },
  {
    icon: Wind,
    title: "PM2.5 en tiempo real",
    description: "El contaminante más dañino para tu salud, actualizado cada hora.",
  },
  {
    icon: Download,
    title: "Datos abiertos",
    description: (
      <>
        Historial completo disponible en{" "}
        <a href="https://datamx.io/dataset/calidad-del-aire-en-la-zona-metropolitana-de-monterrey" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">datamx.io</a>.
      </>
    ),
  },
  {
    icon: Smartphone,
    title: "Acceso rápido",
    description: (
      <>
        <a href="https://www.youtube.com/shorts/dx0NLeoR3cs" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Agrégalo a tu pantalla</a>{" "}
        de inicio como una app.
      </>
    ),
  },
];

export default function Questions() {
  const [flipped, setFlipped] = useState<string | null>(null);
  const [openMobile, setOpenMobile] = useState<string | null>(null);

  return (
    <>
      {/* Mobile: dropdown list, matching the mapa section's expandable rows */}
      <div className="flex flex-col gap-3 md:hidden">
        {features.map(({ icon: Icon, title, description }) => {
          const isOpen = openMobile === title;
          return (
            <div key={title} className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <button
                onClick={() => setOpenMobile(isOpen ? null : title)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gray-50">
                    <Icon className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                  <span className="truncate text-sm font-medium text-gray-600">{title}</span>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 text-gray-300 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="px-4 pb-4">
                  <div className="rounded-xl bg-gray-50 px-4 py-3">
                    <p className="text-sm leading-relaxed text-gray-600">{description}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: horizontally scrollable flip cards */}
      <div className="-mx-4 hidden overflow-x-auto md:block">
        <div className="flex gap-3 px-4 pb-4">
          {features.map(({ icon: Icon, title, description }) => {
            const isFlipped = flipped === title;
            return (
              <div
                key={title}
                onClick={() => setFlipped(isFlipped ? null : title)}
                className="w-52 flex-shrink-0 cursor-pointer"
                style={{ perspective: "1000px", height: "160px" }}
              >
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    transformStyle: "preserve-3d",
                    transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  {/* Front */}
                  <div
                    className="absolute inset-0 flex flex-col justify-end rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50">
                      <Icon className="h-4 w-4 text-gray-500" />
                    </div>
                    <p className="text-sm font-semibold text-gray-500">{title}</p>
                    {!isFlipped && <p className="mt-1 text-xs text-gray-400">Toca para saber más</p>}
                  </div>

                  {/* Back */}
                  <div
                    className="absolute inset-0 flex flex-col justify-center rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                  >
                    <p className="text-sm leading-relaxed text-gray-600">{description}</p>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="w-1 flex-shrink-0" />
        </div>
      </div>
    </>
  );
}
