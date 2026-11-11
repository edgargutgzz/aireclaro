"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Baby, Check, ChevronRight, Copy, Info, Navigation, Stethoscope, UsersRound, X, type LucideIcon } from "lucide-react";
import { getMarkerNumberInk, getQualityInfo, roundPM25, type QualityInfo } from "@/lib/air-quality";
import type { SelectedSensor } from "./types";
import { displayName, getSourceIcon, getSourceLabel, readingTimeLabel } from "./lib";
import { DialogLink } from "./info-dialog";
import { FreshnessDot, type Freshness } from "@/components/data/freshness";

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

// The norm's two sensitive groups (NOM-172-SEMARNAT-2023, Tabla 12), one icon each.
const SENSITIVE_GROUPS = [
  { key: "menoresGestantes", label: "Menores de 12 años y personas gestantes", icon: Baby },
  { key: "enfermedadesMayores", label: "Mayores de 60 años y condiciones cardiovasculares o respiratorias", icon: Stethoscope },
] as const;

// The sensitive groups bucketed by identical advice, in SENSITIVE_GROUPS order
// of first appearance: the desktop sidebar's one-sentence-per-block list.
// `full` is the norm's whole message for the row, when a group in it has one
// (QualityInfo.sensitiveFull).
export function groupByAdvice(info: QualityInfo) {
  const blocks: { advice: string; groups: (typeof SENSITIVE_GROUPS)[number][]; full?: string }[] = [];
  for (const g of SENSITIVE_GROUPS) {
    const advice = info.sensitiveRecs[g.key];
    const full = info.sensitiveFull?.[g.key];
    const block = blocks.find((b) => b.advice === advice);
    if (block) {
      block.groups.push(g);
      block.full ??= full;
    } else blocks.push({ advice, groups: [g], full });
  }
  return blocks;
}

// The advice text, with the norm's full message one tap away. "Ver más"
// after the short sentence opens the norm's text below it, in a box that ends
// with the norm's name on its own line, while the short sentence stays in place (2026-11-05).
// Closed by default. Also the map legend's PM2.5 explainer (2026-11-10, it
// was an info icon and a dialog), with `source` null: no norm line.
// `boxText`: the open box's type size, 14px beside the advice; the map's
// 12px notes pass text-xs so the box matches the line it opens from.
export function AdviceText({ advice, full, className, source = "NOM-172-SEMARNAT-2023", boxText = "text-sm" }: { advice: string; full?: ReactNode; className: string; source?: string | null; boxText?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={className}>
      <p>
        {advice}
        {full && (
          <>
            {" "}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={id}
              className="whitespace-nowrap rounded text-neutral-500 underline decoration-stone-300 underline-offset-[3px] transition-colors hover:text-neutral-800 hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
            >
              {open ? "Ver menos" : "Ver más"}
            </button>
          </>
        )}
      </p>
      {full && open && (
        <div id={id} className={`mt-2 rounded-lg bg-stone-100 px-3 py-2.5 leading-relaxed text-neutral-600 ${boxText}`}>
          {full}
          {source && <span className="mt-1.5 block text-xs text-neutral-400">{source}</span>}
        </div>
      )}
    </div>
  );
}

// The advice for each sensitive group, behind a disclosure (the general
// advice already sits in the reading, StationReading). The header row carries
// the label, its info icon and the chevron; nothing below it renders until it
// is opened. The mobile sheet; the desktop sidebar has its own, as cards
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
              <AdviceText advice={info.sensitiveRecs[g.key]} full={info.sensitiveFull?.[g.key]} className="ml-7 text-sm leading-relaxed text-neutral-500" />
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
      {quality && <AdviceText advice={quality.generalRec} full={quality.generalFull} className="mt-3 text-sm leading-relaxed text-neutral-600" />}
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
// `who` takes several names when groups share the advice: one name per line
// (2026-11-04, a comma-joined run-on read as one long group).
export function RecRow({ icons, who, advice, info, lead = false, full }: { icons: LucideIcon[]; who: string | string[]; advice: string; info: QualityInfo; lead?: boolean; full?: string }) {
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
        <p className="text-sm font-semibold leading-snug text-neutral-900">
          {Array.isArray(who) ? who.map((name) => <span key={name} className="block">{name}</span>) : who}
        </p>
        <AdviceText advice={advice} full={full} className={`mt-1 text-[15px] leading-relaxed ${lead ? "text-neutral-800" : "text-neutral-600"}`} />
      </div>
    </div>
  );
}

// The level card: the level's solid fill, the label and level word left, the
// value right, in the level's numberInk, with a pale-tint foot carrying the
// reading's time. Shared by the map's desktop sidebar (AirNowPanel) and the
// homepage card (components/home/air-now-card.tsx).
// `stretch` fills its container's height (the homepage card, beside the
// advice card), the level block growing and the foot staying at the bottom.
// `place` names where the reading stands for in the foot, right of the time,
// with the location arrow: the metro area on the homepage (2026-11-04), the
// station on the map (2026-11-09).
export function AirNowHeader({ subject, freshness, stretch = false, place }: { subject: SelectedSensor; freshness: Freshness | null; stretch?: boolean; place?: string }) {
  const quality = getQualityInfo(subject.pm25);
  const onFill = quality && subject.pm25 !== null ? getMarkerNumberInk(subject.pm25) : undefined;
  return (
    quality ? (
      <div className={`overflow-hidden rounded-xl border border-stone-200 ${stretch ? "flex h-full flex-col" : ""}`} style={{ backgroundColor: quality.color, color: onFill }}>
        <div className={`flex items-baseline-last justify-between gap-3 p-6 ${stretch ? "flex-1" : ""}`}>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase leading-none tracking-wide">Calidad del aire</p>
            {/* "Extremadamente mala" can't fit at 44px beside the number, so
                it shows as "Extrem. mala", the legend's own short form;
                screen readers get the full name. */}
            {/* Sizes come from one 1.25 type scale (2026-11-05): label 12,
              unit and foot 14, level and number 44 (56 on the homepage's
              stretched desktop card). Under sm they grow with the screen,
              36 to 44px; "Extrem. mala" follows its own width so it never
              runs into the unit. 24px padding and a 12px label gap. A step larger on the
              homepage's desktop card (stretch, 2026-11-05). */}
          <p className={`mt-3 whitespace-nowrap font-extrabold leading-none tracking-tight sm:mt-2.5 sm:text-[44px] ${quality.label === "Extremadamente mala" ? "text-[clamp(28px,calc((100vw_-_180px)/5.6),44px)]" : "text-[clamp(36px,10vw,44px)]"} ${stretch ? "lg:mt-3 lg:text-[56px]" : ""}`}>
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
              <span className={`block text-[clamp(36px,10vw,44px)] font-bold leading-none tracking-tight sm:text-[44px] ${stretch ? "lg:text-[56px]" : ""}`}>{roundPM25(subject.pm25)}</span>
              <span className="text-sm">μg/m³ PM2.5</span>
            </p>
          )}
        </div>
        {/* When the reading is from, as a foot on the card in a pale tint
            of the level (2026-11-03: white read as too prominent; the tint
            matches the icon discs below). Gray text; the freshness dot in
            the level's colour (2026-11-05, was the map's blue). */}
        {freshness && freshness.status !== "nodata" && (
          <div
            className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3 text-sm leading-none md:flex-nowrap"
            style={{ backgroundColor: `color-mix(in srgb, ${quality.color} 18%, white)` }}
          >
            <p className="flex flex-shrink-0 items-center gap-1.5">
              <FreshnessDot status={freshness.status} color={quality.color} />
              {/* "Actualizado 1:00 PM" (2026-11-03, replaced "Hoy, 1:00 PM");
                  a past day still shows: "Actualizado ayer 11:00 PM". */}
              <span className="whitespace-nowrap text-neutral-600">
                Actualizado{" "}
                <time dateTime={freshness.dateTime} className="font-medium text-neutral-800">
                  {readingTimeLabel(new Date(freshness.dateTime))}
                </time>
              </span>
            </p>
            {/* Under md (the homepage card on a phone) the foot wraps, the
                name on its own line. From md a name too long for the foot
                scrolls sideways in place (2026-11-11), no wrap and no
                ellipsis; the scrollbar is hidden, the trackpad or a drag
                moves it. */}
            {place && (
              <p className="flex min-w-0 items-center gap-1.5 text-neutral-600">
                <Navigation aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0 text-neutral-500" />
                <span className="min-w-0 md:-my-1 md:overflow-x-auto md:whitespace-nowrap md:py-1 md:[scrollbar-width:none] md:[&::-webkit-scrollbar]:hidden">{place}</span>
              </p>
            )}
          </div>
        )}
      </div>
    ) : (
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <p className="text-xs font-medium uppercase leading-none tracking-wide text-neutral-500">Calidad del aire</p>
        <p className="mt-2.5 text-2xl font-medium text-neutral-400">No disponible</p>
      </div>
    )
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
// `groupsOpen` / `onToggleGroups`: the Grupos sensibles row opens its advice
// in a card of its own beside the sidebar (SensitiveGroupsCard, placed by the
// map page, 2026-11-10); closed by default.
// `groups` / `foot` (2026-11-11): the station card reuses this whole panel,
// its spacing, footnote peek and bottom fade, swapping in its own Grupos
// sensibles section and footnote rows.
export function AirNowPanel({ subject, freshness, groupsOpen = false, onToggleGroups, groups, foot }: { subject: SelectedSensor; freshness: Freshness | null; groupsOpen?: boolean; onToggleGroups?: () => void; groups?: ReactNode; foot?: ReactNode }) {
  const quality = getQualityInfo(subject.pm25);

  // The footnote ends the scroll and sits at its foot, the map cards' notes
  // effect (2026-11-10): its first row shows, the top of the next peeks under
  // a fade, the rest is a scroll of the whole body away. The body's content
  // is given just enough extra height to push that much of the footnote
  // below the fold (the 24px is the body's own bottom padding).
  const bodyRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDListElement>(null);
  const [footHidden, setFootHidden] = useState(0);
  const [moreBelow, setMoreBelow] = useState(false);
  const checkMoreBelow = () => {
    const el = bodyRef.current;
    setMoreBelow(!!el && el.scrollHeight - el.scrollTop - el.clientHeight > 1);
  };
  useLayoutEffect(() => {
    const foot = footRef.current;
    const second = foot?.querySelectorAll("dt")[1] as HTMLElement | undefined;
    setFootHidden(foot && second ? Math.max(0, foot.offsetHeight - (second.offsetTop + 14) + 24) : 0);
  }, [subject.sensor.sensor_id, subject.sensor.source, quality?.label]);
  useLayoutEffect(checkMoreBelow, [footHidden]);
  // Content that grows in place (the station card's Grupos sensibles opening)
  // re-checks the fade.
  useEffect(() => {
    const inner = bodyRef.current?.firstElementChild;
    if (!inner) return;
    const ro = new ResizeObserver(checkMoreBelow);
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);


  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* "Tarjeta" header (picked 2026-11-02 from the mix-and-match page): the
          level's solid block as a rounded card inset in the glass, the level
          word left, the value right, text in numberInk. Quieter than the
          full-bleed block it replaces, and the glass shows around it. */}
      <header className="flex-shrink-0 px-4 pt-4">
        {/* The map names the station in the foot (2026-11-09); the homepage
            says only the metro area, which is what the level stands for. */}
        <AirNowHeader subject={subject} freshness={freshness} place={displayName(subject.sensor)} />
      </header>

      {quality && (
        // `relative`: the scroll box must be the positioning context, or an
        // absolutely positioned descendant (the footnote link's sr-only
        // label) escapes its clip and makes the whole page scroll.
        <div ref={bodyRef} onScroll={checkMoreBelow} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-6">
          <div className="flex flex-col" style={{ minHeight: `calc(100% + ${footHidden}px)` }}>
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
              <RecRow icons={[UsersRound]} who="Población general" advice={quality.generalRec} full={quality.generalFull} info={quality} lead />
            </div>
          </section>

          {groups ?? (
          <section className="mt-3" aria-label="Grupos sensibles">
            {/* The row that opens the groups' card, in the advice cards'
                material: both groups' icons in their level-tinted discs, the
                label, a chevron pointing to where the card opens; shaded
                while it is open. */}
            <button
              type="button"
              onClick={onToggleGroups}
              aria-expanded={groupsOpen}
              aria-controls={groupsOpen ? "grupos-sensibles" : undefined}
              className={`group flex w-full items-center gap-3.5 rounded-2xl border border-stone-200 px-[18px] py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15 ${groupsOpen ? "bg-stone-100" : "bg-white hover:bg-stone-50"}`}
            >
              <span aria-hidden="true" className="flex">
                {SENSITIVE_GROUPS.map((g, i) => (
                  <span
                    key={g.key}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white ${i > 0 ? "-ml-2.5" : ""}`}
                    style={{ backgroundColor: `color-mix(in srgb, ${quality.color} 14%, white)`, color: quality.textColor }}
                  >
                    <g.icon className="h-[18px] w-[18px]" />
                  </span>
                ))}
              </span>
              <span className="min-w-0 flex-1 text-sm font-semibold text-neutral-900">Grupos sensibles</span>
              <ChevronRight aria-hidden="true" className={`h-4 w-4 flex-shrink-0 transition-colors group-hover:text-neutral-600 ${groupsOpen ? "text-neutral-600" : "text-neutral-400"}`} />
            </button>
          </section>
          )}
          {/* Where the reading and the advice come from: the quiet footnote
              at the body's foot, its text on the cards' rail (24px in). */}
          <div className="mt-auto pt-8">
          <dl ref={footRef} className="relative mx-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-stone-200 pt-4 text-xs leading-relaxed">
            {foot ?? (
            <>
            {/* The station's name is in the card's foot (2026-11-09); this
                row says why it is the one shown. */}
            <dt className="font-medium text-neutral-500">{subject.sensor.source === "sima" ? "Estación mostrada" : "Sensor"}</dt>
            <dd className="text-neutral-600">
              {subject.sensor.source === "sima"
                ? "Nivel más alto de la ZMM"
                : "Ciudadano, el más cercano a Obispado, sin estaciones del SIMA en vivo"}
            </dd>
            <dt className="font-medium text-neutral-500">Recomendaciones de salud</dt>
            <dd className="text-neutral-600">
              <DialogLink href="https://dof.gob.mx/nota_detalle.php?codigo=5715154&fecha=25/01/2024#gsc.tab=0">NOM-172-SEMARNAT-2023</DialogLink>
            </dd>
            </>
            )}
          </dl>
          </div>
          </div>
          {/* Sticky to the body's bottom edge, taking no space of its own. */}
          {moreBelow && (
            <div aria-hidden="true" className="pointer-events-none sticky -bottom-6 -mx-4 -mt-10 h-10 bg-gradient-to-t from-white to-white/0" />
          )}
        </div>
      )}
    </div>
  );
}

// The sensitive groups' advice as a glass card of its own, opened from the
// sidebar's Grupos sensibles row and placed beside the sidebar by the map
// page (2026-11-10). One card per distinct advice (groupByAdvice): groups
// join only on an exact match of the official text, nothing is reworded.
export function SensitiveGroupsCard({ subject, onClose }: { subject: SelectedSensor; onClose: () => void }) {
  const quality = getQualityInfo(subject.pm25);
  if (!quality) return null;
  return (
    <section id="grupos-sensibles" aria-label="Grupos sensibles" className="glass pointer-events-auto flex max-h-full min-h-0 flex-col overflow-hidden rounded-2xl">
      <div className="flex flex-shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-4">
        <span className="text-xs font-medium uppercase leading-none tracking-wide text-neutral-500">Grupos sensibles</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="-my-1 -mr-1 flex-shrink-0 rounded-xl p-1 text-neutral-400 transition-colors hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <ul className="disclosure-in min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-4">
        {groupByAdvice(quality).map(({ advice, groups, full }) => (
          <li key={advice} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <RecRow icons={groups.map((g) => g.icon)} who={groups.map((g) => g.label)} advice={advice} info={quality} full={full} />
          </li>
        ))}
      </ul>
    </section>
  );
}

// The desktop station card's body (2026-11-11): the left column's panel
// itself (AirNowPanel), the station named in its level card's foot, with
// Grupos sensibles opening in place and a footnote naming the source and
// holding the coordinates. Mobile keeps StationReading in its bottom sheet.
export function StationPanel({ subject, freshness, copied, onCopyCoords }: { subject: SelectedSensor; freshness: Freshness | null; copied: boolean; onCopyCoords: () => void }) {
  const { sensor } = subject;
  const isSima = sensor.source === "sima";
  const quality = getQualityInfo(subject.pm25);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const groupsId = `station-groups-${useId().replace(/:/g, "")}`;

  const groups = quality && (
    <section aria-label="Grupos sensibles" className="mt-3 overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <button
        type="button"
        onClick={() => setGroupsOpen((v) => !v)}
        aria-expanded={groupsOpen}
        aria-controls={groupsId}
        className="group flex w-full items-center gap-3.5 px-[18px] py-3 text-left transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900/15"
      >
        <span aria-hidden="true" className="flex">
          {SENSITIVE_GROUPS.map((g, i) => (
            <span
              key={g.key}
              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white ${i > 0 ? "-ml-2.5" : ""}`}
              style={{ backgroundColor: `color-mix(in srgb, ${quality.color} 14%, white)`, color: quality.textColor }}
            >
              <g.icon className="h-[18px] w-[18px]" />
            </span>
          ))}
        </span>
        <span className="min-w-0 flex-1 text-sm font-semibold text-neutral-900">Grupos sensibles</span>
        <ChevronRight aria-hidden="true" className={`h-4 w-4 flex-shrink-0 text-neutral-400 transition-[color,transform] duration-200 group-hover:text-neutral-600 ${groupsOpen ? "rotate-90" : ""}`} />
      </button>
      <div id={groupsId} hidden={!groupsOpen} className="border-t border-stone-100">
        {groupByAdvice(quality).map(({ advice, groups, full }) => (
          <div key={advice} className="border-t border-stone-100 first:border-t-0">
            <RecRow icons={groups.map((g) => g.icon)} who={groups.map((g) => g.label)} advice={advice} info={quality} full={full} />
          </div>
        ))}
      </div>
    </section>
  );

  const foot = (
    <>
      <dt className="font-medium text-neutral-500">Fuente</dt>
      <dd className="text-neutral-600">
        {isSima ? (
          <>
            <DialogLink href="https://aire.nl.gob.mx/">SIMA</DialogLink>, Gobierno de Nuevo León
          </>
        ) : (
          <>
            <DialogLink href="https://www.purpleair.com/">PurpleAir</DialogLink>
            {sensor.red ? `, red ${sensor.red}` : ""}
          </>
        )}
      </dd>
      <dt className="font-medium text-neutral-500">Ubicación</dt>
      <dd>
        <button
          type="button"
          onClick={onCopyCoords}
          className="-mx-1 flex items-center gap-1 rounded-lg px-1 text-neutral-600 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
        >
          {copied ? <Check aria-hidden="true" className="h-3 w-3 text-neutral-400" /> : <Copy aria-hidden="true" className="h-3 w-3 text-neutral-400" />}
          {copied ? "Copiado" : "Copiar coordenadas"}
        </button>
      </dd>
    </>
  );

  return <AirNowPanel subject={subject} freshness={freshness} groups={groups} foot={foot} />;
}
