"use client";

import { useId, useState } from "react";
import { ChevronRight, Info } from "lucide-react";
import { IMECA_LEVELS } from "@/lib/air-quality";
import { DialogLink, InfoDialog } from "./info-dialog";

// The measurement itself, not just a colour key: a segmented PM2.5 scale with
// the μg/m³ thresholds printed at the breaks, then a labelled row per level.
//
// The bar's segments are equal width, NOT scaled to each level's μg/m³ span:
// the top level is unbounded and true widths would crush "Buena" to a sliver.
// The break numbers under the joins carry the real spacing.
// All spans, so the bar is valid phrasing content inside the disclosure
// <button>. Decorative: the level list is the readable key.
export function ScaleBar({ className = "", labels = "thresholds" }: { className?: string; labels?: "thresholds" | "ends" }) {
  const count = IMECA_LEVELS.length;
  return (
    <span aria-hidden="true" className={`block ${className}`}>
      <span className="flex h-2 overflow-hidden rounded-full ring-1 ring-inset ring-black/[0.08]">
        {IMECA_LEVELS.map((level) => (
          <span key={level.label} className="flex-1" style={{ backgroundColor: level.color }} />
        ))}
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

// Swatch in the level's `color` with an `ink` hairline, the same pairing the
// marker's own rim uses, so a disc on the map reads straight back to a row.
function LevelList() {
  return (
    <ul className="flex flex-col gap-2">
      {IMECA_LEVELS.map((level) => (
        <li key={level.label} className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
            style={{ backgroundColor: level.color, boxShadow: `inset 0 0 0 1px ${level.ink}` }}
          />
          <span className="min-w-0 flex-1 truncate text-sm text-neutral-700">{level.label}</span>
          <span className="flex-shrink-0 text-sm text-neutral-500">{level.bounds}</span>
        </li>
      ))}
    </ul>
  );
}

export function LegendDetail({ className = "" }: { className?: string }) {
  // The map only shows PM2.5, and it's the deliberate choice, not a limitation
  // (methodology.md) — so the "what is it" text lives here, next to the unit
  // line, rather than as a filter row for a filter with one option.
  const [showPM25Info, setShowPM25Info] = useState(false);

  return (
    <div className={className}>
      <div className="mb-2 flex items-center gap-1">
        {/* Both sources are hourly averages (docs/mapa-data-pipeline.md); the
            state's own map shows the índice instead, so its numbers differ. */}
        <p className="text-[11px] leading-none text-neutral-400">PM2.5 · μg/m³ · promedio de la última hora</p>
        <button
          type="button"
          onClick={() => setShowPM25Info(true)}
          className="-my-1 flex-shrink-0 rounded-xl p-1 text-neutral-400 transition-colors hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
          aria-label="Qué es PM2.5"
        >
          <Info aria-hidden="true" className="h-3 w-3" />
        </button>
      </div>
      <LevelList />
      {showPM25Info && (
        <InfoDialog title="PM2.5" onClose={() => setShowPM25Info(false)}>
          <p className="text-sm leading-relaxed text-neutral-600">
            Partículas en suspensión en el aire con un diámetro de 2.5
            micrómetros o menos, unas 30 veces más delgadas que un cabello
            humano. Evaden las defensas de la nariz y la garganta, por lo que son
            las más peligrosas para la salud.
          </p>
        </InfoDialog>
      )}
      {/* More air under the citation on mobile, where the level list runs right
          up against it in the bottom sheet; the desktop rail keeps mt-3. */}
      <p className="mt-5 text-[11px] leading-relaxed text-neutral-400 md:mt-3">
        Índice de Aire y Salud Mexicano&nbsp;{" "}
        <DialogLink href="https://dof.gob.mx/nota_detalle.php?codigo=5715154&fecha=25/01/2024#gsc.tab=0">
          NOM-172-SEMARNAT-2023
        </DialogLink>
        .
      </p>
    </div>
  );
}

// On the map (desktop) the legend is a disclosure: the bar and its thresholds
// stay visible, the labelled list sits behind a chevron. On mobile it's a
// bottom sheet (see the `showLegend` panel below), so the map only carries an
// icon button. Inside the Capas sheet it renders fully expanded with no toggle.
export function AirQualityLegend({ className = "", collapsible = false }: { className?: string; collapsible?: boolean }) {
  const [open, setOpen] = useState(false);
  const detailId = `aq-legend-detail-${useId().replace(/:/g, "")}`;

  if (!collapsible) {
    return (
      <div className={className}>
        <p className="text-xs font-medium uppercase leading-none tracking-wide text-neutral-400">
          Calidad del aire
        </p>
        <ScaleBar className="mt-3" />
        <LegendDetail className="mt-3 border-t border-stone-100 pt-3" />
      </div>
    );
  }

  // Pinned to the foot of its column, so it opens upward: the button row holds
  // its place on the bottom edge and the detail unfolds into the gap above it,
  // instead of shoving the row you just clicked ~150px up. flex-col-reverse
  // paints the button last while keeping it first in the DOM, so tab and
  // screen-reader order stay trigger-then-detail.
  return (
    <div className={`flex flex-col-reverse ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={detailId}
        className="flex min-h-6 w-full items-center gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900/15"
      >
        {/* Closed, the bar speaks for itself (2026-11-03): the name shows
            only once the detail is open; screen readers always get it. */}
        <span className={open ? "flex-shrink-0 text-xs font-medium uppercase leading-none tracking-wide text-neutral-400" : "sr-only"}>
          Calidad del aire
        </span>
        {/* Closed: the ends carry direction, no unit needed. Open: the breaks,
            now framed by the "PM2.5 · μg/m³" line the disclosure reveals just
            above, so the bar reads as the axis for the list's bounds. */}
        <ScaleBar labels={open ? "thresholds" : "ends"} className="min-w-0 flex-1" />
        {/* Rotates up when open, toward the detail it reveals: every downward
            panel points its chevron down, so this one points the other way. */}
        <ChevronRight
          aria-hidden="true"
          className={`h-4 w-4 flex-shrink-0 text-neutral-400 transition-transform duration-200 ${open ? "-rotate-90" : ""}`}
        />
      </button>
      {/* Kept mounted so aria-controls always resolves; `hidden` keeps the shut
          content out of the tab order. */}
      <div id={detailId} hidden={!open}>
        <LegendDetail className="disclosure-in-up mb-3 border-b border-stone-100 pb-3" />
      </div>
    </div>
  );
}
