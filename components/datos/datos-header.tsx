"use client";

import { useId, useState } from "react";
import { GENERAL_TABS } from "@/components/datos/datos-general-info";
import HorizontalScrollFade from "@/components/datos/horizontal-scroll-fade";

// The dashboard's top panel, laid out like a chart card's header: title,
// what the data is and its period/cadence on the left, the "about the data"
// buttons (source, methodology, pollutants, health) on the right in the chart
// headers' tinted h-8 shape. A button opens its text inside the panel, dark
// while open, the same as a chart's Metodología. Below lg the buttons sit
// under the title and slide sideways when they don't fit.
export default function DatosHeader({ descripcion, periodo }: { descripcion: string; periodo: string | null }) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const panelId = useId();
  const tab = GENERAL_TABS.find((t) => t.id === abierta);

  return (
    <header className="mb-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-neutral-800">Datos de calidad del aire</h1>
          <p className="mt-1 text-xs text-neutral-500 md:text-sm">{descripcion}</p>
          <p className="mt-1 text-xs text-neutral-500 md:text-sm">
            {periodo && (
              <>
                <span className="whitespace-nowrap">
                  Periodo <span className="font-medium text-neutral-700">{periodo}</span>
                </span>
                <span className="px-2 text-neutral-300" aria-hidden>
                  ·
                </span>
              </>
            )}
            <span className="whitespace-nowrap">
              Actualización <span className="font-medium text-neutral-700">mensual</span>
            </span>
          </p>
        </div>
        <div className="-mx-5 lg:mx-0 lg:shrink-0">
          <HorizontalScrollFade minWidth={0}>
            <div className="flex w-max items-center gap-2 px-5 lg:px-0">
              {GENERAL_TABS.map(({ id, label, icon: Icon }) => {
                const open = abierta === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAbierta(open ? null : id)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    className={`flex h-8 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15 ${
                      open
                        ? "bg-stone-800 text-white hover:bg-stone-700"
                        : "bg-stone-100 text-neutral-600 hover:bg-stone-200/70 hover:text-neutral-700"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {label}
                  </button>
                );
              })}
            </div>
          </HorizontalScrollFade>
        </div>
      </div>
      {tab && (
        <div className="px-5 pb-4">
          <div id={panelId} className="rounded-2xl border border-stone-100 bg-stone-50 px-5 py-4">
            <div className="text-sm leading-relaxed text-neutral-600">{tab.body}</div>
          </div>
        </div>
      )}
    </header>
  );
}
