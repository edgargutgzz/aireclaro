"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Baby, Check, ChevronRight, Copy, MapPin, Stethoscope, UsersRound, X, type LucideIcon } from "lucide-react";
import { getMarkerFill, getMarkerNumberInk, getQualityInfo, roundPM25, type QualityInfo } from "@/lib/air-quality";
import type { SelectedSensor } from "./types";
import { displayName, getSourceIcon, isOccammSensor, readingTimeLabel } from "./lib";
import { DialogLink } from "./info-dialog";
import { FreshnessDot, type Freshness } from "@/components/data/freshness";

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
export function AdviceText({ advice, full, className, source = "NOM-172-SEMARNAT-2023", boxText = "text-sm" }: { advice: ReactNode; full?: ReactNode; className: string; source?: string | null; boxText?: string }) {
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
// `place` names where the reading stands for in the foot, right of the time:
// the metro area on the homepage (2026-11-04), the station on the map
// (2026-11-09). `placeIcon` marks it: a pin on the homepage, the station's
// network icon on the map (getSourceIcon, 2026-11-12, was the location arrow).
// `compact` (mobile sheet at rest, 2026-11-19, option E2 of the mockup; tried
// the same day: A, a pale tint, and D, a level dot + chevron): one white
// line, "Calidad del aire <level>" and the value, under a 5px stripe in the
// marker's colour. A tap opens the sheet, which shows the solid card.
export function AirNowHeader({ subject, freshness, stretch = false, place, placeIcon: PlaceIcon = MapPin, hideFoot = false, compact = false }: { subject: SelectedSensor; freshness: Freshness | null; stretch?: boolean; place?: string; placeIcon?: LucideIcon; hideFoot?: boolean; compact?: boolean }) {
  const quality = getQualityInfo(subject.pm25);
  const onFill = quality && subject.pm25 !== null ? getMarkerNumberInk(subject.pm25) : undefined;
  if (compact && quality && subject.pm25 !== null) {
    return (
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div aria-hidden="true" className="h-[5px]" style={{ backgroundColor: getMarkerFill(subject.pm25) ?? quality.color }} />
        <div className="flex items-center gap-3 px-4 pb-3.5 pt-3">
        <p className="min-w-0 flex-1 truncate text-[15px] leading-tight text-neutral-600">
          Calidad del aire{" "}
          <strong className="font-bold text-neutral-900">
            {quality.label === "Extremadamente mala" ? (
              <>
                <span aria-hidden="true">Extrem. mala</span>
                <span className="sr-only">Extremadamente mala</span>
              </>
            ) : (
              quality.label
            )}
          </strong>
        </p>
        <p className="flex-shrink-0 text-[15px] leading-tight text-neutral-600">
          <strong className="text-xl font-bold text-neutral-900">{roundPM25(subject.pm25)}</strong> μg/m³
        </p>
        </div>
      </div>
    );
  }
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
        {/* `hideFoot`: the mobile sheet at rest shows the level alone
            (2026-11-17); the time and station come with the open sheet. */}
        {!hideFoot && freshness && freshness.status !== "nodata" && (
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
                <PlaceIcon aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0 text-neutral-500" />
                <span className="min-w-0 md:-my-1 md:overflow-x-auto md:whitespace-nowrap md:py-1 md:[scrollbar-width:none] md:[&::-webkit-scrollbar]:hidden">{place}</span>
              </p>
            )}
          </div>
        )}
      </div>
    ) : (
      // No live reading (2026-11-12): the same card, quiet, its foot still
      // naming the station, so a silent station's card says which one it is.
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="p-6">
          <p className="text-xs font-medium uppercase leading-none tracking-wide text-neutral-500">Calidad del aire</p>
          <p className="mt-2.5 text-2xl font-medium text-neutral-400">No disponible</p>
        </div>
        {place && !hideFoot && (
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 bg-stone-100 px-6 py-3 text-sm leading-none text-neutral-600">
            <p className="flex flex-shrink-0 items-center gap-1.5">
              <FreshnessDot status="nodata" />
              Sin lectura reciente
            </p>
            <p className="flex min-w-0 items-center gap-1.5">
              <PlaceIcon aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0 text-neutral-500" />
              <span className="min-w-0">{place}</span>
            </p>
          </div>
        )}
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
// Grupos sensibles opens in place, under its row (SensitiveGroupsSection,
// 2026-11-12; it opened a card beside the sidebar before).
// `fit` (2026-11-12): the station card sizes to its content, so the
// footnote shows whole, no peek.
// `foot` (2026-11-11): the station card reuses this whole panel, its
// spacing, footnote peek and bottom fade, swapping in its own footnote rows.
export function AirNowPanel({ subject, freshness, foot, title, after, fit = false, onClose, hideFoot = false, compact = false }: { subject: SelectedSensor; freshness: Freshness | null; foot?: ReactNode; title?: ReactNode; after?: ReactNode; fit?: boolean; onClose?: () => void; hideFoot?: boolean; compact?: boolean }) {
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
    setFootHidden(!fit && quality && foot && second ? Math.max(0, foot.offsetHeight - (second.offsetTop + 14) + 24) : 0);
  }, [subject.sensor.sensor_id, subject.sensor.source, quality?.label]);
  useLayoutEffect(checkMoreBelow, [footHidden]);
  // Content that grows in place (Grupos sensibles opening)
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
        {/* The station card's header row (2026-11-12): what kind of station
            it is, left, and the X, right. */}
        {(title || onClose) && (
          <div className="-mt-1 mb-3 flex items-center justify-between gap-3 pl-2">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase leading-none tracking-wide text-neutral-500">{title}</p>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="-mr-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-stone-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        {/* The map names the station in the foot (2026-11-09); the homepage
            says only the metro area, which is what the level stands for. */}
        <AirNowHeader subject={subject} freshness={freshness} hideFoot={hideFoot} compact={compact} place={displayName(subject.sensor)} placeIcon={getSourceIcon(subject.sensor.source === "sima")} />
      </header>

      {(quality || foot) && (
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
          {/* Without a reading there's no advice: the station card keeps just
              its footnote (source and coordinates). */}
          {quality && (
          <>
          <section aria-label="Recomendaciones de salud">
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
              <RecRow icons={[UsersRound]} who="Población general" advice={quality.generalRec} full={quality.generalFull} info={quality} lead />
            </div>
          </section>

          <SensitiveGroupsSection quality={quality} />
          {after}
          </>
          )}
          {/* Where the reading and the advice come from: the quiet footnote
              at the body's foot, its text on the cards' rail (24px in). */}
          <div className={quality ? "mt-auto pt-8" : ""}>
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

// Grupos sensibles, opening in place under its row (2026-11-11 on the
// station card, 2026-11-12 on the sidebar too): both groups' icons in their
// level-tinted discs, the label, a chevron that turns down while open. One
// row per distinct advice (groupByAdvice): groups join only on an exact
// match of the official text, nothing is reworded.
function SensitiveGroupsSection({ quality }: { quality: QualityInfo }) {
  const [groupsOpen, setGroupsOpen] = useState(false);
  const groupsId = `groups-${useId().replace(/:/g, "")}`;
  return (
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
}

// The desktop station card's body (2026-11-11): the left column's panel
// itself (AirNowPanel), the station named in its level card's foot, with a
// footnote naming the source and holding the coordinates. The mobile sheet
// renders it too when a station is picked (2026-11-17).
export function StationPanel({ subject, freshness, copied, onCopyCoords, onClose, hideFoot = false, compact = false }: { subject: SelectedSensor; freshness: Freshness | null; copied: boolean; onCopyCoords: () => void; onClose?: () => void; hideFoot?: boolean; compact?: boolean }) {
  const { sensor } = subject;
  const isSima = sensor.source === "sima";
  const foot = (
    <>
      <dt className="font-medium text-neutral-500">Fuente</dt>
      <dd className="text-neutral-600">
        {isSima ? (
          <>
            <DialogLink href="https://aire.nl.gob.mx/">SIMA</DialogLink>
          </>
        ) : (
          <>
            <DialogLink href="https://www.purpleair.com/">PurpleAir</DialogLink>
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

  // The header row names what kind of station this is, with its network
  // icon (2026-11-12; it was the level card's top label earlier that day).
  const SourceIcon = getSourceIcon(isSima);
  const title = (
    <>
      <SourceIcon aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0" />
      {isSima ? "Estación de gobierno" : "Sensor ciudadano"}
    </>
  );

  // OCCAMM's own sensors say whose network they're in, with the logo, in a
  // card after the advice (2026-11-12, option C of the logo mockups).
  // OCCAMM's own sensors say whose network they're in, with the logo, and
  // invite people to join it (2026-11-12): one card, two rows divided by a
  // hairline like the Grupos sensibles card, since the invitation is to this
  // network. The second row opens /adopta-sensor in a new tab; its text is the program
  // page's own ("de forma gratuita").
  const network = isOccammSensor(sensor) ? (
    <section aria-label="Red OCCAMM" className="mt-3 overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="flex items-center gap-5 px-[18px] py-3.5">
        <Image src="/navbar/occamm-logo.png" alt="OCCAMM" width={130} height={24} className="h-6 w-auto flex-shrink-0" />
        <p className="text-[13px] leading-snug text-neutral-600">
          Sensor de la red OCCAMM.
        </p>
      </div>
      <Link
        href="/adopta-sensor"
        // A new tab (2026-11-12), so the map stays where it was.
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3.5 border-t border-stone-100 px-[18px] py-3.5 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900/15"
      >
        <span className="min-w-0 flex-1 text-sm leading-relaxed text-neutral-700">
          Adopta un sensor de forma gratuita y colabora en la medición de la calidad del aire en tu comunidad.
          <span className="sr-only"> (abre en una nueva pestaña)</span>
        </span>
        <ChevronRight aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-neutral-400 transition-colors group-hover:text-neutral-600" />
      </Link>
    </section>
  ) : undefined;

  return <AirNowPanel subject={subject} freshness={freshness} foot={foot} title={title} after={network} fit onClose={onClose} hideFoot={hideFoot} compact={compact} />;
}
