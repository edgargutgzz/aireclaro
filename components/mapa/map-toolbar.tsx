"use client";

import { useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Check, ChevronRight, Landmark, MapPin, Users } from "lucide-react";
import { ScaleBar, LevelList, LegendNotes } from "./air-quality-legend";
import { LayerCheckbox } from "./layers-filter";
import { DialogLink } from "./info-dialog";
import { AdviceText } from "./station-card";

// The desktop map's toolbar (option A of the opened-state mockups,
// 2026-11-09): one glass piece at the bottom-left, beside the sidebar. The bar
// holds the air-quality scale and the Sensores button behind a hairline; either
// one unfolds a single panel out of the bar itself (same card, no gap), the
// active button shaded, and switching between the two swaps the panel's
// content in place. Mobile keeps its own buttons and bottom sheets.
//
// Sensores: Gobierno, then Sensores Ciudadanos with OCCAMM and Otros always
// shown under it (no hidden sub-rows, 2026-11-09). Ubicación, its own button
// since 2026-11-10: one list of municipalities grouped by state, a single
// choice.
// Same filter state as mobile, so the URL (?src= / ?hide=) is unchanged.

type Estado = { key: string; label: string; count: number; municipios: { key: string; label: string; count: number }[] };

type Panel = "aire" | "sensores" | "ubicacion" | null;

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
}) {
  const [open, setOpen] = useState<Panel>(null);
  const toggle = (p: Exclude<Panel, null>) => setOpen((cur) => (cur === p ? null : p));

  // Escape closes the panel, as it closes the station card; so does a click
  // anywhere outside the toolbar (2026-11-10), except inside an open dialog
  // (the Fuente info opens one from the panel).
  const rootRef = useRef<HTMLDivElement>(null);

  // Any open panel that has more below its fold fades out at the bottom
  // edge; the fade goes once it is scrolled to the end.
  const panelRef = useRef<HTMLDivElement>(null);
  const [moreBelow, setMoreBelow] = useState(false);
  const checkMoreBelow = () => {
    const el = panelRef.current;
    setMoreBelow(!!el && el.scrollHeight - el.scrollTop - el.clientHeight > 1);
  };
  useLayoutEffect(checkMoreBelow, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target || rootRef.current?.contains(target) || target.closest("dialog[open]")) return;
      setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const tab = (p: Exclude<Panel, null>) =>
    `transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900/15 ${open === p ? "bg-stone-900/[0.05]" : "hover:bg-stone-900/[0.03]"}`;

  return (
    <div ref={rootRef} className="glass pointer-events-auto flex min-h-0 w-full flex-col overflow-hidden rounded-2xl">
      {open && (
        // Only the panel scrolls, so a short window never pushes the bar off
        // the map; overscroll-contain keeps the scroll from panning the map.
        <div
          ref={panelRef}
          id="map-toolbar-panel"
          onScroll={checkMoreBelow}
          className="disclosure-in-up min-h-0 flex-1 overflow-y-auto overscroll-contain"
          // Ubicación is capped too (2026-11-10): the list of municipalities
          // never needs the whole column; the rest scrolls under the fade.
          style={open === "ubicacion" ? { maxHeight: 360 } : undefined}
        >
          {open === "aire" ? (
            <div className="p-4">
              <LevelList />
            </div>
          ) : open === "ubicacion" ? (
            <UbicacionPanel estados={estados} hiddenMunicipios={hiddenMunicipios} setHiddenMunicipios={setHiddenMunicipios} onChosen={() => setOpen(null)} />
          ) : (
            <SensoresPanel
              showSima={showSima}
              setShowSima={setShowSima}
              showOccamm={showOccamm}
              setShowOccamm={setShowOccamm}
              showOtros={showOtros}
              setShowOtros={setShowOtros}
              sourceCounts={sourceCounts}
            />
          )}
          {/* Sticky to the panel's bottom edge, taking no space of its own. */}
          {moreBelow && (
            <div aria-hidden="true" className="pointer-events-none sticky bottom-0 -mt-10 h-10 bg-gradient-to-t from-white to-white/0" />
          )}
        </div>
      )}
      {/* The legend's notes, pinned under the level list outside the scroll
          (2026-11-10), like the sidebar's footnote. */}
      {open === "aire" && (
        <div className="flex-shrink-0 px-4 pb-5">
          <LegendNotes />
        </div>
      )}
      {/* What each source is, pinned the same way (2026-11-10, it was an
          info icon opening the Fuente dialog, which mobile keeps). */}
      {open === "sensores" && (
        <div className="flex-shrink-0 px-4 pb-5">
          <SourceNotes />
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
        <span aria-hidden="true" className={`w-px flex-shrink-0 bg-stone-900/10 ${open ? "" : "my-3"}`} />
        {/* Ubicación as its own button (2026-11-10, it was the foot of the
            Sensores panel): the closed bar names the municipality shown. */}
        <button
          type="button"
          onClick={() => toggle("ubicacion")}
          aria-expanded={open === "ubicacion"}
          aria-controls={open === "ubicacion" ? "map-toolbar-panel" : undefined}
          className={`flex flex-shrink-0 flex-col gap-2.5 px-5 py-3.5 text-left ${tab("ubicacion")}`}
        >
          <span className="text-xs font-medium uppercase leading-none tracking-wide text-neutral-500">
            Ubicación
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] leading-none text-neutral-600">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
            {municipioLabel(estados, hiddenMunicipios)}
          </span>
        </button>
      </div>
    </div>
  );
}

// The municipality the map shows: one, all of them, or a ?hide= mix.
function municipioValue(estados: Estado[], hiddenMunicipios: string[]) {
  const allKeys = estados.flatMap((e) => e.municipios.map((m) => m.key));
  const shown = allKeys.filter((k) => !hiddenMunicipios.includes(k));
  const value = hiddenMunicipios.length === 0 ? "" : shown.length === 1 ? shown[0] : "varios";
  return { allKeys, value };
}

function municipioLabel(estados: Estado[], hiddenMunicipios: string[]) {
  const { value } = municipioValue(estados, hiddenMunicipios);
  if (value === "") return "Todos";
  if (value === "varios") return "Varios";
  return estados.flatMap((e) => e.municipios).find((m) => m.key === value)?.label ?? "Todos";
}

function UbicacionPanel({
  estados,
  hiddenMunicipios,
  setHiddenMunicipios,
  onChosen,
}: Pick<Parameters<typeof MapToolbar>[0], "estados" | "hiddenMunicipios" | "setHiddenMunicipios"> & { onChosen: () => void }) {
  // One municipality or all of them, as a list in the Sensores panel's card
  // material (2026-11-10, it was a native select whose OS popup broke the
  // panel's look). A ?hide= link with any other mix checks no row until a
  // choice replaces it. Choosing closes the panel so the map can frame it.
  // Each state is a card that opens to its municipalities (2026-11-10), so
  // both states show at once; the chosen municipality's state starts open.
  const { allKeys, value } = municipioValue(estados, hiddenMunicipios);
  const [openStates, setOpenStates] = useState<string[]>(() =>
    estados.filter((e) => e.municipios.some((m) => m.key === value)).map((e) => e.key),
  );
  const toggleState = (key: string) =>
    setOpenStates((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  const choose = (key: string) => {
    setHiddenMunicipios(key === "" ? [] : allKeys.filter((k) => k !== key));
    onChosen();
  };

  return (
    <div role="radiogroup" aria-label="Ubicación" className="flex flex-col gap-2 p-4">
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <MunicipioRow label="Todos los municipios" checked={value === ""} onClick={() => choose("")} />
      </div>
      {estados.map((estado) => {
        const isOpen = openStates.includes(estado.key);
        const bodyId = `ubicacion-${estado.key}`;
        return (
          <div key={estado.key} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <button
              type="button"
              onClick={() => toggleState(estado.key)}
              aria-expanded={isOpen}
              aria-controls={bodyId}
              className="group flex w-full items-center gap-3 py-3 pl-4 pr-4 text-left transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900/15"
            >
              <ChevronRight aria-hidden="true" className={`h-4 w-4 flex-shrink-0 text-neutral-400 transition-[color,transform] duration-200 group-hover:text-neutral-600 ${isOpen ? "rotate-90" : ""}`} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900">{estado.label}</span>
              <span className="flex-shrink-0 text-sm tabular-nums text-neutral-500">{estado.count}</span>
            </button>
            <div id={bodyId} hidden={!isOpen} className="border-t border-stone-100">
              {estado.municipios.map((m) => (
                <MunicipioRow key={m.key} label={m.label} count={m.count} checked={value === m.key} onClick={() => choose(m.key)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// One choice in the Ubicación list: a check in a fixed lead column (so every
// label sits on one rail), the name, its sensor count; rows split by a
// hairline, the source rows' type and hover.
function MunicipioRow({ label, count, checked, onClick }: { label: string; count?: number; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className="flex w-full items-center gap-3 border-t border-stone-100 py-3 pl-4 pr-4 text-left transition-colors first:border-t-0 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900/15"
    >
      <span className="flex w-4 flex-shrink-0 justify-center">
        {checked && <Check aria-hidden="true" className="h-4 w-4 text-neutral-900" />}
      </span>
      <span className={`min-w-0 flex-1 truncate text-sm ${checked ? "font-semibold text-neutral-900" : "font-medium text-neutral-700"}`}>{label}</span>
      {count !== undefined && <span className="flex-shrink-0 text-sm tabular-nums text-neutral-500">{count}</span>}
    </button>
  );
}

// The Fuente dialog's text as the legend notes' label / value rows; the
// citizen sensors' humidity caveat behind the advice text's "Ver más".
function SourceNotes() {
  return (
    <dl className="mx-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-stone-200 pt-4 text-xs leading-relaxed">
      <dt className="font-medium text-neutral-500">Estaciones de Gobierno</dt>
      <dd className="text-neutral-600">
        Estaciones de monitoreo oficiales que forman parte del{" "}
        <DialogLink href="https://aire.nl.gob.mx/">SIMA</DialogLink>.
      </dd>
      <dt className="font-medium text-neutral-500">Sensores Ciudadanos</dt>
      <dd className="text-neutral-600">
        <AdviceText
          advice="Sensores de bajo costo instalados por ciudadanos, escuelas y organizaciones independientes."
          full={
            <>
              <p>
                Los datos provienen de <DialogLink href="https://www.purpleair.com/">PurpleAir</DialogLink>, la
                plataforma donde se registran estos sensores. Pueden sobreestimar las PM2.5 cuando hay mucha humedad. Por lo anterior, sus lecturas se ajustan con la fórmula
                de corrección de la EPA de EE. UU.
              </p>
            </>
          }
          source={null}
            boxText="text-xs"
          className=""
        />
      </dd>
    </dl>
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
}: Omit<Parameters<typeof MapToolbar>[0], "estados" | "hiddenMunicipios" | "setHiddenMunicipios">) {
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

  return (
    <div className="p-4">
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
