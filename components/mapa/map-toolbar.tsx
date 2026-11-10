"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { ChevronRight, Info, Landmark, Users } from "lucide-react";
import { ScaleBar, LevelList, LegendNotes } from "./air-quality-legend";
import { LayerCheckbox } from "./layers-filter";

// The desktop map's toolbar (option A of the opened-state mockups,
// 2026-11-09): the foot of the desktop sidebar since 2026-11-10. The bar
// holds the air-quality scale and the Sensores button behind a hairline; either
// one unfolds a single panel out of the bar itself (same card, no gap), the
// active button shaded, and switching between the two swaps the panel's
// content in place. Mobile keeps its own buttons and bottom sheets.
//
// Sensores: Gobierno, then Sensores Ciudadanos with OCCAMM and Otros always
// shown under it (no hidden sub-rows, 2026-11-09), and the location as one
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
  sourceCounts: { occamm: number; otros: number; ciudadanos: number; gobierno: number };
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
    // Docked as the sidebar's foot (2026-11-10): no glass of its own (the
    // sidebar's is the surface), a hairline above it, and the open panel
    // capped at 70% of the sidebar so the air card above stays in view.
    <div className="flex max-h-[70%] min-h-0 w-full flex-shrink-0 flex-col border-t border-stone-900/10">
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
        {/* Closed-bar option D (2026-11-09): both halves share one shape, the
            label on top and a small key to the map below it: the level scale
            here, the two sources with their counts on the right. */}
        <button
          type="button"
          onClick={() => toggle("aire")}
          aria-expanded={open === "aire"}
          aria-controls={open === "aire" ? "map-toolbar-panel" : undefined}
          className={`flex min-w-0 flex-1 flex-col gap-2.5 px-5 py-3.5 text-left ${tab("aire")}`}
        >
          <span className="text-xs font-medium uppercase leading-none tracking-wide text-neutral-500">
            Calidad del aire
          </span>
          {/* Open, the bar shows the breaks, the axis for the list's bounds. */}
          <ScaleBar labels={open === "aire" ? "thresholds" : "ends"} />
        </button>
        <span aria-hidden="true" className={`w-px flex-shrink-0 bg-stone-900/10 ${open ? "" : "my-3"}`} />
        <button
          type="button"
          onClick={() => toggle("sensores")}
          aria-expanded={open === "sensores"}
          aria-controls={open === "sensores" ? "map-toolbar-panel" : undefined}
          className={`flex flex-shrink-0 flex-col gap-2.5 px-5 py-3.5 text-left ${tab("sensores")}`}
        >
          <span className="text-xs font-medium uppercase leading-none tracking-wide text-neutral-500">
            Sensores
          </span>
          {/* The map's two source icons and their counts; a source switched
              off in the panel fades here too, so the bar says the map is
              filtered without opening it. */}
          <span className="flex items-center gap-4 text-[13px] leading-none tabular-nums text-neutral-600">
            <span className={`flex items-center gap-1.5 ${showSima ? "" : "opacity-40"}`}>
              <Landmark aria-hidden="true" className="h-3.5 w-3.5" />
              <span className="sr-only">Estaciones de Gobierno:</span>
              {sourceCounts.gobierno}
            </span>
            <span className={`flex items-center gap-1.5 ${showOccamm || showOtros ? "" : "opacity-40"}`}>
              <Users aria-hidden="true" className="h-3.5 w-3.5" />
              <span className="sr-only">Sensores Ciudadanos:</span>
              {sourceCounts.ciudadanos}
            </span>
          </span>
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
  // Sensores Ciudadanos is the parent of its two networks: its box checks or
  // clears both, and reads as mixed when only one is on.
  const citizen = showOccamm && showOtros ? "checked" : !showOccamm && !showOtros ? "unchecked" : "indeterminate";
  const toggleCitizen = () => {
    const next = citizen !== "checked";
    setShowOccamm(next);
    setShowOtros(next);
  };
  const rows: { label: string; icon?: typeof Users; state: CheckState; onClick: () => void; count: number; child?: boolean }[] = [
    { label: "Estaciones de Gobierno", icon: Landmark, state: showSima ? "checked" : "unchecked", onClick: () => setShowSima((v) => !v), count: sourceCounts.gobierno },
    { label: "Sensores Ciudadanos", icon: Users, state: citizen, onClick: toggleCitizen, count: sourceCounts.ciudadanos },
    { label: "OCCAMM", state: showOccamm ? "checked" : "unchecked", onClick: () => setShowOccamm((v) => !v), count: sourceCounts.occamm, child: true },
    { label: "Otros", state: showOtros ? "checked" : "unchecked", onClick: () => setShowOtros((v) => !v), count: sourceCounts.otros, child: true },
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
      {/* Lista de fuentes option A (2026-11-09): one card per source, the
          legend's grouped-list material. Ciudadanos keeps its two networks
          under its own row on a pale ground, no dividers, smaller type, their
          boxes under the parent's icon so every box sits on one of two rails. */}
      <div className="flex flex-col gap-2">
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <SourceRow {...rows[0]} />
        </div>
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <SourceRow {...rows[1]} />
          <div role="group" aria-label="Redes de sensores ciudadanos" className="border-t border-stone-100 bg-stone-50 py-1">
            <SourceRow {...rows[2]} />
            <SourceRow {...rows[3]} />
          </div>
        </div>
      </div>

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

type CheckState = "checked" | "unchecked" | "indeterminate";

// One source as a checkbox row. `child`: a network under Sensores Ciudadanos,
// smaller, its box under the parent's icon (16 + 18 + 12 = pl-[46px]).
function SourceRow({ label, icon: Icon, state, onClick, count, child }: { label: string; icon?: typeof Users; state: CheckState; onClick: () => void; count: number; child?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === "indeterminate" ? "mixed" : state === "checked"}
      onClick={onClick}
      className={`flex w-full items-center gap-3 pr-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900/15 ${child ? "py-2 pl-[46px] hover:bg-stone-100" : "py-3 pl-4 hover:bg-stone-50"}`}
    >
      <LayerCheckbox state={state} size={child ? 16 : 18} />
      {Icon && <Icon aria-hidden="true" className={`h-4 w-4 flex-shrink-0 ${state === "unchecked" ? "text-neutral-300" : "text-neutral-500"}`} />}
      <span className={`min-w-0 flex-1 truncate ${child ? "text-[13px] font-medium" : "text-sm font-semibold"} ${state === "unchecked" ? "text-neutral-400" : child ? "text-neutral-600" : "text-neutral-900"}`}>{label}</span>
      <span className={`flex-shrink-0 tabular-nums text-neutral-500 ${child ? "text-[13px]" : "text-sm"}`}>{count}</span>
    </button>
  );
}
