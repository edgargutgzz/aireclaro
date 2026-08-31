"use client";

import { useEffect, useId, useMemo, useRef, useState, useCallback, type Dispatch, type SetStateAction } from "react";
import { Navigation, Layers, Copy, ChevronRight, Landmark, Users, UsersRound, Check, Minus, Info, X, Baby, PersonStanding, Heart, Stethoscope } from "lucide-react";
import mapboxgl, { Map, Marker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getPM25Color, createMarker, ACTIVE_MARKER_Z, USER_MARKER_Z, roundPM25, getDistance, getQualityInfo, IMECA_LEVELS, IMECA_THRESHOLDS, type QualityInfo } from "@/lib/air-quality";

// Initialize Mapbox
(mapboxgl as any).accessToken =
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

// Sensor interface
interface Sensor {
  id: number;
  sensor_id: number;
  nombre: string;
  nombre_display?: string;
  lat: number;
  lon: number;
  source: string; // purpleAir o sima
  red?: string | null;
  municipio?: string | null;
  estado?: string | null;
}

// Air Quality Data interface
interface Data {
  id: number;
  sensor_id: number;
  pm25: number;
  time_stamp: string;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface HistoryPoint {
  pm25: number;
  time_stamp: string;
}

// Small inline trend chart for the selected sensor's last 48h. Fixed color
// regardless of the sensor's air-quality color: the yellow "Aceptable" tone
// in particular is too low-contrast on white to read as a line/fill. Drawn
// with a white halo (see linePath rendering below) so the line stays legible
// where it crosses a dashed threshold line.
const SPARKLINE_COLOR = "#3b82f6";

// Shown as the default "Calidad del aire" sensor when the visitor hasn't
// shared their location: TEC-AMM-RB-006 (PurpleAir 293003), near the centre
// of the Monterrey metro.
const DEFAULT_SENSOR_ID = "293003";




// What kind of source this is first, in the same words the Capas panel uses,
// then the network it belongs to when it has one (`red`, e.g. OCCAMM). Sensors
// with no network just say what they are.
// The two tables spell municipalities inconsistently — "Garcia"/"García",
// "San Nicolas"/"San Nicolás", and "General Escobedo" for what the rest of the
// rows call "Escobedo". Everything is grouped by this key, and the label shown
// is whichever spelling carries its accents.
const MUNICIPIO_ALIASES: Record<string, string> = {
  "general escobedo": "escobedo",
};

function normalizeName(name?: string | null) {
  if (!name) return null;
  const plain = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return MUNICIPIO_ALIASES[plain] ?? plain;
}

const municipioKey = normalizeName;
const estadoKey = normalizeName;

function getSourceLabel(isSima: boolean, red?: string | null) {
  if (isSima) return "Estación de Gobierno";
  return red ? `Sensor Ciudadano · ${red}` : "Sensor Ciudadano";
}


// A government building or people, matching the two groups the Capas panel
// splits the map into.
function getSourceIcon(isSima: boolean) {
  return isSima ? Landmark : Users;
}

function getRelativeDayLabel(date: Date) {
  const now = new Date();
  const dayDiff = Math.floor((now.setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / 86400000);
  return dayDiff === 0 ? "Hoy" : dayDiff === 1 ? "Ayer" : format(date, "d MMM", { locale: es });
}

type Freshness = {
  dateTime: string;
  when: string;
  status: "fresh" | "delayed" | "stale";
};

// How current the reading on screen is. One component for both breakpoints;
// this used to be two copies of the same markup, one of them md:hidden.
//
// Three states, because a dot that is only ever green cannot tell you
// anything. The time used to be floored to the hour and carried no day, so if
// ingestion stopped it went on reporting a cheerful green 11:00 AM the next
// morning. Colour is the glanceable layer and never the only one, the
// timestamp itself is what carries the state.
// `flat` drops the shadow: used where the badge sits next to the location
// button, so the button is visibly the interactive one of the pair. On its
// own (mobile, top-left) it keeps the shadow to lift off the map.
function FreshnessBadge({ freshness, flat = false }: { freshness: Freshness; flat?: boolean }) {
  const dot =
    freshness.status === "fresh" ? "bg-green-500" :
    freshness.status === "delayed" ? "bg-amber-500" :
    "bg-gray-400";

  return (
    <div className={`flex h-10 flex-shrink-0 items-center gap-2 rounded-xl border border-white/60 bg-white/80 px-3.5 backdrop-blur-md ${flat ? "" : "shadow-sm"}`}>
      <span aria-hidden="true" className="relative flex h-4 w-4 flex-shrink-0 items-center justify-center">
        {/* Only fresh data pulses. A dot that keeps ticking in amber or grey
            reads as "working on it" when the truth is "this is old". */}
        {freshness.status === "fresh" && (
          <span className="absolute h-2 w-2 animate-ping rounded-full bg-green-400 opacity-75 motion-reduce:animate-none" />
        )}
        <span className={`relative h-2 w-2 rounded-full ${dot}`} />
      </span>
      {/* The label is the quiet half and the time is the information, so they
          no longer share one weight and one colour. */}
      <span className="whitespace-nowrap text-[13px] text-gray-500">
        Actualizado{" "}
        <time dateTime={freshness.dateTime} className="font-medium text-gray-700">
          {freshness.when}
        </time>
      </span>
    </div>
  );
}

// The measurement itself, not just a colour key: a segmented PM2.5 scale with
// the μg/m³ thresholds printed at the breaks, then a labelled row per level.
//
// The bar's segments are equal width, NOT scaled to each level's μg/m³ span:
// the top level is unbounded and true widths would crush "Buena" to a sliver.
// The break numbers under the joins carry the real spacing.
// All spans, so the bar is valid phrasing content inside the disclosure
// <button>. Decorative: the level list is the readable key.
function ScaleBar({ className = "", labels = "thresholds" }: { className?: string; labels?: "thresholds" | "ends" }) {
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
        <span className="mt-1 flex justify-between text-[11px] font-medium leading-none text-gray-500">
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
              className="absolute -translate-x-1/2 text-[10px] font-medium leading-none text-gray-500"
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
          <span className="min-w-0 flex-1 truncate text-[13px] text-gray-700">{level.label}</span>
          <span className="flex-shrink-0 text-[13px] text-gray-500">{level.bounds}</span>
        </li>
      ))}
    </ul>
  );
}

function LegendDetail({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <p className="mb-2 text-[11px] leading-none text-gray-400">PM2.5 · μg/m³</p>
      <LevelList />
      <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
        Índice de Aire y Salud{" "}
        <DialogLink href="https://dof.gob.mx/nota_detalle.php?codigo=5715154&fecha=25/01/2024#gsc.tab=0">
          NOM-172-SEMARNAT-2023
        </DialogLink>
        .
      </p>
    </div>
  );
}

// On the map (desktop) the legend is a disclosure: the bar and its thresholds
// stay visible, the labelled list sits behind a chevron. Inside the Capas
// sheet (mobile) it is already nested in a disclosure, so it renders fully
// expanded with no toggle.
function AirQualityLegend({ className = "", collapsible = false }: { className?: string; collapsible?: boolean }) {
  const [open, setOpen] = useState(false);

  if (!collapsible) {
    return (
      <div className={className}>
        <p className="text-xs font-medium uppercase leading-none tracking-wide text-gray-400">
          Calidad del aire
        </p>
        <ScaleBar className="mt-3" />
        <LegendDetail className="mt-3 border-t border-gray-100 pt-3" />
      </div>
    );
  }

  // Wide enough that the label, the bar and the chevron sit on one row.
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="aq-legend-detail"
        className="flex w-full items-center gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15"
      >
        <span className="flex-shrink-0 text-xs font-medium uppercase leading-none tracking-wide text-gray-400">
          Calidad del aire
        </span>
        {/* Closed: the ends carry direction, no unit needed. Open: the breaks,
            now framed by the "PM2.5 · μg/m³" line the disclosure reveals right
            below, so the bar reads as the axis for the list's bounds. */}
        <ScaleBar labels={open ? "thresholds" : "ends"} className="min-w-0 flex-1" />
        <ChevronRight
          aria-hidden="true"
          className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
      </button>
      {/* Kept mounted so aria-controls always resolves; `hidden` keeps the shut
          content out of the tab order. */}
      <div id="aq-legend-detail" hidden={!open}>
        <LegendDetail className="disclosure-in mt-3 border-t border-gray-100 pt-3" />
      </div>
    </div>
  );
}

function formatHistoryTime(dateStr: string) {
  const date = new Date(dateStr);
  // Readings land ~30 min past the hour but represent that hour's data —
  // floor to the hour, matching how timestamps are shown everywhere else.
  return `${getRelativeDayLabel(date)} ${format(date, "h")}:00 ${format(date, "a")}`;
}

function Sparkline({ data, onHoverChange }: { data: HistoryPoint[]; onHoverChange?: (point: HistoryPoint | null) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  // useId() contains colons; strip them so the url(#id) reference is safe.
  const gradientId = `spark-${useId().replace(/:/g, "")}`;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (data.length < 2) {
    return <p className="text-sm leading-relaxed text-gray-500">Sin datos suficientes para mostrar la tendencia</p>;
  }

  const width = 320;
  const height = 190;
  const values = data.map((d) => d.pm25);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  // Pad the value domain (not just pixel space) so the line's own peak and
  // trough sit inside the chart with room to breathe instead of touching the
  // top and bottom edges.
  const domainPadding = range * 0.15;
  const domainMin = min - domainPadding;
  const domainMax = max + domainPadding;
  const domainRange = domainMax - domainMin;

  const toY = (value: number) => height - ((value - domainMin) / domainRange) * height;

  const rightPadding = 8; // keeps the latest point off the chart's right edge
  const drawableWidth = width - rightPadding;
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * drawableWidth,
    y: toY(d.pm25),
  }));

  // IMECA limits as dashed reference lines, each in the color of the zone it
  // opens. Only the ones inside this window's range are drawn, so the chart
  // never carries a line the data never approaches.
  const thresholds = IMECA_THRESHOLDS.filter((t) => t.value > domainMin && t.value < domainMax);

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  // Area closes on the chart floor, filled with a fade of the line's own hue.
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${height} L0,${height} Z`;

  // Mark where one calendar day ends and the next begins, so the daily
  // shape (morning/evening peaks) is easy to read instead of one blur.
  const dayBoundaries = data.flatMap((d, i) => {
    if (i === 0) return [];
    const prev = new Date(data[i - 1].time_stamp);
    const curr = new Date(d.time_stamp);
    if (curr.getDate() === prev.getDate() && curr.getMonth() === prev.getMonth()) return [];
    return [{ x: points[i].x, leftPct: (points[i].x / width) * 100, label: getRelativeDayLabel(curr) }];
  });

  const notifyHover = onHoverChange
    ? (point: HistoryPoint | null) => onHoverChange(point)
    : undefined;

  const setHover = (index: number | null) => {
    setHoverIndex(index);
    notifyHover?.(index === null ? null : data[index]);
  };

  const updateHover = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setHover(Math.round(ratio * (data.length - 1)));
  };

  // The latest point wears its own air-quality color; the IMECA text tones
  // (not the marker fills) so pale zones like yellow still read on white.
  const latestQuality = getQualityInfo(data[data.length - 1].pm25);
  const latestColor = latestQuality?.textColor ?? SPARKLINE_COLOR;

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const hoverPoint = hoverIndex !== null ? points[hoverIndex] : null;
  // The tooltip is pinned just inside the chart's top edge and only tracks the
  // cursor horizontally, so it holds still while you scrub instead of bobbing
  // up and down the line. It stays *inside* the plot area, never above it: the
  // card's PM2.5 headline sits directly overhead, and a tooltip crossing the
  // top edge would cover the very reading the hover is meant to explain. The
  // value domain is padded 15% (domainPadding) so the line's own peak never
  // reaches this band. Percentage for the x offset, not pixels: the SVG draws
  // with preserveAspectRatio="none", so a pixel offset would drift between the
  // base and md heights.
  const tooltipLeftPct = hoverPoint ? (hoverPoint.x / width) * 100 : 0;

  return (
    <div>
      <div className="relative">
        {dayBoundaries.map((b) => (
          <div
            key={b.x}
            className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded bg-white/80 px-1 text-[10px] font-medium leading-none text-gray-500"
            style={{ left: `${b.leftPct}%`, top: 1 }}
          >
            {b.label}
          </div>
        ))}
        {hovered && hoverPoint && (
          <div
            className="pointer-events-none absolute z-20 flex flex-col whitespace-nowrap rounded-lg border border-black/[0.08] bg-white/95 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-[0_6px_24px_rgba(0,0,0,0.1)] backdrop-blur-[6px]"
            style={{
              left: `clamp(70px, ${tooltipLeftPct}%, calc(100% - 70px))`,
              top: 0,
              transform: "translate(-50%, 6px)",
            }}
          >
            {/* Only the hour: the card's headline above shows that hour's
                value and quality while the cursor is on the chart. */}
            <span className="font-medium">{formatHistoryTime(hovered.time_stamp)}</span>
          </div>
        )}
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="h-[190px] cursor-crosshair md:h-[210px]"
          onMouseMove={(e) => updateHover(e.clientX)}
          onMouseLeave={() => setHover(null)}
          onTouchMove={(e) => updateHover(e.touches[0].clientX)}
          onTouchEnd={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SPARKLINE_COLOR} stopOpacity={0.28} />
              <stop offset="100%" stopColor={SPARKLINE_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          {thresholds.map((t) => (
            <line key={t.value} x1={0} y1={toY(t.value)} x2={width} y2={toY(t.value)} stroke={t.color} strokeWidth={1} strokeDasharray="4,3" strokeOpacity={0.45} />
          ))}
          {dayBoundaries.map((b) => (
            <line key={b.x} x1={b.x} y1={0} x2={b.x} y2={height} stroke="#9ca3af" strokeWidth={1} strokeDasharray="2,3" />
          ))}
          <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
          <path d={linePath} fill="none" stroke="white" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          <path d={linePath} fill="none" stroke={SPARKLINE_COLOR} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {/* Current hour — the rightmost point, always marked */}
          <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={4} fill={latestColor} stroke="white" strokeWidth={2} />
          {hoverPoint && hovered && (
            <>
              {/* Crosshair stays neutral (where you are); the dot carries the
                  air-quality tone for that hour (what band it landed in), the
                  same logic as the always-on latest-hour dot. Ink tones, not
                  the marker fills, so pale zones still read on white. */}
              <line x1={hoverPoint.x} y1={0} x2={hoverPoint.x} y2={height} stroke={SPARKLINE_COLOR} strokeWidth={1} strokeDasharray="3,3" strokeOpacity={0.5} />
              <circle cx={hoverPoint.x} cy={hoverPoint.y} r={4} fill={getQualityInfo(hovered.pm25)?.textColor ?? SPARKLINE_COLOR} stroke="white" strokeWidth={2} />
            </>
          )}
        </svg>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3 text-[11px] leading-none text-gray-500">
        <span>Últimas 48 horas</span>
        <span>Máx {Math.round(max)} · Mín {Math.round(min)} μg/m³</span>
      </div>
    </div>
  );
}

// Matches Sparkline's layout (chart area, then the footer row) so there's
// no layout shift once the real data replaces it.
// A generic wavy line + fill, drawn in gray, so the loading state actually
// reads as "a chart" instead of a plain flat rectangle.
const SKELETON_PATH = "M0,150 L20,130 L40,142 L60,95 L80,108 L100,72 L120,90 L140,58 L160,100 L180,78 L200,115 L220,92 L240,60 L260,85 L280,50 L300,72 L320,58";

function SparklineSkeleton() {
  return (
    <div>
      <svg width="100%" height={190} viewBox="0 0 320 190" preserveAspectRatio="none" className="h-[190px] animate-pulse motion-reduce:animate-none md:h-[210px]" aria-hidden="true">
        <path d={`${SKELETON_PATH} L320,190 L0,190 Z`} fill="#f3f4f6" />
        <path d={SKELETON_PATH} fill="none" stroke="#e5e7eb" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mt-1.5 flex items-center text-[11px] leading-none text-gray-500">
        Últimas 48 horas
      </div>
    </div>
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
// `defaultOpen` is what the mobile sheets pass. On desktop the card is already
// on screen and the recommendations are one click below a reading the user
// came for, so they stay collapsed; on mobile the sheet is opened deliberately,
// scrolls anyway, and asking for a second tap to reach the advice is a tap the
// small screen cannot afford. The chevron still collapses it either way.
function HealthRecommendations({ info, onShowInfo, defaultOpen = false }: { info: QualityInfo; onShowInfo: () => void; defaultOpen?: boolean }) {
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
          className="group -my-1 flex min-w-0 flex-1 items-center gap-1.5 rounded-lg py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
        >
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

// External links inside a dialog. One place for the underline, the rel
// hardening, and the note that the link leaves the page, which sighted
// readers get from the new tab and nobody else does.
function DialogLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-sm underline underline-offset-2 transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
    >
      {children}
      <span className="sr-only"> (abre en una nueva pestaña)</span>
    </a>
  );
}

// Every modal on the map runs on the platform's own <dialog>. The browser puts
// it in the top layer, so it clears the map chrome without a z-index to pick;
// makes the rest of the page inert, so focus is trapped and the background is
// hidden from assistive tech; handles Escape; and returns focus to the trigger
// on close. All of that used to be hand-rolled, once per popup. What the
// platform still doesn't give us is click-outside-to-dismiss and holding the
// page still behind the dialog, so that is what is left here.
function DialogShell({
  onClose,
  labelledBy,
  className,
  children,
}: {
  onClose: () => void;
  labelledBy: string;
  className: string;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Kept in a ref so the effect below can depend on nothing. Callers pass a
  // fresh arrow every render, and a dialog re-renders whenever a section
  // inside it opens; re-running the effect on that would return focus to the
  // trigger and then steal it back on every click.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.showModal();
    // Focus the dialog rather than letting the browser land on the first
    // control, so screen readers read the dialog's name before its buttons.
    dialog.focus();

    // A modal dialog sits above the page but doesn't stop it scrolling. The
    // padding stands in for the scrollbar that hiding the overflow removes,
    // so the page doesn't jump sideways underneath the scrim.
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      // Close before React unmounts the node: that is what hands focus back
      // to whatever opened the dialog.
      if (dialog.open) dialog.close();
    };
  }, []);

  // Click-outside, guarded twice. The target check ignores keyboard-driven
  // clicks on the controls inside, which report a (0, 0) pointer; the rect
  // check ignores the dialog's own padding; and requiring the press to have
  // started outside too means a selection dragged out of the dialog doesn't
  // dismiss it on release.
  const pressedOutside = useRef(false);
  const isOutside = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget) return false;
    const rect = event.currentTarget.getBoundingClientRect();
    return (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    );
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      tabIndex={-1}
      // Escape fires cancel; routing it through onClose keeps React state the
      // single source of truth for whether the dialog is open.
      onCancel={(event) => {
        event.preventDefault();
        onCloseRef.current();
      }}
      onMouseDown={(event) => {
        pressedOutside.current = isOutside(event);
      }}
      onClick={(event) => {
        if (pressedOutside.current && isOutside(event)) onCloseRef.current();
      }}
      className={`info-dialog fixed inset-0 m-auto text-gray-800 focus:outline-none ${className}`}
    >
      {children}
    </dialog>
  );
}

// The info popups: a titled sheet with the same header and scrolling body in
// every one of them. Passive dialogs, in the Carbon sense, they present
// information and ask for nothing, so there is no footer action.
function InfoDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const titleId = `dialog-${useId().replace(/:/g, "")}`;

  return (
    <DialogShell
      onClose={onClose}
      labelledBy={titleId}
      /* Glass, like the map panels, but at a higher opacity: this surface
         carries paragraphs rather than chrome, so contrast wins over
         transparency. */
      className="flex max-h-[85svh] w-[85%] max-w-md flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/90 p-8 shadow-xl backdrop-blur-xl"
    >
      {/* The header stays put and only the body scrolls: the X is now the
          only dismiss control on screen, and a dismiss control that scrolls
          out of reach is worse than none. Long content is exactly when you
          need it. */}
      <div className="flex flex-shrink-0 items-start justify-between gap-4 pb-6">
        <h2 id={titleId} className="text-base font-medium text-gray-800">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          /* gray-500, not gray-400: with no footer button left, this icon is
             the only visible way out, and gray-400 on white is 2.54:1 against
             the 3:1 WCAG asks of anything identifying a control. */
          className="-mr-2 -mt-1 flex-shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {/* No footer action. These dialogs present information and ask for
          nothing, so a full-width primary button that only closes would
          invent a decision that isn't there, and read as a consent on a
          definition. The header X, Escape and clicking outside are the
          three ways out. */}
      {/* `grow basis-auto`, not `flex-1`. The UA stylesheet gives <dialog>
          `height: fit-content` and we only ever set a max-height, so this
          column's height is intrinsic, sized from its items' hypothetical
          heights. `flex-1` is `flex: 1 1 0%`, whose hypothetical height is
          zero, so the body contributes nothing to the dialog and can end up
          laid out at 0px, with the dialog's own overflow-hidden clipping the
          copy away: header visible, body blank, which is what iOS Safari did
          to the Recomendaciones popup. With `basis-auto` the base size is the
          content, so it cannot collapse; `min-h-0` and the default shrink
          still let it give way and scroll once the content passes 85svh. */}
      <div className="-mx-1 min-h-0 grow basis-auto overflow-y-auto overscroll-contain px-1">{children}</div>
    </DialogShell>
  );
}

// A titled block inside an info popup that can fold away, so a long popup
// opens on the part that matters and keeps the rest one click away.
function InfoSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const panelId = `section-${useId().replace(/:/g, "")}`;

  return (
    <div className="[&:not(:first-child)]:border-t [&:not(:first-child)]:border-gray-100">
      {/* A row in the dialog's list, matching the Capas panel: the hover is
          the row, and the body opens inside the card on a tinted ground. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15"
      >
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        <ChevronRight className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>
      {/* Hidden rather than unmounted, so aria-controls always points at a
          real element. The hidden attribute takes the body and its links out
          of the tab order and the accessibility tree just as unmounting did,
          and going from display:none back still runs the open animation. */}
      <div
        id={panelId}
        hidden={!open}
        className="disclosure-in border-t border-gray-100 bg-gray-50/60 px-4 py-3.5 text-sm leading-relaxed text-gray-500"
      >
        {children}
      </div>
    </div>
  );
}

type CheckState = 'checked' | 'indeterminate' | 'unchecked';

// Styled after shadcn/ui's Checkbox (rounded-sm, border always in the
// "primary" tone, filled + shadow only once checked) rather than a plain
// light-gray box that suddenly turns dark.
function LayerCheckbox({ state, size }: { state: CheckState; size: number }) {
  if (state === 'unchecked') {
    return (
      <div
        style={{ width: size, height: size, borderRadius: 4, border: '1.5px solid #6b7280', flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center shadow-sm"
      style={{ width: size, height: size, borderRadius: 4, backgroundColor: '#6b7280', flexShrink: 0 }}
    >
      {state === 'checked' ? (
        <Check className="text-white" style={{ width: size - 6, height: size - 6 }} strokeWidth={3} />
      ) : (
        <Minus className="text-white" style={{ width: size - 7, height: size - 7 }} strokeWidth={3} />
      )}
    </div>
  );
}

function LayersFilterContent({
  showOtros,
  setShowOtros,
  showOccamm,
  setShowOccamm,
  showSima,
  setShowSima,
  estados,
  sourceCounts,
  hiddenMunicipios,
  setHiddenMunicipios,
  onShowOccammInfo,
  onShowPM25Info,
  onShowFuenteInfo,
}: {
  showOtros: boolean;
  setShowOtros: Dispatch<SetStateAction<boolean>>;
  showOccamm: boolean;
  setShowOccamm: Dispatch<SetStateAction<boolean>>;
  showSima: boolean;
  setShowSima: Dispatch<SetStateAction<boolean>>;
  estados: { key: string; label: string; count: number; municipios: { key: string; label: string; count: number }[] }[];
  sourceCounts: { occamm: number; otros: number; ciudadanos: number; gobierno: number };
  hiddenMunicipios: string[];
  setHiddenMunicipios: Dispatch<SetStateAction<string[]>>;
  onShowOccammInfo: () => void;
  onShowPM25Info: () => void;
  onShowFuenteInfo: () => void;
}) {
  // Fixed sizes: `compact` was passed false at both call sites, and shrinking
  // rows on mobile is the wrong direction for touch targets anyway.
  const rowPadding = "py-3.5";
  const subRowPadding = "py-3";
  const boxSize = 18;
  // Every row in the panel ends in a 28px control box: an info button, a
  // chevron, or, for the rows that carry neither, this spacer. Without it the
  // counts landed on three different rails depending on which section they
  // were in, and read as a ragged column rather than one list.
  const trailingSlot = <span aria-hidden="true" className="mr-2 h-7 w-7 flex-shrink-0" />;
  const [showCitizenGroup, setShowCitizenGroup] = useState(false);
  const [openEstados, setOpenEstados] = useState<string[]>([]);
  // One section open at a time: three expanded sections is how a filter panel
  // grows past the map it filters.
  const [openSection, setOpenSection] = useState<'ubicacion' | 'fuente' | 'contaminante' | null>('ubicacion');
  const toggleSection = (name: 'ubicacion' | 'fuente' | 'contaminante') =>
    setOpenSection((current) => (current === name ? null : name));
  const citizenState: CheckState =
    showOtros && showOccamm ? 'checked' :
    !showOtros && !showOccamm ? 'unchecked' : 'indeterminate';

  const toggleCitizenGroup = () => {
    const next = citizenState !== 'checked';
    setShowOtros(next);
    setShowOccamm(next);
  };

  // What each collapsed section says about itself, so nobody has to open one
  // just to find out whether it is filtering anything.
  const totalMunicipios = estados.reduce((n, e) => n + e.municipios.length, 0);
  const shownMunicipios = totalMunicipios - hiddenMunicipios.length;
  const ubicacionSummary = hiddenMunicipios.length === 0
    ? "Todos"
    : `${shownMunicipios} de ${totalMunicipios} municipios`;
  // Named, not counted: the panel shows two rows while there are three
  // toggles underneath, so "1 de 3" reads as wrong against two checkboxes.
  const fuenteSummary = (() => {
    if (showOccamm && showOtros && showSima) return "Todas";
    const on: string[] = [];
    if (showOccamm && showOtros) on.push("Ciudadanos");
    else {
      if (showOccamm) on.push("OCCAMM");
      if (showOtros) on.push("Otros");
    }
    if (showSima) on.push("Gobierno");
    return on.length ? on.join(" · ") : "Ninguna";
  })();

  // One control opens the section: label, summary and chevron are a single
  // button, so there is one tab stop and one thing to announce. The info icon
  // is the only other control, and carries its own padding — an unpadded 12px
  // icon is half the practical minimum hit area.
  // The whole panel is one grouped list: a section is a row, and opening it
  // reveals its contents inside the same card on a tinted ground. Three
  // separate cards floating in whitespace left the hover with nothing to
  // belong to, and read as disconnected once every section was collapsed.
  const sectionRow = (
    name: 'ubicacion' | 'fuente' | 'contaminante',
    label: string,
    summary: string,
    info?: { onClick: () => void; ariaLabel: string },
  ) => (
    <div className="flex items-center transition-colors hover:bg-gray-50">
      <button
        type="button"
        onClick={() => toggleSection(name)}
        aria-expanded={openSection === name}
        className="flex min-w-0 flex-1 items-center gap-1.5 py-3.5 pl-4 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15"
      >
        <p className="text-xs font-medium uppercase leading-none tracking-wide text-gray-400">{label}</p>
        <span className="min-w-0 flex-1 truncate text-xs leading-none text-gray-500">· {summary}</span>
        <ChevronRight className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${openSection === name ? 'rotate-90' : ''}`} />
      </button>
      <button
        type="button"
        onClick={info?.onClick}
        disabled={!info}
        className={`mr-2 flex-shrink-0 rounded-lg p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 ${info ? 'text-gray-400 hover:bg-gray-100 hover:text-gray-600' : 'invisible'}`}
        aria-label={info?.ariaLabel ?? ""}
        aria-hidden={!info}
        tabIndex={info ? undefined : -1}
      >
        <Info className="h-3 w-3" />
      </button>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* Ubicación — state, then its municipalities. Every sensor sits under a
          row, so hiding everything really does empty the map. */}
      <div>
        {sectionRow('ubicacion', 'Ubicación', ubicacionSummary)}
        {openSection === 'ubicacion' && (
          <div className="disclosure-in border-t border-gray-100 bg-gray-50/60">
            {estados.map((estado, i) => {
              const keys = estado.municipios.map((m) => m.key);
              const hidden = keys.filter((k) => hiddenMunicipios.includes(k)).length;
              const state: CheckState = hidden === 0 ? 'checked' : hidden === keys.length ? 'unchecked' : 'indeterminate';
              const open = openEstados.includes(estado.key);
              return (
                <div key={estado.key} className={i > 0 ? "border-t border-gray-100" : ""}>
                  <div className="flex w-full items-center transition-colors hover:bg-gray-100/70">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={state === 'indeterminate' ? 'mixed' : state === 'checked'}
                      onClick={() => setHiddenMunicipios((prev) => state === 'checked'
                        ? [...prev, ...keys.filter((k) => !prev.includes(k))]
                        : prev.filter((k) => !keys.includes(k)))}
                      className={`flex min-w-0 flex-1 items-center gap-3 pl-4 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15 ${rowPadding}`}
                    >
                      <LayerCheckbox state={state} size={boxSize} />
                      <span className={`min-w-0 flex-1 truncate text-sm font-medium ${state === 'unchecked' ? 'text-gray-400' : 'text-gray-800'}`}>
                        {estado.label}
                      </span>
                      <span className="flex-shrink-0 text-xs text-gray-500">{estado.count}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenEstados((prev) => open ? prev.filter((k) => k !== estado.key) : [...prev, estado.key])}
                      className="mr-2 flex-shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-200/70 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
                      aria-expanded={open}
                      aria-label={open ? `Ocultar municipios de ${estado.label}` : `Mostrar municipios de ${estado.label}`}
                    >
                      <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
                    </button>
                  </div>
                  {open && (
                    <div role="group" aria-label={`Municipios de ${estado.label}`} className="disclosure-in flex flex-col">
                      {estado.municipios.map((m) => {
                        const on = !hiddenMunicipios.includes(m.key);
                        return (
                          <div key={m.key} className="flex items-center border-t border-gray-100 transition-colors hover:bg-gray-100/70">
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={on}
                              onClick={() => setHiddenMunicipios((prev) => on ? [...prev, m.key] : prev.filter((k) => k !== m.key))}
                              className={`ml-11 flex min-w-0 flex-1 items-center gap-3 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15 ${subRowPadding}`}
                            >
                              <LayerCheckbox state={on ? 'checked' : 'unchecked'} size={boxSize} />
                              <span className={`min-w-0 flex-1 truncate text-sm ${on ? 'text-gray-600' : 'text-gray-400'}`}>{m.label}</span>
                              <span className="flex-shrink-0 text-xs text-gray-500">{m.count}</span>
                            </button>
                            {trailingSlot}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100">
        {sectionRow('fuente', 'Fuente', fuenteSummary, {
          onClick: onShowFuenteInfo,
          ariaLabel: "Más información sobre las fuentes de datos",
        })}
        {openSection === 'fuente' && (
          <div className="disclosure-in border-t border-gray-100 bg-gray-50/60">
            <div className="flex w-full items-center transition-colors hover:bg-gray-100/70">
              <button
                type="button"
                role="checkbox"
                aria-checked={citizenState === 'indeterminate' ? 'mixed' : citizenState === 'checked'}
                onClick={toggleCitizenGroup}
                className={`flex min-w-0 flex-1 items-center gap-3 pl-4 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15 ${rowPadding}`}
              >
                <LayerCheckbox state={citizenState} size={boxSize} />
                <span className={`min-w-0 flex-1 truncate text-sm font-medium ${citizenState === 'unchecked' ? 'text-gray-400' : 'text-gray-800'}`}>Sensores Ciudadanos</span>
                <span className="flex-shrink-0 text-xs text-gray-500">{sourceCounts.ciudadanos}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCitizenGroup((v) => !v)}
                className="mr-2 flex-shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-200/70 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
                aria-expanded={showCitizenGroup}
                aria-label={showCitizenGroup ? "Ocultar OCCAMM y Otros" : "Mostrar OCCAMM y Otros"}
              >
                <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${showCitizenGroup ? 'rotate-90' : ''}`} />
              </button>
            </div>
            {showCitizenGroup && (
              <div role="group" aria-label="Redes de sensores ciudadanos" className="disclosure-in flex flex-col">
                <div className="flex items-center border-t border-gray-100 transition-colors hover:bg-gray-100/70">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={showOccamm}
                    onClick={() => setShowOccamm((v) => !v)}
                    className={`ml-11 flex min-w-0 flex-1 items-center gap-3 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15 ${subRowPadding}`}
                  >
                    <LayerCheckbox state={showOccamm ? 'checked' : 'unchecked'} size={boxSize} />
                    <span className={`min-w-0 flex-1 truncate text-sm ${showOccamm ? 'text-gray-600' : 'text-gray-400'}`}>OCCAMM</span>
                    <span className="flex-shrink-0 text-xs text-gray-500">{sourceCounts.occamm}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onShowOccammInfo}
                    className="mr-2 flex-shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-200/70 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
                    aria-label="Más información sobre OCCAMM"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </div>
                {/* Same two-part row as OCCAMM above, with an invisible stand-in
                    for the info button. It used to reserve that space with a
                    hand-computed pr-[2.375rem], which was 2px short of what the
                    button actually measures, so the two counts did not line up.
                    sectionRow already reserves its own info slot this way. */}
                <div className="flex items-center border-t border-gray-100 transition-colors hover:bg-gray-100/70">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={showOtros}
                    onClick={() => setShowOtros((v) => !v)}
                    className={`ml-11 flex min-w-0 flex-1 items-center gap-3 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15 ${subRowPadding}`}
                  >
                    <LayerCheckbox state={showOtros ? 'checked' : 'unchecked'} size={boxSize} />
                    <span className={`min-w-0 flex-1 truncate text-sm ${showOtros ? 'text-gray-600' : 'text-gray-400'}`}>Otros</span>
                    <span className="flex-shrink-0 text-xs text-gray-500">{sourceCounts.otros}</span>
                  </button>
                  {trailingSlot}
                </div>
              </div>
            )}
            <div className="flex items-center border-t border-gray-100 transition-colors hover:bg-gray-100/70">
              <button
                type="button"
                role="checkbox"
                aria-checked={showSima}
                onClick={() => setShowSima((v) => !v)}
                className={`flex min-w-0 flex-1 items-center gap-3 pl-4 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15 ${rowPadding}`}
              >
                <LayerCheckbox state={showSima ? 'checked' : 'unchecked'} size={boxSize} />
                <span className={`min-w-0 flex-1 truncate text-sm font-medium ${showSima ? 'text-gray-800' : 'text-gray-400'}`}>Estaciones de Gobierno</span>
                <span className="flex-shrink-0 text-xs text-gray-500">{sourceCounts.gobierno}</span>
              </button>
              {trailingSlot}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100">
        {sectionRow('contaminante', 'Contaminante', 'PM2.5', {
          onClick: onShowPM25Info,
          ariaLabel: "Por qué medimos PM2.5",
        })}
        {/* No control here: unlike the filters above this is a selector, and
            with PM2.5 as the only live option there is nothing to operate. */}
        {openSection === 'contaminante' && (
          <div className="disclosure-in border-t border-gray-100 bg-gray-50/60">
            <div className={`flex items-center gap-3 pl-4 pr-2 ${rowPadding}`}>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">PM2.5</span>
              <Check className="h-4 w-4 flex-shrink-0 text-gray-700" strokeWidth={2.5} />
              {trailingSlot}
            </div>
            {["PM10", "Ozono"].map((name) => (
              <div
                key={name}
                className={`flex items-center gap-3 border-t border-gray-100 pl-4 pr-2 ${rowPadding}`}
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-400">{name}</span>
                <span className="flex-shrink-0 text-xs text-gray-500">No disponible</span>
                {trailingSlot}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// MapaSensors component
export default function MapaSensors({
  sensors,
  data,
}: {
  sensors: Sensor[];
  data: Data[];
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const markerElementsRef = useRef(new globalThis.Map<number, HTMLElement>());

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showFiltrosContent, setShowFiltrosContent] = useState(false); // desktop only — Filtros body starts collapsed
  const [showCalidadContent, setShowCalidadContent] = useState(true); // desktop only — Calidad del aire body starts expanded
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showOtros, setShowOtros] = useState(true);
  const [showOccammInfo, setShowOccammInfo] = useState(false);
  const [showPM25Info, setShowPM25Info] = useState(false);
  // One pollutant open at a time in its popup; opening another closes it.
  const [openPollutant, setOpenPollutant] = useState<string | null>("PM2.5");
  const [openFuente, setOpenFuente] = useState<string | null>("Sensores Ciudadanos");
  const [showFuenteInfo, setShowFuenteInfo] = useState(false);
  const [showSima, setShowSima] = useState(true);
  const [hiddenMunicipios, setHiddenMunicipios] = useState<string[]>([]);
  const [showOccamm, setShowOccamm] = useState(true);
  const [selectedSensor, setSelectedSensor] = useState<{
    sensor: Sensor;
    pm25: number | null;
    color: string;
    textColor: string;
    // Raw, not pre-formatted: the badge needs to work out how old this is.
    readingAt: string | null;
  } | null>(null);
  const [sensorHistory, setSensorHistory] = useState<HistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSensorDetail, setShowSensorDetail] = useState(false);
  const [showNearestDetail, setShowNearestDetail] = useState(false);
  const [sheetState, setSheetState] = useState<'peek' | 'mid'>('peek');
  const [showQualitySource, setShowQualitySource] = useState(false);
  const [cuidarmeQuality, setCuidarmeQuality] = useState<QualityInfo | null>(null);
  // Point the cursor is on in the 48h chart. While set, the card's headline
  // reports that hour instead of the latest reading, so the chart and the big
  // number never disagree.
  const [hoveredHistory, setHoveredHistory] = useState<HistoryPoint | null>(null);
  // idle -> locating -> active | denied | unavailable. This used to be a lone
  // boolean that only recorded PERMISSION_DENIED, so a timeout or a failed fix
  // left the button sitting in its resting state with nothing to show for the
  // click, forever.
  const [locationStatus, setLocationStatus] =
    useState<'idle' | 'locating' | 'active' | 'denied' | 'unavailable'>('idle');
  // Whether the permission check has finished. The opening camera waits on it,
  // so a visitor who already granted access gets one flight, to themselves,
  // instead of one to the default station and another back.
  const [permissionChecked, setPermissionChecked] = useState(false);
  const userMarkerRef = useRef<Marker | null>(null);
  const [showLocationTip, setShowLocationTip] = useState(false);

  // One entry per municipality that actually has sensors, labelled with its
  // best spelling and counted so the list says how much each filter holds.
  // Two levels, state then municipality, so every sensor sits under a row:
  // the map reaches into Coahuila (Saltillo, Arteaga) even though this
  // observatory follows the Monterrey metro area.
  const estados = useMemo(() => {
    const byState = new globalThis.Map<string, {
      key: string;
      label: string;
      count: number;
      municipios: globalThis.Map<string, { key: string; label: string; count: number }>;
    }>();

    sensors.forEach((sensor) => {
      const sKey = estadoKey(sensor.estado);
      const mKey = municipioKey(sensor.municipio);
      if (!sKey || !mKey) return;

      let state = byState.get(sKey);
      if (!state) {
        state = { key: sKey, label: sensor.estado!.trim(), count: 0, municipios: new globalThis.Map() };
        byState.set(sKey, state);
      }
      state.count += 1;
      // Prefer the accented spelling wherever the data disagrees with itself
      if (/[^\x00-\x7F]/.test(sensor.estado!) && !/[^\x00-\x7F]/.test(state.label)) state.label = sensor.estado!.trim();

      const label = sensor.municipio!.trim();
      const municipio = state.municipios.get(mKey);
      if (!municipio) {
        state.municipios.set(mKey, { key: mKey, label, count: 1 });
        return;
      }
      municipio.count += 1;
      if (/[^\x00-\x7F]/.test(label) && !/[^\x00-\x7F]/.test(municipio.label)) municipio.label = label;
    });

    return Array.from(byState.values())
      .map((state) => ({
        ...state,
        municipios: Array.from(state.municipios.values()).sort((a, b) => a.label.localeCompare(b.label, "es")),
      }))
      .sort((a, b) => b.count - a.count);
  }, [sensors]);

  // How many sensors each source contributes, so the Fuente rows carry the
  // same information the Ubicación rows do.
  const sourceCounts = useMemo(() => {
    const occamm = sensors.filter((sensor) => sensor.source !== "sima" && sensor.red).length;
    const otros = sensors.filter((sensor) => sensor.source !== "sima" && !sensor.red).length;
    return { occamm, otros, ciudadanos: occamm + otros, gobierno: sensors.filter((s) => s.source === "sima").length };
  }, [sensors]);

  const visibleSensors = useMemo(
    () => sensors.filter((sensor) => {
      if (hiddenMunicipios.includes(municipioKey(sensor.municipio) ?? "")) return false;
      if (sensor.source === "sima") return showSima;
      return sensor.red ? showOccamm : showOtros;
    }),
    [sensors, hiddenMunicipios, showSima, showOccamm, showOtros],
  );

  // What the panel says about itself in its own header, so the collapsed card
  // answers "is the map filtered?" rather than holding 380px of empty glass
  // around one word. Counted over sensors that actually have a reading, since
  // those are the only ones drawn: a total that included silent sensors would
  // never match the dots you can see.
  const capasSummary = useMemo(() => {
    const reporting = new Set(
      data.filter((d) => d.pm25 !== null && d.pm25 > 0.4).map((d) => d.sensor_id),
    );
    const mapped = sensors.filter((sensor) => reporting.has(sensor.sensor_id)).length;
    if (!mapped) return null;
    const shown = visibleSensors.filter((sensor) => reporting.has(sensor.sensor_id)).length;
    return shown === mapped ? "Todos los sensores" : `${shown} de ${mapped} sensores`;
  }, [sensors, visibleSensors, data]);

  const nearestSensorData = useMemo(() => {
    if (!visibleSensors.length || !data.length) return null;

    const buildFromSensor = (sensor: Sensor) => {
      const d = data.find((item) => item.sensor_id === sensor.sensor_id);
      if (!d || d.pm25 === null || d.pm25 <= 0.4) return null;
      const isSima = sensor.source === "sima";
      const name = isSima && sensor.nombre_display ? sensor.nombre_display : sensor.nombre;
      return { pm25: d.pm25, readingAt: d.time_stamp, name, isSima, red: sensor.red ?? null, lat: sensor.lat, lon: sensor.lon, sensorId: sensor.sensor_id };
    };

    if (userLocation) {
      const sorted = [...visibleSensors].sort((a, b) =>
        getDistance(userLocation.latitude, userLocation.longitude, a.lat, a.lon) -
        getDistance(userLocation.latitude, userLocation.longitude, b.lat, b.lon)
      );
      for (const sensor of sorted) {
        const result = buildFromSensor(sensor);
        if (result) return result;
      }
    }

    // No location shared (or nothing near it reporting) — open on a fixed
    // representative sensor (TEC-AMM-RB-006), then fall through to any
    // sensor that has a reading: the card always speaks for a real sensor,
    // never for an area average.
    const defaultSensor = visibleSensors.find((s) => String(s.sensor_id) === DEFAULT_SENSOR_ID);
    const fromDefault = defaultSensor ? buildFromSensor(defaultSensor) : null;
    if (fromDefault) return fromDefault;

    for (const sensor of visibleSensors) {
      const result = buildFromSensor(sensor);
      if (result) return result;
    }
    return null;
  }, [userLocation, visibleSensors, data]);

  const areaMedianPm25 = useMemo(() => {
    const visibleIds = new Set(visibleSensors.map((sensor) => sensor.sensor_id));
    const values = data
      .filter((d) => visibleIds.has(d.sensor_id))
      .map((d) => d.pm25)
      .filter((v): v is number => v !== null && v > 0.4);
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }, [data, visibleSensors]);

  // The newest reading anywhere in the data set, which is what the freshness
  // badge reports. Kept as a Date rather than a formatted string: the badge needs to know how
  // old this is, and formatting the age away here is what let it insist the
  // map was live however long the pipeline had been down.
  const latestReading = useMemo(() => {
    let newest = 0;
    for (const d of data) {
      const t = new Date(d.time_stamp).getTime();
      if (!Number.isNaN(t) && t > newest) newest = t;
    }
    return newest ? new Date(newest) : null;
  }, [data]);

  // Null until mounted, so the server and the first client render agree on a
  // value that is by definition different on each; then re-read on a timer,
  // because a tab left open all afternoon should watch the badge go amber
  // rather than sit on the state it had at page load.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const hoveredQuality = hoveredHistory ? getQualityInfo(hoveredHistory.pm25) : null;

  // The badge reports the reading that is actually on screen: the open
  // sensor's, else the one the card opened on. Sensors publish on their own
  // schedules, so a single dataset-wide "newest anywhere" would sit ahead of
  // the station being shown and make a perfectly current reading look late.
  // The newest reading anywhere is only the fallback, for when no sensor is
  // speaking for itself.
  //
  // Readings land hourly, so 90 minutes is one missed cycle plus slack, and
  // six hours is a pipeline that has stopped rather than a run that is late.
  // Past today the label picks up the day, so "11:00 AM" can never be
  // yesterday's 11:00 AM wearing a green dot.
  const freshness = useMemo<Freshness | null>(() => {
    if (now === null) return null;
    const onScreen = selectedSensor?.readingAt ?? nearestSensorData?.readingAt ?? null;
    const reading = onScreen ? new Date(onScreen) : latestReading;
    if (!reading || Number.isNaN(reading.getTime())) return null;

    const age = now - reading.getTime();
    const hour = `${format(reading, "h")}:00 ${format(reading, "a")}`;
    const day = getRelativeDayLabel(reading);
    return {
      dateTime: reading.toISOString(),
      when: day === "Hoy" ? hour : `${day.toLowerCase()} ${hour}`,
      status: age < 90 * 60 * 1000 ? "fresh" : age < 6 * 60 * 60 * 1000 ? "delayed" : "stale",
    };
  }, [selectedSensor, nearestSensorData, latestReading, now]);

  // What the location control says and shows. The arrow stays in every state:
  // swapping it for a dot when located made the button an exact copy of the
  // freshness badge in the opposite corner, which is not a control at all, and
  // took away the one glyph that says "this recentres the map".
  const locationBlocked = locationStatus === 'denied' || locationStatus === 'unavailable';
  const locationLabel =
    locationStatus === 'locating' ? 'Buscando…' : userLocation ? 'Mi ubicación' : 'Activar ubicación';
  // gray-500, not gray-400: the resting state is the one asking to be clicked,
  // and at 2.5:1 it was dimmer than the state it leads to. Active also fills
  // the arrow (fill-current), the outline-to-solid flip Apple and Google Maps
  // use for "now tracking", so on/off is not carried by colour alone.
  const locationIconTone = userLocation
    ? 'text-blue-500 fill-current'
    : locationStatus === 'locating'
      ? 'text-gray-400 animate-pulse motion-reduce:animate-none'
      : 'text-gray-500';
  const onLocationClick = () => {
    if (userLocation) flyToUser();
    else if (locationBlocked) setShowLocationTip(true);
    else locate();
  };

  const nearestPm25 = nearestSensorData?.pm25 ?? null;
  const nearestName = nearestSensorData?.name ?? null;
  const nearestIsSima = nearestSensorData?.isSima ?? null;
  const nearestRed = nearestSensorData?.red ?? null;
  const nearestLat = nearestSensorData?.lat ?? null;
  const nearestLon = nearestSensorData?.lon ?? null;
  const displayPm25 = nearestPm25 ?? areaMedianPm25;
  const qualityInfo = getQualityInfo(displayPm25);

  // Initialize map once
  useEffect(() => {
    if (map.current) return;

    map.current = new Map({
      container: mapContainer.current!,
      style: "mapbox://styles/edgargutgzz/climactgb00cn01qw7amo9bbd",
      center: [-100.301, 25.685],
      zoom: 8,
    });

    // Set padding instantly (not as part of flyTo) so it doesn't get
    // interpolated alongside the zoom animation, which looked like the map
    // veering sideways partway through the fly-in.
    const initialIsMobile = window.innerWidth < 768;
    (map.current as any).setPadding(
      initialIsMobile ? { top: 0, bottom: 180, left: 0, right: 0 } : { top: 0, bottom: 0, left: 0, right: 280 }
    );

    map.current.on("load", () => setMapLoaded(true));

    return () => {
      (map.current as any)?.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, []);

  // Opening camera. Without a shared location we fly to the default station
  // at the same zoom flyToUser uses, so the map opens the way it would if the
  // visitor happened to be standing next to it. Runs once.
  const didOpeningFlyRef = useRef(false);
  useEffect(() => {
    if (!mapLoaded || !map.current || didOpeningFlyRef.current || userLocation) return;
    // Hold while a granted permission is still resolving. Flying to the
    // default station and then to the visitor a second later is two camera
    // moves where the visitor only ever wanted one.
    if (!permissionChecked || locationStatus === 'locating') return;

    const target = nearestSensorData
      ? [nearestSensorData.lon, nearestSensorData.lat]
      : [-100.301, 25.685];
    didOpeningFlyRef.current = true;

    const isMobile = window.innerWidth < 768;
    (map.current as any).setPadding(
      isMobile ? { top: 0, bottom: 180, left: 0, right: 0 } : { top: 0, bottom: 0, left: 0, right: 280 }
    );
    (map.current as any).flyTo({
      center: target,
      zoom: nearestSensorData ? 14 : 10.5,
      duration: 3000,
      essential: true,
    });
  }, [mapLoaded, userLocation, nearestSensorData, permissionChecked, locationStatus]);

  // `silent` is the already-granted path on load: no one clicked, so a failure
  // there should not throw a dialog at someone who never asked for one.
  const locate = useCallback((silent = false) => {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable');
      return;
    }
    setLocationStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus('active');
      },
      (error) => {
        // 1 PERMISSION_DENIED, 2 POSITION_UNAVAILABLE, 3 TIMEOUT. Only the
        // first was ever recorded; the other two fell on the floor, which is
        // how a click could lead to nothing at all and stay there.
        setLocationStatus(error.code === 1 ? 'denied' : 'unavailable');
        if (!silent) setShowLocationTip(true);
      },
      // Without a timeout a hung request never resolves and never reports.
      // A five minute cache makes the already-granted path near instant.
      { timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  // Read the permission on load. Granted means the visitor already said yes, so
  // resolving it costs them no prompt and the map can open where they are.
  // "prompt" is deliberately left alone: asking for location before anyone has
  // asked for anything is how you collect a permanent denial.
  useEffect(() => {
    const permissions = navigator.permissions;
    if (!navigator.geolocation || !permissions?.query) {
      setPermissionChecked(true);
      return;
    }
    let cancelled = false;
    let permission: PermissionStatus | null = null;

    const apply = (state: PermissionState) => {
      if (cancelled) return;
      if (state === 'granted') locate(true);
      else if (state === 'denied') setLocationStatus('denied');
      else setLocationStatus('idle');
    };

    permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (cancelled) return;
        permission = status;
        apply(status.state);
        // Picks up a change made in the browser's own site settings, so the
        // denied dead end can be undone without a reload.
        status.onchange = () => apply(status.state);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPermissionChecked(true);
      });

    return () => {
      cancelled = true;
      if (permission) permission.onchange = null;
    };
  }, [locate]);

  const flyToUser = useCallback(() => {
    if (!userLocation || !map.current) return;
    const isMobile = window.innerWidth < 768;
    (map.current as any).setPadding(
      isMobile ? { top: 0, bottom: 180, left: 0, right: 0 } : { top: 0, bottom: 0, left: 0, right: 280 }
    );
    (map.current as any).flyTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 14,
      duration: 3000,
      essential: true,
    });
  }, [userLocation]);

  // Add user location marker when available
  useEffect(() => {
    if (!userLocation || !mapLoaded || !map.current) return;

    flyToUser();

    // Same two-span build as the sensor markers: the halo is a sibling drawn
    // before the dot, so it expands behind it the way Google's does.
    const userMarkerElement = document.createElement("div");
    userMarkerElement.className = "location-dot location-dot--map";
    userMarkerElement.innerHTML =
      '<span class="location-dot__pulse"></span><span class="location-dot__core"></span>';
    // Above the sensor field, including a selected sensor: it answers "where am
    // I", which stays true whatever the markers around it are doing.
    userMarkerElement.style.zIndex = USER_MARKER_Z.toString();

    // Replace rather than add: a permission granted mid-session runs this a
    // second time, and the old marker used to stay behind on the map.
    (userMarkerRef.current as any)?.remove();
    userMarkerRef.current = new Marker({ element: userMarkerElement })
      .setLngLat([userLocation.longitude, userLocation.latitude])
      .addTo(map.current);
  }, [userLocation, mapLoaded, flyToUser]);

  // Add sensors when both map and data are ready
  useEffect(() => {
    if (!mapLoaded || !map.current || !sensors.length || !data.length) {
      return;
    }

    markersRef.current.forEach((marker) => (marker as any).remove());
    markersRef.current = [];
    markerElementsRef.current.clear();

    // North to south, so the southern marker of an overlapping pair is appended
    // last and paints in front. Mapbox's own symbol convention (viewport-y),
    // and the point is that latitude has nothing to do with the reading: any
    // order that tracked PM2.5 would decide overlaps in favour of one end of
    // the scale and quietly bias every cluster on the map.
    [...sensors].sort((a, b) => b.lat - a.lat).forEach((sensor) => {
      const isSima = sensor.source === "sima";

      if (hiddenMunicipios.includes(municipioKey(sensor.municipio) ?? "")) return;
      if (isSima && !showSima) return;
      if (!isSima) {
        const inOccamm = !!sensor.red;
        if (inOccamm ? !showOccamm : !showOtros) return;
      }

      const latestData = data.find(
        (dataItem) => dataItem.sensor_id === sensor.sensor_id,
      );

      const sensorLabel = isSima && sensor.nombre_display ? sensor.nombre_display : sensor.nombre;
      const markerQuality = getQualityInfo(latestData?.pm25 ?? null);
      const markerElement = createMarker(
        latestData ? latestData.pm25 : null,
        [sensorLabel, latestData?.pm25 != null ? `${roundPM25(latestData.pm25)} μg/m³ PM2.5` : null, markerQuality?.label]
          .filter(Boolean)
          .join(", "),
      );

      if (!markerElement) return;

      const colorInfo = getPM25Color(latestData?.pm25 ?? null);
      const color = colorInfo?.bg ?? "#ffffff";
      const textColor = colorInfo?.text ?? "#ffffff";

      markerElement.style.cursor = "pointer";
      markerElement.addEventListener("click", (e) => {
        e.stopPropagation();
        const isDesktop = window.innerWidth >= 768;
        if (isDesktop && selectedSensor?.sensor.sensor_id === sensor.sensor_id) {
          setSelectedSensor(null);
          return;
        }
        setSelectedSensor({ sensor, pm25: latestData?.pm25 ?? null, color, textColor, readingAt: latestData?.time_stamp ?? null });
      });

      markerElementsRef.current.set(sensor.sensor_id, markerElement);

      const marker = new Marker({ element: markerElement })
        .setLngLat([sensor.lon, sensor.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [mapLoaded, sensors, data, showOtros, showOccamm, showSima, hiddenMunicipios]);

  // Cleanup markers when component unmounts
  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => (marker as any).remove());
      markersRef.current = [];
    };
  }, []);

  // Fetch the last 48h of readings for the trend sparkline — the selected
  // sensor if one is picked, otherwise the nearest sensor (same one backing
  // the default "Calidad del aire" card), so the graph is visible by default.
  useEffect(() => {
    const target = selectedSensor
      ? { sensorId: selectedSensor.sensor.sensor_id, source: selectedSensor.sensor.source }
      : nearestSensorData
        ? { sensorId: nearestSensorData.sensorId, source: nearestSensorData.isSima ? "sima" : "purpleAir" }
        : null;

    if (!target) {
      setSensorHistory([]);
      setHistoryLoading(false);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    fetch(`/api/sensor-history?sensor_id=${target.sensorId}&source=${target.source}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSensorHistory(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setSensorHistory([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSensor?.sensor.sensor_id, selectedSensor?.sensor.source, nearestSensorData?.sensorId, nearestSensorData?.isSima]);

  // Highlight the active marker — the explicitly selected sensor if there is
  // one, otherwise the nearest/default sensor — with a ring and a pulsing halo
  // in that sensor's own air-quality tone, the same one the card's headline
  // wears. No resize, no dimming of the other markers: those read as broken or
  // as too much, since there is always a default "active" sensor.
  useEffect(() => {
    if (!mapLoaded) return;

    const activeSensorId = selectedSensor
      ? selectedSensor.sensor.sensor_id
      : nearestSensorData
        ? sensors.find(s => s.lat === nearestSensorData.lat && s.lon === nearestSensorData.lon)?.sensor_id
        : undefined;

    // The selected sensor's own air-quality tone. The ink, not the fill: on a
    // light map pure IMECA yellow and green barely register as a ring, and the
    // darker tone keeps the ring from merging into the circle it wraps.
    const activePm25 = data.find((d) => d.sensor_id === activeSensorId)?.pm25 ?? null;
    const activeColor = getQualityInfo(activePm25)?.textColor ?? SPARKLINE_COLOR;

    markerElementsRef.current.forEach((el, sensorId) => {
      const isActive = sensorId === activeSensorId;
      el.classList.toggle('sensor-marker--selected', isActive);
      el.style.setProperty('--pulse-color', activeColor);
      // Lifted only while selected, and then straight back into latitude order.
      // This is a response to what the visitor just asked for, not a standing
      // opinion about which readings matter, so it does not bias the field.
      // It used to write to el.parentElement, which mapbox shares between all
      // markers, so it set and unset one node once per marker and the active
      // one was only ever lifted if it happened to be iterated last.
      el.style.zIndex = isActive ? ACTIVE_MARKER_Z.toString() : "";
    });
  }, [nearestSensorData, mapLoaded, sensors, data, showSima, showOtros, showOccamm, selectedSensor]);

  // A chart that unmounts mid-hover (new sensor picked, history reloaded)
  // never fires its mouseleave, so drop the stale point explicitly.
  useEffect(() => {
    setHoveredHistory(null);
  }, [sensorHistory, selectedSensor]);

  // Filters can hide whatever is open: drop the selection rather than leave the
  // card describing a sensor that is no longer on the map.
  useEffect(() => {
    if (!selectedSensor) return;
    if (!visibleSensors.some((sensor) => sensor.sensor_id === selectedSensor.sensor.sensor_id)) {
      setSelectedSensor(null);
    }
  }, [visibleSensors, selectedSensor]);

  // Tapping the map dismisses the sensor sheet on mobile, where that gesture
  // is how you get back to the map. On desktop the card stays on whatever was
  // last picked: clicking empty map is panning, not "forget my selection".
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    const handler = () => {
      if (window.innerWidth < 768) setSelectedSensor(null);
    };
    map.current.on("click", handler);
    return () => { (map.current as any)?.off("click", handler); };
  }, [mapLoaded]);

  const sheetTransform = sheetState === 'mid' ? 'translateY(0)' : 'translateY(calc(100% - 5.5rem))';

  const handleSheetTap = useCallback(() => {
    setSheetState((s) => s === 'peek' ? 'mid' : 'peek');
  }, []);

  return (
    <div className="relative h-below-header">
      {/* Map container */}
      <div
        ref={mapContainer}
        className="absolute left-0 top-0 h-full w-full"
      />

      {/* Mobile right-side buttons — hidden when sheet is expanded */}
      {sheetState === 'peek' && (
        <div className="fixed right-6 z-[45] flex flex-col gap-2 md:hidden" style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 6.5rem)' }}>
          <button
            type="button"
            onClick={onLocationClick}
            disabled={locationStatus === 'locating'}
            aria-busy={locationStatus === 'locating'}
            className={`rounded-xl border p-3 shadow-sm backdrop-blur-md transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 ${userLocation ? 'border-gray-900/30 bg-white/90' : 'border-white/60 bg-white/80'}`}
            aria-label={locationLabel}
          >
            <Navigation className={`h-5 w-5 transition-colors ${locationIconTone}`} aria-hidden="true" />
          </button>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`rounded-xl border p-3 backdrop-blur-md shadow-sm transition-colors duration-200 ${showFilters ? 'border-gray-900/30 bg-white/90' : 'border-white/60 bg-white/80'}`}
            aria-label="Capas"
          >
            <Layers className={`h-5 w-5 ${showFilters ? 'text-gray-900' : 'text-gray-700'}`} />
          </button>
        </div>
      )}

      {/* Layers filter backdrop — mobile only */}
      <div
        className={`fixed inset-0 z-[46] bg-black/20 transition-opacity duration-300 md:hidden ${
          showFilters ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setShowFilters(false)}
      />

      {/* Layers filter panel — mobile: slides up from bottom */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[47] rounded-t-3xl bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)] md:hidden"
        style={{
          transform: showFilters ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div
          className="flex-shrink-0 cursor-grab select-none px-5 pb-4 pt-3"
          onClick={() => setShowFilters(false)}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300/60" />
          <p className="text-base font-medium text-gray-700">Capas</p>
        </div>
        <div
          className="flex max-h-[70svh] flex-col gap-3 overflow-y-auto overscroll-contain px-5"
          style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 2rem)' }}
        >
          <LayersFilterContent
            showOtros={showOtros}
            setShowOtros={setShowOtros}
            showOccamm={showOccamm}
            setShowOccamm={setShowOccamm}
            showSima={showSima}
            setShowSima={setShowSima}
            estados={estados}
                sourceCounts={sourceCounts}
            hiddenMunicipios={hiddenMunicipios}
            setHiddenMunicipios={setHiddenMunicipios}
            onShowOccammInfo={() => setShowOccammInfo(true)}
            onShowPM25Info={() => setShowPM25Info(true)}
            onShowFuenteInfo={() => setShowFuenteInfo(true)}
          />
          <AirQualityLegend className="border-t border-gray-100 pt-4" />
        </div>
      </div>

      {/* Desktop right area — quality card, replaced by the selected sensor's card when one is
          selected. Nav lives in the site-wide header now, not floating here.

          The exact mirror of the Capas column: top-6 to bottom-12, the panel
          on top taking whatever height is left, and this side's control, the
          Ubicación chip, pinned to the bottom of the column with mt-auto.

          Both halves of that matter. The chip used to be its own absolutely
          positioned box at bottom-12 right-6, which is where the card's
          bottom edge landed once the card was bounded: same z-10, later in
          the DOM, so the card painted straight over the control. And because
          the left column reserves h-10 + gap-2 for its freshness badge while
          this one reserved nothing, the card also ran 48px lower than the
          Capas panel beside it. One column with a pinned control fixes both:
          the two panels now end on the same line because they reserve the
          same slot, and neither control can be covered by a sibling. */}
      <div className="pointer-events-none absolute bottom-12 right-6 top-6 z-10 hidden flex-col items-end gap-2 md:flex">

        {/* Quality card, replaced by the selected sensor's card when one is selected */}
        <div className="flex min-h-0 w-panel-lg flex-col">
        {selectedSensor ? (() => {
          const { sensor, pm25, color, textColor } = selectedSensor;
          const isSima = sensor.source === "sima";
          const sensorName = isSima && sensor.nombre_display ? sensor.nombre_display : sensor.nombre;
          const sensorQuality = getQualityInfo(pm25);
          return (
            <div className="pointer-events-auto flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-md">
              {/* Always-visible header */}
              <button
                type="button"
                onClick={() => setShowCalidadContent(v => !v)}
                aria-expanded={showCalidadContent}
                aria-controls="calidad-card-body"
                className="flex w-full flex-shrink-0 items-center justify-between gap-3 px-5 pt-4 pb-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15"
              >
                <span className="min-w-0 flex-1 truncate text-base font-medium text-gray-700">{sensorName}</span>
                <ChevronRight aria-hidden="true" className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${showCalidadContent ? 'rotate-90' : ''}`} />
              </button>
              {/* Kept mounted so aria-controls always resolves; `hidden` keeps
                  the controls inside out of the tab order while it is shut. */}
              <div id="calidad-card-body" hidden={!showCalidadContent} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className={`disclosure-in flex flex-col gap-5 px-5 pt-3 ${sensorQuality ? 'pb-0' : 'pb-6'}`}>
                  {/* What kind of source this is, in the Capas panel's own
                      words. A rule underneath closes the group off from the
                      reading below: a card or a filled row is too much
                      furniture for a single line. */}
                  <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-5">
                    <span className="flex min-w-0 items-center gap-1.5 text-sm leading-none text-gray-500">
                      {(() => { const SourceIcon = getSourceIcon(isSima); return <SourceIcon aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />; })()}
                      <span className="truncate">{getSourceLabel(isSima, sensor.red)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${sensor.lat.toFixed(5)}, ${sensor.lon.toFixed(5)}`);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      className="-my-1 -mr-1 flex flex-shrink-0 items-center gap-1 rounded-lg p-1 text-sm leading-none text-gray-500 transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
                      aria-label="Copiar coordenadas"
                    >
                      {copied ? <Check aria-hidden="true" className="h-3.5 w-3.5 text-gray-400" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5 text-gray-400" />}
                      <span>{copied ? 'Copiado' : 'Coordenadas'}</span>
                    </button>
                  </div>

                  {/* Reading now and the last 48h are one story: the big
                      number is just the newest point on the chart below it. */}
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase leading-none tracking-wide text-gray-400">Calidad del Aire</p>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 flex-1 truncate text-2xl font-bold" style={{ color: (hoveredQuality ?? sensorQuality)?.textColor ?? textColor }}>
                          {(hoveredQuality ?? sensorQuality)?.label ?? "—"}
                        </span>
                        {/* The chips' idiom: the number is the value and
                            carries gray-700, the unit is the quiet half. */}
                        {(hoveredHistory?.pm25 ?? pm25) !== null && (
                          <span className="flex-shrink-0 whitespace-nowrap text-sm text-gray-500">
                            <span className="font-medium text-gray-700">{roundPM25(hoveredHistory?.pm25 ?? pm25)}</span> μg/m³ PM2.5
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Trend sparkline — power-user context (raw history, not just a snapshot) */}
                    <div>
                      {historyLoading ? <SparklineSkeleton /> : <Sparkline data={sensorHistory} onHoverChange={setHoveredHistory} />}
                    </div>
                  </div>
                </div>

                {/* Recommendations — collapsed by default, not needed for a data-first platform */}
                {sensorQuality && (
                  <div className="disclosure-in relative z-[1] mt-5 border-t border-gray-100 px-5 pb-5 pt-5">
                    <HealthRecommendations info={sensorQuality} onShowInfo={() => setCuidarmeQuality(sensorQuality)} />
                  </div>
                )}
              </div>
              <span role="status" className="sr-only">{copied ? 'Coordenadas copiadas' : ''}</span>
            </div>
          );
        })() : qualityInfo && (
          <div className="pointer-events-auto flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-md">
            {/* Always-visible header */}
            <button
              type="button"
              onClick={() => setShowCalidadContent(v => !v)}
              aria-expanded={showCalidadContent}
              aria-controls="calidad-card-body"
              className="flex w-full flex-shrink-0 items-center justify-between gap-3 px-5 pt-4 pb-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15"
            >
              <span className="min-w-0 flex-1 truncate text-base font-medium text-gray-700">
                {nearestName ?? "Zona Metropolitana de Monterrey"}
              </span>
              <ChevronRight aria-hidden="true" className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${showCalidadContent ? 'rotate-90' : ''}`} />
            </button>
            {/* Kept mounted so aria-controls always resolves; `hidden` keeps
                the controls inside out of the tab order while it is shut. */}
            <div id="calidad-card-body" hidden={!showCalidadContent} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="disclosure-in flex flex-col gap-5 px-5 pb-0 pt-3">
                {/* Quality label + PM2.5 — always shown */}
                <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-5">
                  <span className="flex min-w-0 items-center gap-1.5 text-sm leading-none text-gray-500">
                    {nearestName && (() => { const SourceIcon = getSourceIcon(Boolean(nearestIsSima)); return <SourceIcon aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />; })()}
                    <span className="truncate">
                      {nearestName
                        ? getSourceLabel(Boolean(nearestIsSima), nearestRed)
                        : "Promedio de la Zona Metropolitana de Monterrey"}
                    </span>
                  </span>
                  {nearestLat !== null && nearestLon !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${nearestLat.toFixed(5)}, ${nearestLon.toFixed(5)}`);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      className="-my-1 -mr-1 flex flex-shrink-0 items-center gap-1 rounded-lg p-1 text-sm leading-none text-gray-500 transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
                      aria-label="Copiar coordenadas"
                    >
                      {copied ? <Check aria-hidden="true" className="h-3.5 w-3.5 text-gray-400" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5 text-gray-400" />}
                      <span>{copied ? 'Copiado' : 'Coordenadas'}</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase leading-none tracking-wide text-gray-400">Calidad del Aire</p>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 flex-1 truncate text-2xl font-bold" style={{ color: (hoveredQuality ?? qualityInfo).textColor }}>
                        {(hoveredQuality ?? qualityInfo).label}
                      </span>
                      {/* The chips' idiom: the number is the value and
                          carries gray-700, the unit is the quiet half. */}
                      {(hoveredHistory?.pm25 ?? displayPm25) !== null && (
                        <span className="flex-shrink-0 whitespace-nowrap text-sm text-gray-500">
                          <span className="font-medium text-gray-700">{roundPM25(hoveredHistory?.pm25 ?? displayPm25)}</span> μg/m³ PM2.5
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Trend sparkline — only with a station behind it: the
                      metro-wide reading is a median across sensors and has
                      no single 48h series to plot. */}
                  {nearestName && (
                    <div>
                      {historyLoading ? <SparklineSkeleton /> : <Sparkline data={sensorHistory} onHoverChange={setHoveredHistory} />}
                    </div>
                  )}
                </div>
              </div>

              {/* Recommendations — collapsed by default, not needed for a data-first platform */}
              <div className="disclosure-in relative z-[1] mt-5 border-t border-gray-100 px-5 pb-5 pt-5">
                <HealthRecommendations info={qualityInfo} onShowInfo={() => setCuidarmeQuality(qualityInfo)} />
              </div>
            </div>
            <span role="status" className="sr-only">{copied ? 'Coordenadas copiadas' : ''}</span>
          </div>
        )}
        </div>{/* end card width wrapper */}

        {/* Both chips ride the bottom of this column on one row, pinned with
            mt-auto so they hold the same corner whether the card above is
            open, shut or absent. Kept as two surfaces, not one: the badge is
            a passive readout and must not read as clickable, Activar is the
            control. The freshness badge shows here on desktop; on mobile it
            sits at the top-left instead (see the left column). */}
        <div className="flex flex-shrink-0 items-center gap-2 md:mt-auto">
          {freshness && <FreshnessBadge freshness={freshness} flat />}
          <div>
            <button
              type="button"
              onClick={onLocationClick}
              disabled={locationStatus === 'locating'}
              aria-busy={locationStatus === 'locating'}
              className={`pointer-events-auto flex h-10 items-center gap-2 rounded-xl border px-3.5 shadow-sm backdrop-blur-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 disabled:cursor-default ${userLocation ? 'border-gray-900/30 bg-white/90' : 'border-white/60 bg-white/80 hover:bg-white/90'}`}
            >
              <Navigation className={`h-4 w-4 flex-shrink-0 transition-colors ${locationIconTone}`} aria-hidden="true" />
              <span className="whitespace-nowrap text-[13px] font-medium text-gray-700">{locationLabel}</span>
            </button>
            {/* Announced separately rather than off the label: a disabled
                button's own text is not reliably read out when it changes. */}
            <span role="status" className="sr-only">
              {locationStatus === 'locating'
                ? 'Buscando tu ubicación'
                : userLocation
                  ? 'Ubicación encontrada'
                  : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Left column: layers panel (desktop) with the data-freshness badge under it.
          On mobile the panel is a bottom sheet, so only the badge shows here. */}
      {/* Wider on desktop so the indented municipality rows have room; the
          mobile width stays as it was, since 380px would overhang a small
          phone from left-4.

          On desktop the column runs the whole height and the badge is pinned
          to the bottom of it, so the panel simply grows into whatever is left
          over. It used to be held off the badge by a hand-counted max-height
          on the panel body, with the badge itself living in a different corner
          of this file. */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex w-panel-md flex-col items-start gap-2 md:bottom-12 md:left-6 md:top-6 md:w-panel-filters">
        <div className="pointer-events-auto hidden min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-md md:flex">
          {/* The header carries the filter state, in the same "label · summary"
              idiom the rows inside the panel already use. gray-500 rather than
              the rows' gray-300: at 13px on this material that is the first
              value that clears 4.5:1, and it still reads as subordinate to
              the label beside it. */}
          <button
            onClick={() => setShowFiltrosContent((v) => !v)}
            aria-expanded={showFiltrosContent}
            className="flex w-full flex-shrink-0 items-center gap-1.5 px-5 pt-4 pb-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15"
          >
            <span className="flex-shrink-0 text-base font-medium text-gray-700">Capas</span>
            {capasSummary && (
              <span className="min-w-0 flex-1 truncate text-[13px] text-gray-500">· {capasSummary}</span>
            )}
            <ChevronRight className={`ml-auto h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${showFiltrosContent ? 'rotate-90' : ''}`} />
          </button>
          {showFiltrosContent && (
            /* Only the body scrolls, so the "Capas" header stays in place, and
               overscroll-contain stops a scroll that reaches the end from
               panning the map underneath. flex-1 min-h-0 takes whatever the
               column has left after the badge, which is the same job the old
               calc(100svh - 236px) was doing by hand. */
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-3">
              <LayersFilterContent
                showOtros={showOtros}
                setShowOtros={setShowOtros}
                showOccamm={showOccamm}
                setShowOccamm={setShowOccamm}
                showSima={showSima}
                setShowSima={setShowSima}
                estados={estados}
                sourceCounts={sourceCounts}
                hiddenMunicipios={hiddenMunicipios}
                setHiddenMunicipios={setHiddenMunicipios}
                onShowOccammInfo={() => setShowOccammInfo(true)}
                onShowPM25Info={() => setShowPM25Info(true)}
                onShowFuenteInfo={() => setShowFuenteInfo(true)}
              />
            </div>
          )}
        </div>

        {/* The air-quality scale sits at the foot of this rail on desktop.
            Same w-panel-filters width as the Capas panel, so the rail keeps
            one edge, and md:mt-auto pins it to the bottom whether the panel
            above is open or shut. Desktop only: on mobile the legend rides
            inside the Capas sheet instead. */}
        <div className="pointer-events-auto hidden w-full flex-shrink-0 rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur-md md:mt-auto md:block">
          <AirQualityLegend collapsible />
        </div>

        {/* Mobile only: on desktop the freshness badge moves to the foot of
            the right column, next to the Ubicación chip. */}
        {freshness && (
          <div className="flex-shrink-0 md:hidden">
            <FreshnessBadge freshness={freshness} />
          </div>
        )}
      </div>

      {/* Mobile: sensor info panel — slides up from bottom */}
      <div
        className="fixed left-0 right-0 z-[48] flex flex-col rounded-t-3xl bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)] md:hidden"
        style={{
          bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))',
          height: '62dvh',
          transform: selectedSensor ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {selectedSensor && (() => {
          const { sensor, pm25, color, textColor } = selectedSensor;
          const isSima = sensor.source === "sima";
          const sensorName = isSima && sensor.nombre_display ? sensor.nombre_display : sensor.nombre;
          const sensorQuality = getQualityInfo(pm25);
          return (
            <>
              <div
                className="flex-shrink-0 cursor-grab select-none px-5 pb-2 pt-3"
                onClick={() => setSelectedSensor(null)}
              >
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300/60" />
              </div>
              <div
                className="relative z-[1] flex-1 overflow-y-auto px-5 pb-8"
              >
              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-3xl font-bold leading-tight" style={{ color: (hoveredQuality ?? sensorQuality)?.textColor ?? textColor }}>
                    {(hoveredQuality ?? sensorQuality)?.label ?? "—"}
                  </div>
                  {(hoveredHistory?.pm25 ?? pm25) !== null && (
                    <span className="text-sm text-gray-400">
                      {roundPM25(hoveredHistory?.pm25 ?? pm25)} μg/m³ PM2.5
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowSensorDetail(v => !v)}
                  aria-expanded={showSensorDetail}
                  className="flex min-w-0 w-full items-center gap-1.5 rounded-lg text-sm text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
                >
                  <span className="truncate">{isSima ? "Estación" : "Sensor"}: {sensorName}</span>
                  <ChevronRight className={`h-3 w-3 flex-shrink-0 transition-transform duration-200 ${showSensorDetail ? 'rotate-90' : ''}`} />
                </button>
                {showSensorDetail && (
                  <div className="mt-3 overflow-hidden rounded-xl bg-gray-50">
                    <div className="flex flex-col gap-3 px-4 py-3">
                      {(isSima || sensor.red) && (
                        <div className="flex items-center gap-2.5">
                          {(() => { const SourceIcon = getSourceIcon(isSima); return <SourceIcon className="h-3 w-3 flex-shrink-0 text-gray-400" />; })()}
                          <span className="text-sm text-gray-400">{getSourceLabel(isSima, sensor.red)}</span>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${sensor.lat.toFixed(5)}, ${sensor.lon.toFixed(5)}`);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        }}
                        className="flex items-center gap-2.5 text-sm text-gray-400 transition-colors active:opacity-70"
                      >
                        <Copy className="h-3 w-3 flex-shrink-0" />
                        {copied ? 'Copiado' : 'Copiar coordenadas'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {sensorQuality && (
                <>
                  <HealthRecommendations info={sensorQuality} onShowInfo={() => setCuidarmeQuality(sensorQuality)} defaultOpen />
                </>
              )}
            </div>
            </>
          );
        })()}
      </div>


      {/* Location modal. Same format as the popups reached from the Capas
          panel: the shared InfoDialog, so the title sits in the header beside
          the close button rather than centred under an illustration, on the
          same glass, padding and measure as Fuente and Contaminante.

          The copy follows what actually happened. It used to open with
          "Habilita el acceso a tu ubicación" in every case, which is priming
          copy: fine before anyone has decided, wrong after a denial, when the
          browser will not ask again and the visitor needs to be told where the
          setting lives, and wrong again after a timeout, which is nobody's
          decision and is worth retrying. */}
      {showLocationTip && (
        <InfoDialog
          title={locationStatus === 'denied' ? 'Ubicación bloqueada' : 'No pudimos ubicarte'}
          onClose={() => setShowLocationTip(false)}
        >
          <p className="text-sm leading-relaxed text-gray-500">
            {locationStatus === 'denied'
              ? 'Tu navegador tiene bloqueada la ubicación para este sitio, así que no podemos volver a pedirla desde aquí. Para activarla, abre la configuración del sitio junto a la barra de direcciones y permite el acceso a la ubicación.'
              : 'No fue posible obtener tu ubicación en este momento. Revisa que la ubicación esté activada en tu dispositivo e inténtalo de nuevo.'}
          </p>
          {/* The other dialogs carry no footer button, because they present
              information and ask for nothing. This one is the exception that
              proves the rule: a timeout or a failed fix is worth another go,
              so there is a real action here rather than a dismissal wearing
              an action's clothes. A denial is not retryable from the page, so
              that case keeps the header's close button and nothing else. */}
          {locationStatus !== 'denied' && (
            <button
              type="button"
              onClick={() => {
                setShowLocationTip(false);
                locate();
              }}
              className="mt-6 w-full rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
            >
              Reintentar
            </button>
          )}
        </InfoDialog>
      )}

      {/* Bottom sheet backdrop — mobile only */}
      <div
        className={`fixed inset-0 z-[35] bg-black/20 transition-opacity duration-300 md:hidden ${
          sheetState !== 'peek' ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setSheetState('peek')}
      />

      {/* Bottom sheet — 3-state: peek / mid / full — mobile only */}
      <div
        className={`fixed left-0 right-0 z-[40] rounded-t-3xl flex flex-col md:hidden overflow-hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-colors duration-300 ${sheetState === 'peek' ? 'bg-white/80 backdrop-blur-md border-t border-white/60' : 'bg-white'}`}
        style={{
          bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))',
          height: '62dvh',
          transform: sheetTransform,
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Drag handle + peek summary */}
        <div
          className="flex-shrink-0 cursor-pointer select-none px-5 pt-3 pb-3"
          onClick={handleSheetTap}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300/60" />
          <div className="flex items-baseline justify-between">
            {sheetState === 'peek' && (
              <span className="text-base font-medium text-gray-700">Calidad del Aire</span>
            )}
            {sheetState === 'peek' && (qualityInfo ? (
              <span className="text-2xl font-bold" style={{ color: qualityInfo.textColor }}>
                {qualityInfo.label}
              </span>
            ) : (
              <span className="text-sm text-gray-300">—</span>
            ))}
          </div>
        </div>

        {/* Scrollable content — visible when expanded to mid */}
        <div
          className={`relative z-[1] flex-1 overflow-y-auto px-5 pb-8 ${sheetState === 'peek' ? 'invisible' : ''}`}
        >
          {qualityInfo && (
            <>
              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-3xl font-bold leading-tight" style={{ color: (hoveredQuality ?? qualityInfo).textColor }}>
                    {(hoveredQuality ?? qualityInfo).label}
                  </div>
                  {(hoveredHistory?.pm25 ?? displayPm25) !== null && (
                    <span className="text-sm text-gray-400">
                      {roundPM25(hoveredHistory?.pm25 ?? displayPm25)} μg/m³ PM2.5
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowNearestDetail(v => !v)}
                  aria-expanded={showNearestDetail}
                  className="flex min-w-0 w-full items-center gap-1.5 rounded-lg text-sm text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
                >
                  <span className="truncate">
                    {nearestName
                      ? `${nearestIsSima ? "Estación" : "Sensor"}: ${nearestName}`
                      : "Promedio de la Zona Metropolitana de Monterrey"}
                  </span>
                  <ChevronRight className={`h-3 w-3 flex-shrink-0 transition-transform duration-200 ${showNearestDetail ? 'rotate-90' : ''}`} />
                </button>
                {showNearestDetail && (
                  <div className="mt-3 overflow-hidden rounded-xl bg-gray-50">
                    <div className="flex flex-col gap-3 px-4 py-3">
                      {userLocation && nearestName && (
                        <div className="flex items-center gap-2.5">
                          <Navigation className="h-3 w-3 flex-shrink-0 text-gray-400" />
                          <span className="text-sm text-gray-400">Tu sensor más cercano</span>
                        </div>
                      )}
                      {nearestLat !== null && nearestLon !== null && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${nearestLat.toFixed(5)}, ${nearestLon.toFixed(5)}`);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                          }}
                          className="flex items-center gap-2.5 text-sm text-gray-400 transition-colors active:opacity-70"
                        >
                          <Copy className="h-3 w-3 flex-shrink-0" />
                          {copied ? 'Copiado' : 'Copiar coordenadas'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Recommendations — open by default here, see HealthRecommendations */}
              <HealthRecommendations info={qualityInfo} onShowInfo={() => setCuidarmeQuality(qualityInfo)} defaultOpen />

            </>
          )}
        </div>
      </div>

      {/* Recomendaciones de salud popup — the same dialog as the rest, rather
          than a bare div: it was the one popup with no name for assistive
          tech, no focus handling and no Escape. */}
      {cuidarmeQuality && (
        <InfoDialog title="Recomendaciones de salud" onClose={() => setCuidarmeQuality(null)}>
          <p className="text-sm leading-relaxed text-gray-500">
            Recomendaciones oficiales según el Índice de Aire y Salud{" "}
            <DialogLink href="https://dof.gob.mx/nota_detalle.php?codigo=5715154&fecha=25/01/2024#gsc.tab=0">
              NOM-172-SEMARNAT-2023
            </DialogLink>
            , para la población general y grupos sensibles.
          </p>
        </InfoDialog>
      )}

      {/* OCCAMM info popup */}
      {showOccammInfo && (
        <InfoDialog title="Red OCCAMM" onClose={() => setShowOccammInfo(false)}>
          <p className="text-sm leading-relaxed text-gray-500">
            Red de sensores del{" "}
            <DialogLink href="https://observatoriodelaire.com">
              Observatorio Ciudadano de la Calidad del Aire
            </DialogLink>
            , una organización de la sociedad civil dedicada a mejorar la
            calidad del aire en la Zona Metropolitana de Monterrey.
          </p>
        </InfoDialog>
      )}

      {/* Fuente info popup — covers both sources in one place instead of a separate icon per row */}
      {showFuenteInfo && (
        <InfoDialog
          title="Fuente"
          onClose={() => { setShowFuenteInfo(false); setOpenFuente("Sensores Ciudadanos"); }}
        >
          <div className="overflow-hidden rounded-2xl border border-gray-200">
            <InfoSection
              title="Sensores Ciudadanos"
              open={openFuente === "Sensores Ciudadanos"}
              onToggle={() => setOpenFuente((v) => (v === "Sensores Ciudadanos" ? null : "Sensores Ciudadanos"))}
            >
              Sensores de bajo costo que forman parte de{" "}
              <DialogLink href="https://www.purpleair.com/">PurpleAir</DialogLink>
              , una red global de monitoreo comunitario instalada por
              ciudadanos, escuelas y organizaciones independientes.
            </InfoSection>
            <InfoSection
              title="Estaciones de Gobierno"
              open={openFuente === "Estaciones de Gobierno"}
              onToggle={() => setOpenFuente((v) => (v === "Estaciones de Gobierno" ? null : "Estaciones de Gobierno"))}
            >
              Estaciones de monitoreo que forman parte del{" "}
              <DialogLink href="https://aire.nl.gob.mx/">
                Sistema Integral de Monitoreo Ambiental (SIMA)
              </DialogLink>
              , operado por el Gobierno de Nuevo León.
            </InfoSection>
          </div>
        </InfoDialog>
      )}

      {/* PM2.5 info popup */}
      {showPM25Info && (
        <InfoDialog
          title="Contaminante"
          onClose={() => { setShowPM25Info(false); setOpenPollutant("PM2.5"); }}
        >
          {/* PM2.5 is what the map shows, so it reads straight away; the two
              we don't have yet stay one click away. */}
          <div className="overflow-hidden rounded-2xl border border-gray-200">
            <InfoSection
              title="PM2.5"
              open={openPollutant === "PM2.5"}
              onToggle={() => setOpenPollutant((v) => (v === "PM2.5" ? null : "PM2.5"))}
            >
              Partículas en suspensión en el aire con un diámetro de
              2.5 micrómetros o menos, unas 30 veces más delgadas que
              un cabello humano. Evaden las defensas de la nariz y la
              garganta, por lo que son las más peligrosas para la
              salud.
            </InfoSection>
            <InfoSection
              title="PM10"
              open={openPollutant === "PM10"}
              onToggle={() => setOpenPollutant((v) => (v === "PM10" ? null : "PM10"))}
            >
              Partículas de mayor tamaño, con un diámetro de hasta 10
              micrómetros. Quedan retenidas principalmente en la nariz
              y la garganta, por lo que representan un menor riesgo
              para la salud que las PM2.5.
            </InfoSection>
            <InfoSection
              title="Ozono"
              open={openPollutant === "Ozono"}
              onToggle={() => setOpenPollutant((v) => (v === "Ozono" ? null : "Ozono"))}
            >
              Gas que no se emite directamente: se forma cuando la luz
              solar reacciona con los gases del tráfico y la industria.
              Alcanza sus niveles más altos en las tardes soleadas e
              irrita las vías respiratorias, sobre todo al hacer
              ejercicio al aire libre.
            </InfoSection>
          </div>
        </InfoDialog>
      )}

    </div>
  );
}
