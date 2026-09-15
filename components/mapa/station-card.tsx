"use client";

import { useId, useState } from "react";
import { Baby, Check, ChevronRight, Copy, Heart, Info, PersonStanding, Stethoscope, UsersRound } from "lucide-react";
import { getQualityInfo, roundPM25, type QualityInfo } from "@/lib/air-quality";
import type { SelectedSensor } from "./types";
import { getSourceIcon, getSourceLabel } from "./lib";

// The card's big quality line. With no reading for the moment on screen — a
// SIMA station that didn't report that hour — it reads "No disponible" in the
// quiet gray treatment, not the huge coloured headline.
export function QualityHeadline({ info, fallbackColor }: { info: QualityInfo | null; fallbackColor?: string }) {
  if (!info) {
    return <span className="min-w-0 flex-1 truncate text-lg font-medium text-gray-400">No disponible</span>;
  }
  return (
    <span className="min-w-0 flex-1 truncate text-2xl font-bold" style={{ color: info.textColor ?? fallbackColor }}>
      {info.label}
    </span>
  );
}

const SENSITIVE_GROUPS = [
  { key: "menores", label: "Niñas y Niños", icon: Baby },
  { key: "adultos", label: "Adultos mayores", icon: PersonStanding },
  { key: "embarazadas", label: "Personas embarazadas", icon: Heart },
  { key: "enfermedades", label: "Condiciones cardiovasculares o respiratorias", icon: Stethoscope },
] as const;

// The whole block is a disclosure: the header row carries the label, its info
// icon and the chevron, and nothing below it renders until it is opened. Plain
// text on the card's own surface, no nested card or filled blocks.
//
// `defaultOpen` is passed on both desktop and mobile (2026-09-15) — the
// recommendations open with the rest of the card instead of costing an extra
// click/tap. The chevron still collapses it either way.
export function HealthRecommendations({ info, onShowInfo, defaultOpen = false }: { info: QualityInfo; onShowInfo: () => void; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  // useId() contains colons, which are not valid in an id fragment reference.
  const bodyId = `health-recs-${useId().replace(/:/g, "")}`;

  return (
    <div>
      {/* The whole row toggles, in the Capas panel's section-row shape: the
          toggle takes the label and the chevron as one flex-1 control, and
          the info button trails it on the card's text rail. It used to be a
          bare 24px chevron beside dead label text, which read as a
          disclosure header but only answered to the glyph.

          The hover stays a glyph darkening rather than a tint. This header
          sits on the card's own glass under the body's px-5, like the two
          headers above it, and neither of those tints; a band here would
          have to bleed past the padding to read as a row at all. What
          changes is what triggers it: the whole row, not the icon. */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="group -my-1 flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
        >
          {/* A legend-swatch disc in the band's `color` with a 1px `ink`
              inset ring, the same mark the map marker carries. It sits on
              the header whether the disclosure is open or closed, so the
              tie to the current reading reads before the recs are even
              expanded, and it replaces the old 3px left rule on the card
              below. `color` for the fill (a filled object, §3), `ink` only
              for the hairline so a pale level keeps its edge. */}
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
            style={{ backgroundColor: info.color, boxShadow: `inset 0 0 0 1px ${info.textColor}` }}
          />
          <span className="truncate text-xs font-medium uppercase leading-none tracking-wide text-gray-400">
            Recomendaciones de salud
          </span>
          <ChevronRight aria-hidden="true" className={`ml-auto h-4 w-4 flex-shrink-0 text-gray-400 transition-[color,transform] duration-200 group-hover:text-gray-600 ${open ? 'rotate-90' : ''}`} />
        </button>
        {/* p-1 with a matching negative margin: the glyph keeps its optical
            position, but the control gets a real hit area instead of a bare
            12px icon. */}
        <button
          type="button"
          onClick={onShowInfo}
          className="-my-1 -mr-1 -translate-y-px flex-shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
          aria-label="Más información sobre recomendaciones de salud"
        >
          <Info aria-hidden="true" className="h-3 w-3" />
        </button>
      </div>
      {/* Kept mounted so aria-controls always resolves. `hidden` also takes the
          rows out of the tab order, so there is still nothing focusable behind
          a closed disclosure. */}
      <div id={bodyId} hidden={!open}>
        {/* The Capas panel's grouped-list material: one bordered card, rows
            divided by hairlines. It used to be a gray track holding floating
            white pills, on a comment claiming it matched the Fuente list,
            which had long since stopped being true.

            The material matches; the affordances deliberately do not. Capas
            rows are controls and carry hover, a focus ring and a chevron.
            These are content, so they carry none of that: a row that looks
            pressable but is not is worse than one that looks like text.

            The paragraph is indented to the label's own left edge (ml-7:
            a 16px icon plus gap-3), the same reasoning behind the ml-11 on
            Capas' municipality rows, so the icons read as a column. */}
        {/* No colour on the card itself. The tie to the current reading is
            the disc on the header row above, present open or closed. */}
        <div className="disclosure-in mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="px-4 py-3.5">
            <div className="mb-1 flex items-center gap-3">
              <UsersRound aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <p className="text-sm font-semibold text-gray-800">Población General</p>
            </div>
            <p className="ml-7 text-sm leading-relaxed text-gray-500">{info.generalRec}</p>
          </div>
          {SENSITIVE_GROUPS.map((g) => (
            <div key={g.key} className="border-t border-gray-100 px-4 py-3.5">
              <div className="mb-1 flex items-center gap-3">
                <g.icon aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-gray-400" />
                <p className="text-sm font-semibold text-gray-800">{g.label}</p>
              </div>
              <p className="ml-7 text-sm leading-relaxed text-gray-500">{info.sensitiveRecs[g.key]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// The shared middle of the estación card: the source line closed off by a
// rule, then "Calidad del Aire" with the current reading. The desktop card and
// the mobile sheet both render this; they differ only in the header above it
// and how the health recommendations below it are wrapped, so those stay at the
// call sites. Returns a fragment — the caller supplies the flex column and its
// gap.
export function StationReading({
  subject,
  pm25,
  copied,
  onCopyCoords,
  copyInteractionClass,
}: {
  subject: SelectedSensor;
  pm25: number | null;
  copied: boolean;
  onCopyCoords: () => void;
  // The one class that differs between the two hosts: the desktop card darkens
  // the label on hover, the mobile sheet dims it on tap.
  copyInteractionClass: string;
}) {
  const { sensor } = subject;
  const isSima = sensor.source === "sima";
  const SourceIcon = getSourceIcon(isSima);
  const quality = getQualityInfo(pm25);

  return (
    <>
      {/* What kind of source this is, in the Capas panel's own words. A rule
          underneath closes the group off from the reading below: a card or a
          filled row is too much furniture for a single line. */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-5">
        <span className="flex min-w-0 items-center gap-1.5 text-sm leading-none text-gray-500">
          <SourceIcon aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
          <span className="truncate">{getSourceLabel(isSima, sensor.red)}</span>
        </span>
        <button
          type="button"
          onClick={onCopyCoords}
          className={`-my-1 -mr-1 flex flex-shrink-0 items-center gap-1 rounded-lg p-1 text-sm leading-none text-gray-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 ${copyInteractionClass}`}
          aria-label="Copiar coordenadas"
        >
          {copied ? <Check aria-hidden="true" className="h-3.5 w-3.5 text-gray-400" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5 text-gray-400" />}
          <span>{copied ? 'Copiado' : 'Coordenadas'}</span>
        </button>
      </div>

      {/* The current reading: the band label, then the µg/m³ value. */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase leading-none tracking-wide text-gray-400">Calidad del Aire</p>
        <div className="flex items-baseline justify-between gap-3">
          <QualityHeadline info={quality} fallbackColor={subject.textColor} />
          {/* The chips' idiom: the number is the value and carries gray-700,
              the unit is the quiet half. */}
          {pm25 !== null && (
            <span className="flex-shrink-0 whitespace-nowrap text-sm text-gray-500">
              <span className="font-medium text-gray-700">{roundPM25(pm25)}</span> μg/m³ PM2.5
            </span>
          )}
        </div>
      </div>
    </>
  );
}
