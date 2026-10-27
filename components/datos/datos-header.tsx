"use client";

import { useId, useState } from "react";
import { ArrowDownToLine } from "lucide-react";
import { GENERAL_TABS } from "@/components/datos/datos-general-info";

// The dashboard's top panel: title and the data's period/cadence with the
// download button on the right (it jumps to #descarga), then a tab
// bar along its foot for the "about the data" texts (source, methodology,
// pollutants, health). Plain text tabs, not pills, so they read as the
// page's reference navigation rather than more chart controls: the open one
// is darker and underlined, and its text opens right under the bar.
// Clicking the open tab closes it. Below lg the bar scrolls sideways; from lg it's a plain row (no scroller,
// which made hovers flicker before).
export default function DatosHeader({ periodo }: { periodo: string | null }) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const panelId = useId();
  const tab = GENERAL_TABS.find((t) => t.id === abierta);

  return (
    <header className="mb-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="flex flex-col gap-3 px-5 pb-3 pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-neutral-800">Calidad del aire en la Zona Metropolitana de Monterrey</h1>
          <p className="mt-1 text-xs text-neutral-500 md:text-sm">
            {periodo && (
              <>
                <span className="whitespace-nowrap">
                  Periodo <span className="font-medium text-neutral-700">{periodo}</span>
                </span>{" "}
                <span className="px-1 text-neutral-300" aria-hidden>
                  ·
                </span>{" "}
              </>
            )}
            <span className="whitespace-nowrap">
              Actualización <span className="font-medium text-neutral-700">mensual</span>
            </span>
          </p>
        </div>
        {/* The page's main action: jumps to the download card at the foot. */}
        <a
          href="#descarga"
          className="flex h-10 w-fit shrink-0 items-center gap-1.5 rounded-xl bg-stone-800 px-4 text-sm font-medium text-white transition-colors hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
        >
          <ArrowDownToLine className="h-4 w-4" aria-hidden />
          Descargar datos
        </a>
      </div>
      <nav aria-label="Sobre los datos" className="overflow-x-auto lg:overflow-visible">
        <div className="flex w-max gap-6 px-5">
          {GENERAL_TABS.map(({ id, label, icon: Icon }) => {
            const open = abierta === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setAbierta(open ? null : id)}
                aria-expanded={open}
                aria-controls={panelId}
                className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 pb-2.5 pt-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15 ${
                  open
                    ? "border-stone-800 text-neutral-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            );
          })}
        </div>
      </nav>
      {tab && (
        <div id={panelId} className="border-t border-stone-100 bg-stone-50/60 px-5 py-4">
          <div className="max-w-3xl text-sm leading-relaxed text-neutral-600">{tab.body}</div>
        </div>
      )}
    </header>
  );
}
