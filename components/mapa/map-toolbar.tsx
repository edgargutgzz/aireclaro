"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { ChevronRight, Info, Landmark, Layers, Users } from "lucide-react";
import { ScaleBar, LevelList, LegendNotes } from "./air-quality-legend";
import { LayerCheckbox } from "./layers-filter";

// The desktop map's toolbar (option A of the opened-state mockups,
// 2026-11-09): one glass piece at the bottom-left, beside the sidebar. The bar
// holds the air-quality scale and the Sensores button behind a hairline; either
// one unfolds a single panel out of the bar itself (same card, no gap), the
// active button shaded, and switching between the two swaps the panel's
// content in place. Mobile keeps its own buttons and bottom sheets.
//
// Sensores, flattened here: three sources (Gobierno, OCCAMM, Otros) instead of
// "Sensores Ciudadanos" with two hidden sub-rows, and the location as one
// native municipality select instead of a nested state / municipality list.
// Same filter state as mobile, so the URL (?src= / ?hide=) is unchanged.

type Estado = { key: string; label: string; count: number; municipios: { key: string; label: string; count: number }[] };

type Panel = "aire" | "sensores" | null;

export function MapToolbar({
  showSima,
  setShowSima,
  showOccamm,
  setShowOccamm,
  showOtros,
  setShowOtros,
  sourceCounts,
  estados,
  hiddenMunicipios,
  setHiddenMunicipios,
  onShowFuenteInfo,
}: {
  showSima: boolean;
  setShowSima: Dispatch<SetStateAction<boolean>>;
  showOccamm: boolean;
  setShowOccamm: Dispatch<SetStateAction<boolean>>;
  showOtros: boolean;
  setShowOtros: Dispatch<SetStateAction<boolean>>;
  sourceCounts: { occamm: number; otros: number; gobierno: number };
  estados: Estado[];
  hiddenMunicipios: string[];
  setHiddenMunicipios: Dispatch<SetStateAction<string[]>>;
  onShowFuenteInfo: () => void;
}) {
  const [open, setOpen] = useState<Panel>(null);
  const toggle = (p: Exclude<Panel, null>) => setOpen((cur) => (cur === p ? null : p));

  // Escape closes the panel, as it closes the station card.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const tab = (p: Exclude<Panel, null>) =>
    `transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900/15 ${open === p ? "bg-stone-900/[0.05]" : "hover:bg-stone-900/[0.03]"}`;

  return (
    <div className="glass pointer-events-auto flex min-h-0 w-full flex-col overflow-hidden rounded-2xl">
      {open && (
        // Only the panel scrolls, so a short window never pushes the bar off
        // the map; overscroll-contain keeps the scroll from panning the map.
        <div id="map-toolbar-panel" className="disclosure-in-up min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {open === "aire" ? (
            <div className="p-4">
              <LevelList />
              <LegendNotes className="mt-4" />
            </div>
          ) : (
            <SensoresPanel
              showSima={showSima}
              setShowSima={setShowSima}
              showOccamm={showOccamm}
              setShowOccamm={setShowOccamm}
              showOtros={showOtros}
              setShowOtros={setShowOtros}
              sourceCounts={sourceCounts}
              estados={estados}
              hiddenMunicipios={hiddenMunicipios}
              setHiddenMunicipios={setHiddenMunicipios}
              onShowFuenteInfo={onShowFuenteInfo}
            />
          )}
        </div>
      )}

      <div className={`flex flex-shrink-0 items-stretch ${open ? "border-t border-stone-900/10" : ""}`}>
        <button
          type="button"
          onClick={() => toggle("aire")}
          aria-expanded={open === "aire"}
          aria-controls={open === "aire" ? "map-toolbar-panel" : undefined}
          className={`flex min-w-0 flex-1 items-center gap-4 px-5 py-4 text-left ${tab("aire")}`}
        >
          <span className="flex-shrink-0 text-xs font-medium uppercase leading-none tracking-wide text-neutral-500">
            Calidad del aire
          </span>
          {/* Open, the bar shows the breaks, the axis for the list's bounds. */}
          <ScaleBar labels={open === "aire" ? "thresholds" : "ends"} className="min-w-0 flex-1" />
          {/* Points up, toward the panel it opens; flips down while open. */}
          <ChevronRight
            aria-hidden="true"
            className={`h-4 w-4 flex-shrink-0 text-neutral-400 transition-transform duration-200 ${open === "aire" ? "rotate-90" : "-rotate-90"}`}
          />
        </button>
        <span aria-hidden="true" className={`w-px flex-shrink-0 bg-stone-900/10 ${open ? "" : "my-3"}`} />
        <button
          type="button"
          onClick={() => toggle("sensores")}
          aria-expanded={open === "sensores"}
          aria-controls={open === "sensores" ? "map-toolbar-panel" : undefined}
          className={`flex flex-shrink-0 items-center gap-2 px-5 text-sm font-medium ${open === "sensores" ? "text-neutral-900" : "text-neutral-700"} ${tab("sensores")}`}
        >
          <Layers aria-hidden="true" className="h-5 w-5" />
          Sensores
        </button>
      </div>
    </div>
  );
}

function SensoresPanel({
  showSima,
  setShowSima,
  showOccamm,
  setShowOccamm,
  showOtros,
  setShowOtros,
  sourceCounts,
  estados,
  hiddenMunicipios,
  setHiddenMunicipios,
  onShowFuenteInfo,
}: Parameters<typeof MapToolbar>[0]) {
  const sources = [
    { key: "sima", label: "Estaciones de Gobierno", icon: Landmark, on: showSima, set: setShowSima, count: sourceCounts.gobierno },
    { key: "occamm", label: "OCCAMM", icon: Users, on: showOccamm, set: setShowOccamm, count: sourceCounts.occamm },
    { key: "otros", label: "Otros sensores ciudadanos", icon: Users, on: showOtros, set: setShowOtros, count: sourceCounts.otros },
  ];

  // The select shows one municipality or all of them. A ?hide= link with any
  // other mix reads as "Varios municipios" until a choice replaces it.
  const allKeys = estados.flatMap((e) => e.municipios.map((m) => m.key));
  const shown = allKeys.filter((k) => !hiddenMunicipios.includes(k));
  const value = hiddenMunicipios.length === 0 ? "" : shown.length === 1 ? shown[0] : "varios";
  const choose = (key: string) => setHiddenMunicipios(key === "" ? [] : allKeys.filter((k) => k !== key));

  return (
    <div className="p-4">
      <div className="flex items-center gap-1 px-1 pb-3">
        <span className="text-xs font-medium uppercase leading-none tracking-wide text-neutral-500">Fuente</span>
        <button
          type="button"
          onClick={onShowFuenteInfo}
          aria-label="Más información sobre las fuentes de datos"
          className="-my-1 rounded-xl p-1.5 text-neutral-400 transition-colors hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
        >
          <Info aria-hidden="true" className="h-3 w-3" />
        </button>
      </div>
      {/* The legend's grouped-list card, so both panels share one material. */}
      <ul className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        {sources.map(({ key, label, icon: Icon, on, set, count }) => (
          <li key={key} className="border-t border-stone-100 first:border-t-0">
            <button
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => set((v) => !v)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900/15"
            >
              <LayerCheckbox state={on ? "checked" : "unchecked"} size={18} />
              <Icon aria-hidden="true" className={`h-4 w-4 flex-shrink-0 ${on ? "text-neutral-500" : "text-neutral-300"}`} />
              <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${on ? "text-neutral-900" : "text-neutral-400"}`}>{label}</span>
              <span className="flex-shrink-0 text-sm tabular-nums text-neutral-500">{count}</span>
            </button>
          </li>
        ))}
      </ul>

      <label htmlFor="map-toolbar-municipio" className="block px-1 pb-3 pt-5 text-xs font-medium uppercase leading-none tracking-wide text-neutral-500">
        Ubicación
      </label>
      <div className="relative">
        <select
          id="map-toolbar-municipio"
          value={value}
          onChange={(e) => choose(e.target.value)}
          className="w-full appearance-none rounded-xl border border-stone-200 bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
        >
          <option value="">Todos los municipios</option>
          {value === "varios" && <option value="varios" disabled>Varios municipios</option>}
          {estados.map((estado) => (
            <optgroup key={estado.key} label={estado.label}>
              {estado.municipios.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label} ({m.count})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronRight aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-neutral-400" />
      </div>
    </div>
  );
}
