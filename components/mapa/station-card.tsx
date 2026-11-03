"use client";

import { useId, useState } from "react";
import { Baby, Check, ChevronRight, Copy, Heart, Info, PersonStanding, Stethoscope, UsersRound, type LucideIcon } from "lucide-react";
import { getMarkerNumberInk, getQualityInfo, roundPM25, type QualityInfo } from "@/lib/air-quality";
import type { SelectedSensor } from "./types";
import { displayName, getSourceIcon, getSourceLabel, readingDayTimeLabel } from "./lib";
import { DialogLink } from "./info-dialog";
import type { Freshness } from "@/components/data/freshness";

// The card's big quality line. With no live reading (the site's 90-minute
// cutoff, lib/live-readings.ts) it reads "No disponible" in the quiet gray treatment,
// not the huge coloured headline.
export function QualityHeadline({ info, fallbackColor }: { info: QualityInfo | null; fallbackColor?: string }) {
  if (!info) {
    return <span className="min-w-0 flex-1 truncate text-lg font-medium text-neutral-400">No disponible</span>;
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

// The sensitive groups bucketed by identical advice, in SENSITIVE_GROUPS order
// of first appearance: the desktop sidebar's one-sentence-per-block list.
function groupByAdvice(info: QualityInfo) {
  const blocks: { advice: string; groups: (typeof SENSITIVE_GROUPS)[number][] }[] = [];
  for (const g of SENSITIVE_GROUPS) {
    const advice = info.sensitiveRecs[g.key];
    const block = blocks.find((b) => b.advice === advice);
    if (block) block.groups.push(g);
    else blocks.push({ advice, groups: [g] });
  }
  return blocks;
}

// The advice for each sensitive group, behind a disclosure (the general
// advice already sits in the reading, StationReading). The header row carries
// the label, its info icon and the chevron; nothing below it renders until it
// is opened. The mobile sheet; the desktop sidebar lists the groups open
// (AirNowPanel).
export function GroupRecommendations({ info, onShowInfo }: { info: QualityInfo; onShowInfo: () => void }) {
  const [open, setOpen] = useState(false);
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
          className="group -my-1 flex min-w-0 flex-1 items-center gap-2 rounded-xl py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
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
          <span className="truncate text-xs font-medium uppercase leading-none tracking-wide text-neutral-400">
            Recomendaciones por grupo sensible
          </span>
          <ChevronRight aria-hidden="true" className={`ml-auto h-4 w-4 flex-shrink-0 text-neutral-400 transition-[color,transform] duration-200 group-hover:text-neutral-600 ${open ? 'rotate-90' : ''}`} />
        </button>
        {/* p-1 with a matching negative margin: the glyph keeps its optical
            position, but the control gets a real hit area instead of a bare
            12px icon. */}
        <button
          type="button"
          onClick={onShowInfo}
          className="-my-1 -mr-1 -translate-y-px flex-shrink-0 rounded-xl p-1 text-neutral-400 transition-colors hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
          aria-label="Más información sobre las recomendaciones de salud"
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
        <div className="disclosure-in mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {SENSITIVE_GROUPS.map((g) => (
            <div key={g.key} className="border-t border-stone-100 px-4 py-3.5 first:border-t-0">
              <div className="mb-1 flex items-center gap-3">
                <g.icon aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-neutral-400" />
                <p className="text-sm font-semibold text-neutral-800">{g.label}</p>
              </div>
              <p className="ml-7 text-sm leading-relaxed text-neutral-500">{info.sensitiveRecs[g.key]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// "Calidad del Aire" with a reading: the band label, the µg/m³ value and, under
// it, the advice for everyone. The station card's reading (StationReading) and
// The desktop sidebar (AirNowPanel) uses the same row, one step up.
export function QualityReading({ pm25, fallbackColor }: { pm25: number | null; fallbackColor?: string }) {
  const quality = getQualityInfo(pm25);
  // The groups' advice is GroupRecommendations, below it at each call site.
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase leading-none tracking-wide text-neutral-400">Calidad del Aire</p>
      <div className="flex items-baseline justify-between gap-3">
        <QualityHeadline info={quality} fallbackColor={fallbackColor} />
        {/* The chips' idiom: the number is the value and carries neutral-700,
            the unit is the quiet half. */}
        {pm25 !== null && (
          <span className="flex-shrink-0 whitespace-nowrap text-sm text-neutral-500">
            <span className="font-medium text-neutral-700">{roundPM25(pm25)}</span> μg/m³ PM2.5
          </span>
        )}
      </div>
      {quality && <p className="mt-3 text-sm leading-relaxed text-neutral-600">{quality.generalRec}</p>}
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

  return (
    <>
      {/* What kind of source this is, in the Capas panel's own words. A rule
          underneath closes the group off from the reading below: a card or a
          filled row is too much furniture for a single line. */}
      <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-5">
        <span className="flex min-w-0 items-center gap-1.5 text-sm leading-none text-neutral-500">
          <SourceIcon aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0 text-neutral-400" />
          <span className="truncate">{getSourceLabel(isSima, sensor.red)}</span>
        </span>
        <button
          type="button"
          onClick={onCopyCoords}
          className={`-my-1 -mr-1 flex flex-shrink-0 items-center gap-1 rounded-xl p-1 text-sm leading-none text-neutral-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15 ${copyInteractionClass}`}
          aria-label="Copiar coordenadas"
        >
          {copied ? <Check aria-hidden="true" className="h-3.5 w-3.5 text-neutral-400" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5 text-neutral-400" />}
          <span>{copied ? 'Copiado' : 'Coordenadas'}</span>
        </button>
      </div>

      <QualityReading pm25={pm25} fallbackColor={subject.textColor} />
    </>
  );
}

// One recommendation row of the sidebar's grouped list: the group icon(s) in
// pale level-tinted discs (overlapping when groups share the advice), the
// name(s), then the official sentence.
function RecRow({ icons, who, advice, info, lead = false }: { icons: LucideIcon[]; who: string; advice: string; info: QualityInfo; lead?: boolean }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-3.5 px-[18px] py-4">
      <div aria-hidden="true" className="flex">
        {icons.map((Icon, i) => (
          <span
            key={i}
            className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white ${i > 0 ? "-ml-2.5" : ""}`}
            style={{ backgroundColor: `color-mix(in srgb, ${info.color} 14%, white)`, color: info.textColor }}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
        ))}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug text-neutral-900">{who}</p>
        <p className={`mt-1 text-[15px] leading-relaxed ${lead ? "text-neutral-800" : "text-neutral-600"}`}>{advice}</p>
      </div>
    </div>
  );
}

// The desktop sidebar. Header: the level's solid fill as a rounded card inset
// in the glass ("Tarjeta"), the label and level word left, the value right, all
// in the level's numberInk (the marker's own ink on that fill; white on
// Extremadamente mala). Body, the only part that
// scrolls: Recomendaciones de salud (población general) and Grupos sensibles,
// each a grouped list of RecRow (the "B" list from the same mockups).
// Then a footnote: which station the reading is and where the advice comes
// from. `subject` is the default station (pickDefaultSensor); `freshness` is
// its reading's time, top right in the header.
export function AirNowPanel({ subject, freshness }: { subject: SelectedSensor; freshness: Freshness | null }) {
  const quality = getQualityInfo(subject.pm25);
  const onFill = quality && subject.pm25 !== null ? getMarkerNumberInk(subject.pm25) : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* "Tarjeta" header (picked 2026-11-02 from the mix-and-match page): the
          level's solid block as a rounded card inset in the glass, the level
          word left, the value right, text in numberInk. Quieter than the
          full-bleed block it replaces, and the glass shows around it. */}
      <header className="flex-shrink-0 px-4 pt-4">
        {quality ? (
          <div className="overflow-hidden rounded-xl" style={{ backgroundColor: quality.color, color: onFill }}>
            <div className="flex items-baseline-last justify-between gap-3 p-6">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase leading-none tracking-wide">Calidad del aire</p>
                {/* "Extremadamente mala" can't fit at 44px beside the number, so
                    it shows as "Extrem. mala", the legend's own short form;
                    screen readers get the full name. */}
                <p className="mt-2.5 whitespace-nowrap text-[44px] font-extrabold leading-none tracking-tight">
                  {quality.label === "Extremadamente mala" ? (
                    <>
                      <span aria-hidden="true">Extrem. mala</span>
                      <span className="sr-only">Extremadamente mala</span>
                    </>
                  ) : (
                    quality.label
                  )}
                </p>
              </div>
              {subject.pm25 !== null && (
                <p className="flex-shrink-0 text-right">
                  <span className="block text-[40px] font-bold leading-none tracking-tight">{roundPM25(subject.pm25)}</span>
                  <span className="text-[13px]">μg/m³ PM2.5</span>
                </p>
              )}
            </div>
            {/* When the reading is from, as a strip at the card's foot (option
                D, picked 2026-11-03 from the header mockups): a shade of the
                level's own fill, "Actualizado" left, day and hour right. The
                dot is white on every level (2026-11-03: the card's dark ink
                looked wrong on the fill); it pulses while fresh, dims once late. */}
            {freshness && freshness.status !== "nodata" && (
              <p
                className={`flex items-center justify-between gap-3 px-6 py-[11px] text-xs font-medium leading-none ${
                  onFill === "#ffffff" ? "bg-white/15" : "bg-black/[0.07]"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="relative flex h-2 w-2">
                    {freshness.status === "fresh" && (
                      <span className="absolute inset-0 animate-ping rounded-full bg-white opacity-75 motion-reduce:animate-none" />
                    )}
                    <span className={`relative h-2 w-2 rounded-full bg-white ${freshness.status === "fresh" ? "" : "opacity-50"}`} />
                  </span>
                  Actualizado
                </span>
                <time dateTime={freshness.dateTime} className="whitespace-nowrap">
                  {readingDayTimeLabel(new Date(freshness.dateTime))}
                </time>
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <p className="text-xs font-medium uppercase leading-none tracking-wide text-neutral-500">Calidad del aire</p>
            <p className="mt-2.5 text-2xl font-medium text-neutral-400">No disponible</p>
          </div>
        )}
      </header>

      {quality && (
        // `relative`: the scroll box must be the positioning context, or an
        // absolutely positioned descendant (the footnote link's sr-only
        // label) escapes its clip and makes the whole page scroll.
        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-6">
          {/* The Capas panel's grouped-list material ("B" list, picked
              2026-11-02): a white bordered card, rows divided by hairlines.
              Each row leads with its group icon in a pale level-tinted disc;
              groups that share an advice share one row, their discs
              overlapping, so the join reads from the icons however the names
              wrap. Content, not controls: no hover, ring or chevron. */}
          {/* No visible title (removed 2026-11-03, option D of the title
              mockups): each row names who it is for, and the footnote names
              the source. Screen readers still get the section name. */}
          <section aria-label="Recomendaciones de salud">
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
              <RecRow icons={[UsersRound]} who="Población general" advice={quality.generalRec} info={quality} lead />
            </div>
          </section>

          <section className="mt-3" aria-label="Grupos sensibles">
            {/* One row per distinct advice (groupByAdvice): groups join only
                on an exact match of the official text, nothing is reworded.
                No visible title (removed 2026-11-02): the group names lead
                each row. One card per advice (2026-11-03), the same card as
                Población general's. */}
            <ul className="space-y-3">
              {groupByAdvice(quality).map(({ advice, groups }) => (
                <li key={advice} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                  <RecRow icons={groups.map((g) => g.icon)} who={groups.map((g) => g.label).join(", ")} advice={advice} info={quality} />
                </li>
              ))}
            </ul>
          </section>

          {/* Where the reading and the advice come from, always visible as a
              quiet footnote in label / value rows (they were two info-button
              popups, then a run-on sentence; both replaced 2026-11-02). */}
          <dl className="mx-2 mt-8 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-stone-200 pt-5 text-xs leading-relaxed">
            <dt className="font-medium text-neutral-500">Calidad del aire</dt>
            <dd className="text-neutral-600">
              {subject.sensor.source === "sima"
                ? "Nivel máximo registrado en la ZMM"
                : "Sensor ciudadano más cercano a Obispado, sin estaciones del SIMA en vivo"}
            </dd>
            <dt className="font-medium text-neutral-500">{subject.sensor.source === "sima" ? "Estación de Gobierno" : "Sensor"}</dt>
            <dd className="text-neutral-600">{displayName(subject.sensor)}</dd>
            <dt className="font-medium text-neutral-500">Recomendaciones de salud</dt>
            <dd className="text-neutral-600">
              Índice de Aire y Salud,{" "}
              <DialogLink href="https://dof.gob.mx/nota_detalle.php?codigo=5715154&fecha=25/01/2024#gsc.tab=0">NOM-172-SEMARNAT-2023</DialogLink>
            </dd>
          </dl>
        </div>
      )}
    </div>
  );
}
