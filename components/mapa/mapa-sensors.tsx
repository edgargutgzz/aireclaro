"use client";

import { useEffect, useId, useMemo, useRef, useState, useCallback, type Dispatch, type SetStateAction } from "react";
import { Navigation, Layers, Copy, ChevronRight, Landmark, Users, UsersRound, Check, Minus, Info, X, Baby, PersonStanding, Heart, Stethoscope } from "lucide-react";
import mapboxgl, { Map, Marker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getPM25Color, createMarker, roundPM25, getDistance, getQualityInfo, IMECA_LEVELS, IMECA_THRESHOLDS, type QualityInfo } from "@/lib/air-quality";

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

// Shown as the default "Calidad del aire" station when the visitor hasn't
// shared their location (Monterrey: Obispado).
const DEFAULT_SENSOR_ID = "CE";

// Plain marker shadow — the pulse animation's base state, no static ring.
const PLAIN_MARKER_SHADOW = "0 2px 8px rgba(0,0,0,0.25), 0 0 0 2.5px white";

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
    return <p className="text-xs text-gray-400">Sin datos suficientes para mostrar la tendencia</p>;
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
  const tooltipLeftPct = hoverPoint ? (hoverPoint.x / width) * 100 : 0;

  return (
    <div>
      <div className="relative">
        {dayBoundaries.map((b) => (
          <div
            key={b.x}
            className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded bg-white/80 px-1 text-[10px] font-medium text-gray-400"
            style={{ left: `${b.leftPct}%`, top: 1 }}
          >
            {b.label}
          </div>
        ))}
        {hovered && hoverPoint && (
          <div
            className="pointer-events-none absolute z-10 flex flex-col whitespace-nowrap rounded-lg bg-gray-900 px-2 py-1 text-xs text-white shadow-sm"
            style={{
              left: `clamp(70px, ${tooltipLeftPct}%, calc(100% - 70px))`,
              top: -6,
              transform: `translate(-50%, -100%)`,
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
          {hoverPoint && (
            <>
              <line x1={hoverPoint.x} y1={0} x2={hoverPoint.x} y2={height} stroke={SPARKLINE_COLOR} strokeWidth={1} strokeDasharray="3,3" strokeOpacity={0.5} />
              <circle cx={hoverPoint.x} cy={hoverPoint.y} r={4} fill="white" stroke={SPARKLINE_COLOR} strokeWidth={2} />
            </>
          )}
        </svg>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3 text-[11px] leading-none text-gray-400">
        <span>Últimas 48 horas</span>
        <span>Máx {Math.round(max)} · Mín {Math.round(min)} μg/m³</span>
      </div>
    </div>
  );
}

// Matches Sparkline's layout (header row, chart area, footer row) so there's
// no layout shift once the real data replaces it.
// A generic wavy line + fill, drawn in gray, so the loading state actually
// reads as "a chart" instead of a plain flat rectangle.
const SKELETON_PATH = "M0,150 L20,130 L40,142 L60,95 L80,108 L100,72 L120,90 L140,58 L160,100 L180,78 L200,115 L220,92 L240,60 L260,85 L280,50 L300,72 L320,58";

function SparklineSkeleton() {
  return (
    <div>
      <div className="mb-2 flex items-center text-xs font-medium leading-none text-gray-400">
        Últimas 48 horas
      </div>
      <svg width="100%" height={190} viewBox="0 0 320 190" preserveAspectRatio="none" className="h-[190px] animate-pulse md:h-[210px]">
        <path d={`${SKELETON_PATH} L320,190 L0,190 Z`} fill="#f3f4f6" />
        <path d={SKELETON_PATH} fill="none" stroke="#e5e7eb" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
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
function HealthRecommendations({ info, onShowInfo }: { info: QualityInfo; onShowInfo: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-xs font-medium uppercase leading-none tracking-wide text-gray-400">
            Recomendaciones de salud
          </p>
          <button
            type="button"
            onClick={onShowInfo}
            className="-translate-y-px flex-shrink-0 rounded-full text-gray-400 transition-colors hover:text-gray-600"
            aria-label="Más información sobre recomendaciones de salud"
          >
            <Info className="h-3 w-3" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-shrink-0 text-gray-400 transition-colors hover:text-gray-600"
          aria-label={open ? "Ocultar recomendaciones de salud" : "Ver recomendaciones de salud"}
        >
          <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
        </button>
      </div>
      {open && (
        /* Same material as the Capas panel's Fuente list: a soft gray track
           with one white row per audience, so the recommendations read as an
           ordered set rather than a run of paragraphs. */
        <div className="mt-4 flex flex-col gap-1.5 rounded-2xl bg-gray-100/80 p-1.5 md:max-h-[150px] md:overflow-y-auto">
          <div className="rounded-xl bg-white px-4 py-3.5 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <UsersRound className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <p className="text-sm font-semibold text-gray-800">Población General</p>
            </div>
            <p className="text-sm leading-relaxed text-gray-500">{info.generalRec}</p>
          </div>
          {SENSITIVE_GROUPS.map((g) => (
            <div key={g.key} className="rounded-xl bg-white px-4 py-3.5 shadow-sm">
              <div className="mb-1 flex items-center gap-2">
                <g.icon className="h-4 w-4 flex-shrink-0 text-gray-400" />
                <p className="text-sm font-semibold text-gray-800">{g.label}</p>
              </div>
              <p className="text-sm leading-relaxed text-gray-500">{info.sensitiveRecs[g.key]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// The info popups, as actual dialogs: named for assistive tech, focus moved
// in and trapped while open and returned to the trigger on close, Escape to
// dismiss, and a height cap so long content scrolls instead of running off a
// short window.
function InfoDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = `dialog-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <>
      <div className="dialog-in fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="dialog-in fixed left-1/2 top-1/2 z-[71] flex max-h-[85svh] w-[85%] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-6 overflow-y-auto rounded-3xl bg-white p-8 shadow-xl focus:outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-base font-medium text-gray-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-2 -mt-1 flex-shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
        >
          Entendido
        </button>
      </div>
    </>
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
  return (
    <div>
      {/* Same affordances as the filter rows: hover and press feedback, a
          focus ring, and padding that bleeds outward with -mx so the title
          stays aligned with the body text below it. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="-mx-2 flex w-[calc(100%+1rem)] items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-500/5 active:bg-gray-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
      >
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        <ChevronRight className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && <div className="disclosure-in mt-1 text-sm leading-relaxed text-gray-500">{children}</div>}
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
  const sectionHeader = (
    name: 'ubicacion' | 'fuente' | 'contaminante',
    label: string,
    summary: string,
    info?: { onClick: () => void; ariaLabel: string },
  ) => (
    /* The row carries the hover, so it reads as one target from edge to edge;
       the info icon sits on top of it with its own, slightly stronger tint. A
       fill that stops before a trailing control leaves the row's boundary
       looking arbitrary. */
    <div className="-mx-2 mb-2 flex items-center rounded-lg px-2 transition-colors hover:bg-gray-500/5">
      <button
        type="button"
        onClick={() => toggleSection(name)}
        aria-expanded={openSection === name}
        className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
      >
        <p className="text-xs font-medium uppercase leading-none tracking-wide text-gray-400">{label}</p>
        <span className="min-w-0 flex-1 truncate text-xs leading-none text-gray-300">· {summary}</span>
        <ChevronRight className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${openSection === name ? 'rotate-90' : ''}`} />
      </button>
      {info && (
        <button
          type="button"
          onClick={info.onClick}
          className="ml-1 flex-shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-500/10 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
          aria-label={info.ariaLabel}
        >
          <Info className="h-3 w-3" />
        </button>
      )}
    </div>
  );

  return (
    /* Sections are separated by whitespace alone: each already carries an
       uppercase header and a bounded card, so a rule between them would be a
       third signal for the same boundary. Rules stay where they belong,
       between rows inside a group. */
    <div className="flex flex-col gap-7">
      {/* Ubicación — state, then its municipalities, on the same nesting the
          Fuente group uses. Every sensor sits under a row, so hiding
          everything really does empty the map. */}
      <div>
        {sectionHeader('ubicacion', 'Ubicación', ubicacionSummary)}
        {/* One grouped list per section: a single bordered card with hairline
            separators, the way an inset list works. A card per row meant a
            stack of elevated surfaces for what is a checklist, and elevation
            on a row that isn't a control (see Contaminante) promises
            something to press. */}
        {openSection === 'ubicacion' && (
        <div className="disclosure-in overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {estados.map((estado, i) => {
            const keys = estado.municipios.map((m) => m.key);
            const hidden = keys.filter((k) => hiddenMunicipios.includes(k)).length;
            const state: CheckState = hidden === 0 ? 'checked' : hidden === keys.length ? 'unchecked' : 'indeterminate';
            const open = openEstados.includes(estado.key);
            return (
              <div key={estado.key} className={i > 0 ? "border-t border-gray-100" : ""}>
                <div className="flex w-full items-center transition-colors hover:bg-gray-50">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={state === 'indeterminate' ? 'mixed' : state === 'checked'}
                    onClick={() => setHiddenMunicipios((prev) => state === 'checked'
                      ? [...prev, ...keys.filter((k) => !prev.includes(k))]
                      : prev.filter((k) => !keys.includes(k)))}
                    className={`flex min-w-0 flex-1 items-center gap-3 pl-4 pr-2 text-left transition-colors active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15 ${rowPadding}`}
                  >
                    <LayerCheckbox state={state} size={boxSize} />
                    <span className={`truncate text-sm font-medium ${state === 'unchecked' ? 'text-gray-400' : 'text-gray-800'}`}>
                      {estado.label}
                    </span>
                    <span className="flex-shrink-0 text-xs text-gray-300">{estado.count}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenEstados((prev) => open ? prev.filter((k) => k !== estado.key) : [...prev, estado.key])}
                    className="mr-2 flex-shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
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
                        <button
                          key={m.key}
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          onClick={() => setHiddenMunicipios((prev) => on ? [...prev, m.key] : prev.filter((k) => k !== m.key))}
                          className={`ml-11 flex items-center justify-between gap-3 border-t border-gray-100 pr-4 text-left transition-colors hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15 ${subRowPadding}`}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <LayerCheckbox state={on ? 'checked' : 'unchecked'} size={boxSize} />
                            <span className={`truncate text-sm ${on ? 'text-gray-600' : 'text-gray-400'}`}>{m.label}</span>
                          </span>
                          <span className="flex-shrink-0 text-xs text-gray-300">{m.count}</span>
                        </button>
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

      <div>
        {sectionHeader('fuente', 'Fuente', fuenteSummary, {
          onClick: onShowFuenteInfo,
          ariaLabel: "Más información sobre las fuentes de datos",
        })}
        {/* One card per source group on a soft gray track, the way an inset
            grouped list works: children live inside their parent's card,
            indented by their label, with a separator that starts where the text
            does. Every row keeps its card in both states, on/off is the
            checkbox and the label's tone: dropping the card on "off" left
            nothing to aim at. */}
        {openSection === 'fuente' && (
        <div className="disclosure-in overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div>
            <div className="flex w-full items-center transition-colors hover:bg-gray-50">
              <button
                type="button"
                role="checkbox"
                aria-checked={citizenState === 'indeterminate' ? 'mixed' : citizenState === 'checked'}
                onClick={toggleCitizenGroup}
                className={`flex min-w-0 flex-1 items-center gap-3 pl-4 pr-2 text-left transition-colors active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15 ${rowPadding}`}
              >
                <LayerCheckbox state={citizenState} size={boxSize} />
                <span className={`min-w-0 flex-1 truncate text-sm font-medium ${citizenState === 'unchecked' ? 'text-gray-400' : 'text-gray-800'}`}>Sensores Ciudadanos</span>
                <span className="flex-shrink-0 pr-1 text-xs text-gray-300">{sourceCounts.ciudadanos}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCitizenGroup((v) => !v)}
                className="mr-1 flex-shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
                aria-expanded={showCitizenGroup}
                aria-label={showCitizenGroup ? "Ocultar OCCAMM y Otros" : "Mostrar OCCAMM y Otros"}
              >
                <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${showCitizenGroup ? 'rotate-90' : ''}`} />
              </button>
            </div>
            {showCitizenGroup && (
              <div role="group" aria-label="Redes de sensores ciudadanos" className="disclosure-in flex flex-col">
                {/* Same shape as every other row: the toggle is the row, its
                    hover is a full-bleed rectangle, and the count sits at the
                    right edge. The info icon is a separate control beside it,
                    the way the chevron is on the group rows. */}
                <div className="flex items-center border-t border-gray-100 transition-colors hover:bg-gray-50">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={showOccamm}
                    onClick={() => setShowOccamm((v) => !v)}
                    className={`ml-11 flex min-w-0 flex-1 items-center gap-3 pr-2 text-left transition-colors active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15 ${subRowPadding}`}
                  >
                    <LayerCheckbox state={showOccamm ? 'checked' : 'unchecked'} size={boxSize} />
                    <span className={`min-w-0 flex-1 truncate text-sm ${showOccamm ? 'text-gray-600' : 'text-gray-400'}`}>OCCAMM</span>
                    <span className="flex-shrink-0 text-xs text-gray-300">{sourceCounts.occamm}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onShowOccammInfo}
                    className="mr-1 flex-shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
                    aria-label="Más información sobre OCCAMM"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </div>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={showOtros}
                  onClick={() => setShowOtros((v) => !v)}
                  className={`ml-11 flex items-center gap-3 border-t border-gray-100 pr-[2.375rem] text-left transition-colors hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15 ${subRowPadding}`}
                >
                  <LayerCheckbox state={showOtros ? 'checked' : 'unchecked'} size={boxSize} />
                  <span className={`min-w-0 flex-1 truncate text-sm ${showOtros ? 'text-gray-600' : 'text-gray-400'}`}>Otros</span>
                  <span className="flex-shrink-0 text-xs text-gray-300">{sourceCounts.otros}</span>
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            role="checkbox"
            aria-checked={showSima}
            onClick={() => setShowSima((v) => !v)}
            className={`flex w-full items-center gap-3 border-t border-gray-100 px-4 text-left transition-colors hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15 ${rowPadding}`}
          >
            <LayerCheckbox state={showSima ? 'checked' : 'unchecked'} size={boxSize} />
            <span className={`min-w-0 flex-1 truncate text-sm font-medium ${showSima ? 'text-gray-800' : 'text-gray-400'}`}>Estaciones de Gobierno</span>
            <span className="flex-shrink-0 text-xs text-gray-300">{sourceCounts.gobierno}</span>
          </button>
        </div>
        )}
      </div>
      <div>
        {sectionHeader('contaminante', 'Contaminante', 'PM2.5', {
          onClick: onShowPM25Info,
          ariaLabel: "Por qué medimos PM2.5",
        })}
        {/* Rows on the same track as the filters above, but with no control:
            unlike them this is a selector, not a filter, and with PM2.5 as the
            only live option there is nothing to operate. A checkbox would
            invite a click that could only empty the map. Make it a radio the
            day PM10 or Ozono lands and the choice becomes real. */}
        {openSection === 'contaminante' && (
        <div className="disclosure-in overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className={`flex items-center justify-between gap-3 px-4 ${rowPadding}`}>
            <span className="text-sm font-medium text-gray-800">PM2.5</span>
            <Check className="h-4 w-4 flex-shrink-0 text-gray-700" strokeWidth={2.5} />
          </div>
          {["PM10", "Ozono"].map((name) => (
            <div
              key={name}
              className={`flex items-center justify-between gap-3 border-t border-gray-100 px-4 ${rowPadding}`}
            >
              <span className="text-sm font-medium text-gray-400">{name}</span>
              <span className="flex-shrink-0 text-xs text-gray-300">No disponible</span>
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
  const markerElementsRef = useRef(new globalThis.Map<number, { el: HTMLElement; dot: HTMLElement }>());

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
  const [showFuenteInfo, setShowFuenteInfo] = useState(false);
  const [showSima, setShowSima] = useState(true);
  const [hiddenMunicipios, setHiddenMunicipios] = useState<string[]>([]);
  const [showOccamm, setShowOccamm] = useState(true);
  const [selectedSensor, setSelectedSensor] = useState<{
    sensor: Sensor;
    pm25: number | null;
    color: string;
    textColor: string;
    timestamp: string | null;
  } | null>(null);
  const [sensorHistory, setSensorHistory] = useState<HistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSensorDetail, setShowSensorDetail] = useState(false);
  const [showNearestDetail, setShowNearestDetail] = useState(false);
  const [sheetState, setSheetState] = useState<'peek' | 'mid'>('peek');
  const [showQualitySource, setShowQualitySource] = useState(false);
  const [isDesktopLegendExpanded, setIsDesktopLegendExpanded] = useState(false);
  const [cuidarmeQuality, setCuidarmeQuality] = useState<QualityInfo | null>(null);
  // Point the cursor is on in the 48h chart. While set, the card's headline
  // reports that hour instead of the latest reading, so the chart and the big
  // number never disagree.
  const [hoveredHistory, setHoveredHistory] = useState<HistoryPoint | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
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

  const nearestSensorData = useMemo(() => {
    if (!visibleSensors.length || !data.length) return null;

    const buildFromSensor = (sensor: Sensor) => {
      const d = data.find((item) => item.sensor_id === sensor.sensor_id);
      if (!d || d.pm25 === null || d.pm25 <= 0.4) return null;
      const timestamp = format(new Date(d.time_stamp), "h") + ":00 " + format(new Date(d.time_stamp), "a");
      const isSima = sensor.source === "sima";
      const name = isSima && sensor.nombre_display ? sensor.nombre_display : sensor.nombre;
      return { pm25: d.pm25, timestamp, name, isSima, red: sensor.red ?? null, lat: sensor.lat, lon: sensor.lon, sensorId: sensor.sensor_id };
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
    // representative station (San Nicolás: UANL), then fall through to any
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

  // Hour of the most recent reading anywhere in the dataset — the badge's
  // fallback when no station is on screen to speak for itself.
  const latestDataHour = useMemo(() => {
    if (!data.length) return null;
    const latest = data.reduce((acc, d) => {
      const t = new Date(d.time_stamp).getTime();
      return Number.isNaN(t) ? acc : Math.max(acc, t);
    }, 0);
    if (!latest) return null;
    return format(new Date(latest), "h") + ":00 " + format(new Date(latest), "a");
  }, [data]);

  const hoveredQuality = hoveredHistory ? getQualityInfo(hoveredHistory.pm25) : null;

  // The badge reports whatever the card is showing: the open sensor's own last
  // reading, else the default station's. Government stations publish every half
  // hour, so a global "newest reading anywhere" would sit ahead of the station
  // on screen and make it look stale.
  const badgeHour = selectedSensor?.timestamp ?? nearestSensorData?.timestamp ?? latestDataHour;

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
  }, [mapLoaded, userLocation, nearestSensorData]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    if (locationDenied) {
      setShowLocationTip(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        if (error.code === 1) setLocationDenied(true);
      },
    );
  }, [locationDenied]);

  const flyToUser = () => {
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
  };

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

    new Marker({ element: userMarkerElement })
      .setLngLat([userLocation.longitude, userLocation.latitude])
      .addTo(map.current);
  }, [userLocation, mapLoaded]);

  // Add sensors when both map and data are ready
  useEffect(() => {
    if (!mapLoaded || !map.current || !sensors.length || !data.length) {
      return;
    }

    markersRef.current.forEach((marker) => (marker as any).remove());
    markersRef.current = [];
    markerElementsRef.current.clear();

    sensors.forEach((sensor) => {
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
      const timestamp = latestData
        ? format(new Date(latestData.time_stamp), "h") + ":00 " + format(new Date(latestData.time_stamp), "a")
        : null;

      markerElement.style.cursor = "pointer";
      markerElement.addEventListener("click", (e) => {
        e.stopPropagation();
        const isDesktop = window.innerWidth >= 768;
        if (isDesktop && selectedSensor?.sensor.sensor_id === sensor.sensor_id) {
          setSelectedSensor(null);
          return;
        }
        setSelectedSensor({ sensor, pm25: latestData?.pm25 ?? null, color, textColor, timestamp });
      });

      markerElementsRef.current.set(sensor.sensor_id, {
        el: markerElement,
        dot: markerElement.querySelector(".sensor-marker__dot") as HTMLElement,
      });

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

    markerElementsRef.current.forEach(({ el, dot }, sensorId) => {
      const isActive = sensorId === activeSensorId;
      el.classList.toggle('sensor-marker--selected', isActive);
      el.style.setProperty('--pulse-color', activeColor);
      // Full opacity on the selected one, the rest stay slightly back.
      dot.style.opacity = isActive ? '1' : '0.9';
      dot.style.boxShadow = isActive
        ? `0 4px 10px rgba(0,0,0,0.25), 0 0 0 3px white, 0 0 0 5px ${activeColor}`
        : PLAIN_MARKER_SHADOW;
      // Markers stack in DOM order, so in a dense cluster the selected one can
      // sit under its neighbours and lose its ring. Lift it above them.
      const parent = el.parentElement;
      if (parent) parent.style.zIndex = isActive ? '1' : '';
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
    <div className="relative h-[calc(100svh-56px)] md:h-[calc(100svh-72px)]">
      {/* Map container */}
      <div
        ref={mapContainer}
        className="absolute left-0 top-0 h-full w-full"
      />

      {/* Mobile right-side buttons — hidden when sheet is expanded */}
      {sheetState === 'peek' && (
        <div className="fixed right-6 z-[45] flex flex-col gap-2 md:hidden" style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 6.5rem)' }}>
          <button
            onClick={userLocation ? flyToUser : requestLocation}
            className="rounded-xl border border-white/60 bg-white/80 p-3 backdrop-blur-md transition-colors duration-200 shadow-sm"
            aria-label="Mi ubicación"
          >
            <Navigation className={`h-5 w-5 ${userLocation ? 'text-gray-700' : 'text-gray-400'}`} />
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
        </div>
      </div>

      {/* Desktop: data freshness, bottom-left, on the same line as the
          location button on the opposite side. */}
      {badgeHour && (
        <div className="pointer-events-none absolute bottom-8 left-6 z-10 hidden h-10 items-center gap-2 rounded-xl border border-white/60 bg-white/80 px-3.5 shadow-sm backdrop-blur-md md:flex">
          <span className="relative flex h-4 w-4 flex-shrink-0 items-center justify-center">
            <span className="absolute h-2 w-2 animate-ping rounded-full bg-green-400 opacity-75 motion-reduce:animate-none" />
            <span className="relative h-2 w-2 rounded-full bg-green-500" />
          </span>
          <span className="whitespace-nowrap text-[13px] font-medium text-gray-500">
            Última actualización: {badgeHour}
          </span>
        </div>
      )}

      {/* Desktop right-side floating controls */}
      <div className="pointer-events-none absolute bottom-8 right-6 z-10 hidden flex-col items-end gap-2 md:flex">
        <button
          onClick={userLocation ? flyToUser : requestLocation}
          className="pointer-events-auto flex h-10 items-center gap-2 rounded-xl border border-white/60 bg-white/80 px-3.5 shadow-sm backdrop-blur-md transition-colors hover:bg-white/90"
          aria-label={userLocation ? 'Mi ubicación' : 'Activar ubicación'}
        >
          {/* Once location is on the button carries the same blue dot as the
              map, the way the badge carries its green one. Until then it stays
              an arrow, dimmed so "off" is visible at a glance. */}
          {userLocation ? (
            /* Exactly the badge's dot, in blue: same 16px box, same 8px core,
               same ping. */
            <span className="relative flex h-4 w-4 flex-shrink-0 items-center justify-center">
              <span className="absolute h-2 w-2 animate-ping rounded-full bg-blue-400 opacity-75 motion-reduce:animate-none" />
              <span className="relative h-2 w-2 rounded-full bg-blue-500" />
            </span>
          ) : (
            <Navigation className="h-4 w-4 text-gray-400" />
          )}
          <span className={`text-[13px] font-medium ${userLocation ? 'text-gray-500' : 'text-gray-400'}`}>
            {userLocation ? 'Mi ubicación' : 'Activar ubicación'}
          </span>
        </button>
      </div>

      {/* Desktop right area — quality card, replaced by the selected sensor's card when one is
          selected. Nav lives in the site-wide header now, not floating here. */}
      <div className="pointer-events-none absolute right-6 top-6 z-10 hidden flex-col items-start md:flex">

        {/* Quality card, replaced by the selected sensor's card when one is selected */}
        <div className="w-panel-lg">
        {selectedSensor ? (() => {
          const { sensor, pm25, color, textColor } = selectedSensor;
          const isSima = sensor.source === "sima";
          const sensorName = isSima && sensor.nombre_display ? sensor.nombre_display : sensor.nombre;
          const sensorQuality = getQualityInfo(pm25);
          return (
            <div className="pointer-events-auto rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-md">
              {/* Always-visible header */}
              <button
                onClick={() => setShowCalidadContent(v => !v)}
                className="flex w-full items-center justify-between gap-3 px-5 pt-4 pb-3"
              >
                <span className="truncate text-base font-medium text-gray-700">{sensorName}</span>
                <ChevronRight className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${showCalidadContent ? 'rotate-90' : ''}`} />
              </button>
              {showCalidadContent && (
                <>
                  <div className="flex flex-col gap-5 px-5 pb-0 pt-3">
                    {/* What kind of source this is, in the Capas panel's own
                        words. A rule underneath closes the group off from the
                        reading below: a card or a filled row is too much
                        furniture for a single line. */}
                    <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-5">
                      <span className="flex min-w-0 items-center gap-1.5 text-sm leading-none text-gray-400">
                        {(() => { const SourceIcon = getSourceIcon(isSima); return <SourceIcon className="h-3.5 w-3.5 flex-shrink-0" />; })()}
                        <span className="truncate">{getSourceLabel(isSima, sensor.red)}</span>
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${sensor.lat.toFixed(5)}, ${sensor.lon.toFixed(5)}`);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        }}
                        className="flex flex-shrink-0 items-center gap-1 text-sm leading-none text-gray-400 transition-colors hover:text-gray-600"
                        aria-label="Copiar coordenadas"
                      >
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copied ? 'Copiado' : 'Coordenadas'}</span>
                      </button>
                    </div>

                    {/* Reading now and the last 48h are one story: the big
                        number is just the newest point on the chart below it. */}
                    <div className="flex flex-col gap-3">
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase leading-none tracking-wide text-gray-400">Calidad del Aire</p>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold" style={{ color: (hoveredQuality ?? sensorQuality)?.textColor ?? textColor }}>
                            {(hoveredQuality ?? sensorQuality)?.label ?? "—"}
                          </span>
                          {(hoveredHistory?.pm25 ?? pm25) !== null && (
                            <span className="text-sm text-gray-400">{roundPM25(hoveredHistory?.pm25 ?? pm25)} μg/m³ PM2.5</span>
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
                    <div className="relative z-[1] mt-5 border-t border-gray-100 px-5 pb-5 pt-5">
                      <HealthRecommendations info={sensorQuality} onShowInfo={() => setCuidarmeQuality(sensorQuality)} />
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })() : qualityInfo && (
          <div className="pointer-events-auto rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-md">
            {/* Always-visible header */}
            <button
              onClick={() => setShowCalidadContent(v => !v)}
              className="flex w-full items-center justify-between gap-3 px-5 pt-4 pb-3"
            >
              <span className="truncate text-base font-medium text-gray-700">
                {nearestName ?? "Zona Metropolitana de Monterrey"}
              </span>
              <ChevronRight className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${showCalidadContent ? 'rotate-90' : ''}`} />
            </button>
            {showCalidadContent && (
              <>
                <div className="flex flex-col gap-5 px-5 pb-0 pt-3">
                  {/* Quality label + PM2.5 — always shown */}
                  <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-5">
                    <span className="flex min-w-0 items-center gap-1.5 text-sm leading-none text-gray-400">
                      {nearestName && (() => { const SourceIcon = getSourceIcon(Boolean(nearestIsSima)); return <SourceIcon className="h-3.5 w-3.5 flex-shrink-0" />; })()}
                      <span className="truncate">
                        {nearestName
                          ? getSourceLabel(Boolean(nearestIsSima), nearestRed)
                          : "Promedio de la Zona Metropolitana de Monterrey"}
                      </span>
                    </span>
                    {nearestLat !== null && nearestLon !== null && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${nearestLat.toFixed(5)}, ${nearestLon.toFixed(5)}`);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        }}
                        className="flex flex-shrink-0 items-center gap-1 text-sm leading-none text-gray-400 transition-colors hover:text-gray-600"
                        aria-label="Copiar coordenadas"
                      >
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copied ? 'Copiado' : 'Coordenadas'}</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase leading-none tracking-wide text-gray-400">Calidad del Aire</p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold" style={{ color: (hoveredQuality ?? qualityInfo).textColor }}>
                          {(hoveredQuality ?? qualityInfo).label}
                        </span>
                        {(hoveredHistory?.pm25 ?? displayPm25) !== null && (
                          <span className="text-sm text-gray-400">{roundPM25(hoveredHistory?.pm25 ?? displayPm25)} μg/m³ PM2.5</span>
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
                <div className="relative z-[1] mt-5 border-t border-gray-100 px-5 pb-5 pt-5">
                  <HealthRecommendations info={qualityInfo} onShowInfo={() => setCuidarmeQuality(qualityInfo)} />
                </div>
              </>
            )}
          </div>
        )}
        </div>{/* end card width wrapper */}
      </div>

      {/* Left column: layers panel (desktop) with the data-freshness badge under it.
          On mobile the panel is a bottom sheet, so only the badge shows here. */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex w-panel-md flex-col items-start gap-2 md:left-6 md:top-6">
        <div className="pointer-events-auto hidden w-full overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-md md:block">
          <button
            onClick={() => setShowFiltrosContent((v) => !v)}
            className="flex w-full items-center justify-between px-5 pt-4 pb-3"
          >
            <span className="text-base font-medium text-gray-700">Capas</span>
            <ChevronRight className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${showFiltrosContent ? 'rotate-90' : ''}`} />
          </button>
          {showFiltrosContent && (
            /* Only the body scrolls, so the "Capas" header stays in place, and
               overscroll-contain stops a scroll that reaches the end from
               panning the map underneath. The cap stops the panel short of the
               "Última actualización" badge: 72px site header + 24px top offset
               + 52px card header + 88px for the badge and its gap. */
            <div className="max-h-[calc(100svh-236px)] overflow-y-auto overscroll-contain px-5 pb-6 pt-3">
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

        {/* Mobile only: on desktop this badge sits above the location button. */}
        {badgeHour && (
          <div className="flex h-11 items-center gap-2 rounded-xl border border-white/60 bg-white/80 px-3 shadow-sm backdrop-blur-md md:hidden">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <span className="whitespace-nowrap text-[13px] font-medium text-gray-500">
              Última actualización: {badgeHour}
            </span>
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
                  onClick={() => setShowSensorDetail(v => !v)}
                  className="flex min-w-0 w-full items-center gap-1.5 text-sm text-gray-400"
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
                  <HealthRecommendations info={sensorQuality} onShowInfo={() => setCuidarmeQuality(sensorQuality)} />
                </>
              )}
            </div>
            </>
          );
        })()}
      </div>


      {/* Location denied modal — centered, both mobile and desktop */}
      {showLocationTip && (
        <>
          <div
            className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm"
            onClick={() => setShowLocationTip(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-[71] w-[85%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <Navigation className="h-6 w-6 text-gray-400" />
              </div>
            </div>
            <p className="mb-1.5 text-center text-base font-semibold text-gray-900">Descubre el aire en tu zona</p>
            <p className="text-center text-sm leading-relaxed text-gray-500">
              Habilita el acceso a tu ubicación para ver la calidad del aire más cercana a ti.
            </p>
            <button
              onClick={() => setShowLocationTip(false)}
              className="mt-5 w-full rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Entendido
            </button>
          </div>
        </>
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
                  onClick={() => setShowNearestDetail(v => !v)}
                  className="flex min-w-0 w-full items-center gap-1.5 text-sm text-gray-400"
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

              {/* Recommendations */}
              <HealthRecommendations info={qualityInfo} onShowInfo={() => setCuidarmeQuality(qualityInfo)} />

            </>
          )}
        </div>
      </div>

      {/* Recomendaciones de salud popup */}
      {cuidarmeQuality && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm" onClick={() => setCuidarmeQuality(null)} />
          <div className="fixed left-1/2 top-1/2 z-[71] flex w-[85%] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-6 rounded-3xl bg-white p-8 shadow-xl">
            <div className="flex flex-col gap-4">
              <div>
                <p className="mb-1 text-sm font-semibold text-gray-700">Recomendaciones de salud</p>
                <p className="text-sm leading-relaxed text-gray-500">
                  Recomendaciones oficiales según el Índice de Aire y Salud{" "}
                  <a
                    href="https://dof.gob.mx/nota_detalle.php?codigo=5715154&fecha=25/01/2024#gsc.tab=0"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-gray-700"
                  >
                    NOM-172-SEMARNAT-2023
                  </a>
                  , para la población general y grupos sensibles.
                </p>
              </div>
            </div>
            <button
              onClick={() => setCuidarmeQuality(null)}
              className="w-full rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Entendido
            </button>
          </div>
        </>
      )}

      {/* OCCAMM info popup */}
      {showOccammInfo && (
        <InfoDialog title="Red OCCAMM" onClose={() => setShowOccammInfo(false)}>
          <p className="text-sm leading-relaxed text-gray-500">
            Red de sensores del{" "}
            <a
              href="https://observatoriodelaire.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-700"
            >
              Observatorio Ciudadano de la Calidad del Aire
            </a>
            , una organización de la sociedad civil dedicada a mejorar la
            calidad del aire en la Zona Metropolitana de Monterrey.
          </p>
        </InfoDialog>
      )}

      {/* Fuente info popup — covers both sources in one place instead of a separate icon per row */}
      {showFuenteInfo && (
        <InfoDialog title="Fuentes de datos" onClose={() => setShowFuenteInfo(false)}>
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-1 text-sm font-semibold text-gray-700">Sensores Ciudadanos</p>
              <p className="text-sm leading-relaxed text-gray-500">
                Sensores de bajo costo que forman parte de{" "}
                <a
                  href="https://www.purpleair.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-gray-700"
                >
                  PurpleAir
                </a>
                , una red global de monitoreo comunitario instalada por
                ciudadanos, escuelas y organizaciones independientes.
              </p>
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-gray-700">Estaciones de Gobierno</p>
              <p className="text-sm leading-relaxed text-gray-500">
                Estaciones de monitoreo que forman parte del{" "}
                <a
                  href="https://aire.nl.gob.mx/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-gray-700"
                >
                  Sistema Integral de Monitoreo Ambiental (SIMA)
                </a>
                , operado por el Gobierno de Nuevo León.
              </p>
            </div>
          </div>
        </InfoDialog>
      )}

      {/* PM2.5 info popup */}
      {showPM25Info && (
        <InfoDialog
          title="Contaminantes"
          onClose={() => { setShowPM25Info(false); setOpenPollutant("PM2.5"); }}
        >
          {/* PM2.5 is what the map shows, so it reads straight away; the two
              we don't have yet stay one click away. */}
          <div className="flex flex-col gap-6">
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
