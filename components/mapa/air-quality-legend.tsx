"use client";

import { IMECA_LEVELS } from "@/lib/air-quality";
import { DialogLink } from "./info-dialog";
import { AdviceText } from "./station-card";

// The measurement itself, not just a colour key: a segmented PM2.5 scale with
// the μg/m³ thresholds printed at the breaks, then a labelled row per level.
//
// The bar's segments are equal width, NOT scaled to each level's μg/m³ span:
// the top level is unbounded and true widths would crush "Buena" to a sliver.
// The break numbers under the joins carry the real spacing.
// All spans, so the bar is valid phrasing content inside the disclosure
// <button>. Decorative: the level list is the readable key.
// `current`: a PM2.5 reading to mark on the bar (the sidebar's, 2026-11-10),
// a small white dot wholly inside the bar at the middle of that level's
// segment. The
// segments are equal width, so the dot names the level, not a position
// within it.
export function ScaleBar({ className = "", labels = "thresholds", current = null }: { className?: string; labels?: "thresholds" | "ends"; current?: number | null }) {
  const count = IMECA_LEVELS.length;
  const currentIndex = current != null ? IMECA_LEVELS.findIndex((level) => current <= level.limit) : -1;
  const currentLevel = currentIndex >= 0 ? IMECA_LEVELS[currentIndex] : null;
  return (
    <span aria-hidden="true" className={`block ${className}`}>
      <span className="relative block">
        <span className="flex h-2 overflow-hidden rounded-full ring-1 ring-inset ring-black/[0.08]">
          {IMECA_LEVELS.map((level) => (
            <span key={level.label} className="flex-1" style={{ backgroundColor: level.color }} />
          ))}
        </span>
        {currentLevel && (
          <span
            className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
            style={{ left: `${((currentIndex + 0.5) / count) * 100}%`, boxShadow: "0 0 0 1px #000" }}
          />
        )}
      </span>
      {labels === "ends" ? (
        // Collapsed state: the two ends carry the direction and the worst case,
        // which need no unit to read. The exact breaks, the μg/m³ and the NOM
        // citation all wait for the expanded list.
        <span className="mt-1 flex justify-between text-[11px] font-medium leading-none text-neutral-500">
          <span className="whitespace-nowrap">{IMECA_LEVELS[0].label}</span>
          {/* Abbreviated here only: the full "Extremadamente mala" is the axis
              end, not a value, and the expanded list spells it out. */}
          <span className="whitespace-nowrap">Extrem. mala</span>
        </span>
      ) : (
        <span className="relative mt-1 block h-3">
          {IMECA_LEVELS.slice(0, -1).map((level, i) => (
            <span
              key={level.limit}
              className="absolute -translate-x-1/2 text-[10px] font-medium leading-none text-neutral-500"
              style={{ left: `${((i + 1) / count) * 100}%` }}
            >
              {level.limit}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

// A white grouped list, the left sidebar's recommendation-card material
// (option C of the legend mockups, 2026-11-03): each level leads with a pale
// level-tinted disc, like the recommendation rows' icon discs, holding a dot
// in the level's `color` with its `ink` hairline (the marker's own rim
// pairing, so a disc on the map reads straight back to a row).
export function LevelList() {
  return (
    <ul className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      {IMECA_LEVELS.map((level) => (
        <li key={level.label} className="flex items-center gap-3 border-t border-stone-100 px-4 py-3 first:border-t-0">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `color-mix(in srgb, ${level.color} 18%, white)` }}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: level.color, boxShadow: `inset 0 0 0 1px ${level.ink}` }}
            />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900">{level.label}</span>
          <span className="flex-shrink-0 text-sm tabular-nums text-neutral-500">{level.bounds}</span>
        </li>
      ))}
    </ul>
  );
}

export function LegendDetail({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <LevelList />
      <LegendNotes className="mt-8" />
    </div>
  );
}

export function LegendNotes({ className = "" }: { className?: string }) {
  // The map only shows PM2.5, and it's the deliberate choice, not a limitation
  // (methodology.md) — so the "what is it" text lives here, next to the
  // pollutant line, behind the advice text's own "Ver más" (2026-11-10, it
  // was an info icon opening a dialog).
  return (
    <div className={className}>
      {/* The notes as label / value rows, the sidebar footnote's format
          (2026-11-03). Both sources are hourly averages
          (docs/mapa-data-pipeline.md); the state's own map shows the índice
          instead, so its numbers differ. */}
      <dl className="mx-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-stone-200 pt-4 text-xs leading-relaxed">
        <dt className="font-medium text-neutral-500">Escala de color</dt>
        <dd className="text-neutral-600">
          Índice de Aire y Salud,{" "}
          <DialogLink href="https://dof.gob.mx/nota_detalle.php?codigo=5715154&fecha=25/01/2024#gsc.tab=0">
            NOM-172-SEMARNAT-2023
          </DialogLink>
        </dd>
        <dt className="font-medium text-neutral-500">Contaminante</dt>
        <dd className="text-neutral-600">
          <AdviceText
            advice="PM2.5 en μg/m³, promedio de la última hora"
            full="Partículas en suspensión en el aire con un diámetro de 2.5 micrómetros o menos, unas 30 veces más delgadas que un cabello humano. Evaden las defensas de la nariz y la garganta, por lo que son las más peligrosas para la salud."
            source={null}
            boxText="text-xs"
            className=""
          />
        </dd>
      </dl>
    </div>
  );
}
