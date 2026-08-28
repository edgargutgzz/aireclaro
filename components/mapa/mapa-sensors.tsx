"use client";

import { useEffect, useMemo, useRef, useState, useCallback, type Dispatch, type SetStateAction } from "react";
import { Navigation, Layers, Copy, ChevronDown, Clock, Award, Check, Minus, Info } from "lucide-react";
import Image from "next/image";
import mapboxgl, { Map, Marker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { format } from "date-fns";
import { getPM25Color, createMarker, roundPM25, getDistance, getQualityInfo, type QualityInfo } from "@/lib/air-quality";

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
// with a white halo (see linePath rendering below) so this original blue
// reads cleanly over every IMECA zone band color behind it.
const SPARKLINE_COLOR = "#3b82f6";

// Shown as the default "Calidad del aire" station (San Nicolás: UANL) when
// the visitor hasn't shared their location, instead of a nameless area median.
const DEFAULT_SENSOR_ID = "Norte2";

// Plain marker shadow — the pulse animation's base state, no static ring.
const PLAIN_MARKER_SHADOW = "0 2px 8px rgba(0,0,0,0.25), 0 0 0 2.5px white";

function getRelativeDayLabel(date: Date) {
  const now = new Date();
  const dayDiff = Math.floor((now.setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / 86400000);
  return dayDiff === 0 ? "Hoy" : dayDiff === 1 ? "Ayer" : format(date, "d MMM");
}

function formatHistoryTime(dateStr: string) {
  const date = new Date(dateStr);
  // Readings land ~30 min past the hour but represent that hour's data —
  // floor to the hour, matching how timestamps are shown everywhere else.
  return `${getRelativeDayLabel(date)} ${format(date, "h")}:00 ${format(date, "a")}`;
}

function Sparkline({ data }: { data: HistoryPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
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

  // Pad the value domain (not just pixel space) so the line's own peak/trough
  // sit inside the colored zone bands with room to breathe, instead of the
  // bands (which are clipped to the same domain) touching the line exactly.
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

  // Faint colored background per quality level, so it's clear which zone the
  // line sits in without having to read the threshold lines. Clipped to the
  // padded domain so they fill the chart edge-to-edge.
  const zoneBands = [
    { lo: 0, hi: 15, color: "#22c55e" },
    { lo: 15, hi: 25, color: "#eab308" },
    { lo: 25, hi: 79, color: "#f97316" },
    { lo: 79, hi: 130, color: "#ef4444" },
    { lo: 130, hi: Infinity, color: "#a855f7" },
  ]
    .map((z) => ({ ...z, lo: Math.max(z.lo, domainMin), hi: Math.min(z.hi, domainMax) }))
    .filter((z) => z.lo < z.hi);

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  // Mark where one calendar day ends and the next begins, so the daily
  // shape (morning/evening peaks) is easy to read instead of one blur.
  const dayBoundaries = data.flatMap((d, i) => {
    if (i === 0) return [];
    const prev = new Date(data[i - 1].time_stamp);
    const curr = new Date(d.time_stamp);
    if (curr.getDate() === prev.getDate() && curr.getMonth() === prev.getMonth()) return [];
    return [{ x: points[i].x, leftPct: (points[i].x / width) * 100, label: getRelativeDayLabel(curr) }];
  });

  const updateHover = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setHoverIndex(Math.round(ratio * (data.length - 1)));
  };

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const hoverPoint = hoverIndex !== null ? points[hoverIndex] : null;
  const tooltipLeftPct = hoverPoint ? (hoverPoint.x / width) * 100 : 0;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs text-gray-400">
        <span>Últimas 48 horas</span>
        <span>Máx {Math.round(max)} · Mín {Math.round(min)} μg/m³</span>
      </div>
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
            className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg bg-gray-900 px-2 py-1 text-xs text-white shadow-sm"
            style={{
              left: `clamp(70px, ${tooltipLeftPct}%, calc(100% - 70px))`,
              top: -6,
              transform: `translate(-50%, -100%)`,
            }}
          >
            <span className="font-semibold">{Math.round(hovered.pm25)} μg/m³</span>
            <span className="ml-1.5 text-gray-300">{formatHistoryTime(hovered.time_stamp)}</span>
          </div>
        )}
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="cursor-crosshair"
          onMouseMove={(e) => updateHover(e.clientX)}
          onMouseLeave={() => setHoverIndex(null)}
          onTouchMove={(e) => updateHover(e.touches[0].clientX)}
          onTouchEnd={() => setHoverIndex(null)}
        >
          {zoneBands.map((z) => (
            <rect key={z.color} x={0} y={toY(z.hi)} width={width} height={toY(z.lo) - toY(z.hi)} fill={z.color} fillOpacity={0.1} />
          ))}
          {dayBoundaries.map((b) => (
            <line key={b.x} x1={b.x} y1={0} x2={b.x} y2={height} stroke="#9ca3af" strokeWidth={1} strokeDasharray="2,3" />
          ))}
          <path d={linePath} fill="none" stroke="white" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          <path d={linePath} fill="none" stroke={SPARKLINE_COLOR} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {/* Current hour — the rightmost point, always marked */}
          <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={4} fill={SPARKLINE_COLOR} stroke="white" strokeWidth={2} />
          {hoverPoint && (
            <>
              <line x1={hoverPoint.x} y1={0} x2={hoverPoint.x} y2={height} stroke={SPARKLINE_COLOR} strokeWidth={1} strokeDasharray="3,3" strokeOpacity={0.5} />
              <circle cx={hoverPoint.x} cy={hoverPoint.y} r={4} fill="white" stroke={SPARKLINE_COLOR} strokeWidth={2} />
            </>
          )}
        </svg>
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400">
        <span>{formatHistoryTime(data[0].time_stamp)}</span>
        <span>{formatHistoryTime(data[data.length - 1].time_stamp)}</span>
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
      <div className="mb-1.5 flex items-center justify-between text-xs text-gray-400">
        <span>Últimas 48 horas</span>
      </div>
      <svg width="100%" height={190} viewBox="0 0 320 190" preserveAspectRatio="none" className="animate-pulse">
        <path d={`${SKELETON_PATH} L320,190 L0,190 Z`} fill="#f3f4f6" />
        <path d={SKELETON_PATH} fill="none" stroke="#e5e7eb" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function HealthRecommendationCards({ info }: { info: QualityInfo }) {
  return (
    <div className="mb-3 flex flex-col gap-4">
      <div className="rounded-xl bg-gray-100 px-4 py-3">
        <p className="mb-1 text-sm font-semibold text-gray-700">Población General</p>
        <p className="text-sm leading-relaxed text-gray-500">{info.generalRec}</p>
      </div>
      {[
        { label: "Niños menores de 12", rec: info.sensitiveRecs.menores },
        { label: "Adultos mayores", rec: info.sensitiveRecs.adultos },
        { label: "Mujeres embarazadas", rec: info.sensitiveRecs.embarazadas },
        { label: "Condiciones cardiovasculares o respiratorias", rec: info.sensitiveRecs.enfermedades },
      ].map(({ label, rec }) => (
        <div key={label} className="rounded-xl bg-gray-100 px-4 py-3">
          <p className="mb-1 text-sm font-semibold text-gray-700">{label}</p>
          <p className="text-sm leading-relaxed text-gray-500">{rec}</p>
        </div>
      ))}
    </div>
  );
}

// Desktop-only variant: Población General always visible, sensitive groups
// behind a compact tab selector instead of a big stacked list.
const SENSITIVE_GROUPS = [
  { key: "menores", label: "Niños" },
  { key: "adultos", label: "Adultos mayores" },
  { key: "embarazadas", label: "Embarazadas" },
  { key: "enfermedades", label: "Condiciones" },
] as const;

function HealthRecommendationTabs({ info }: { info: QualityInfo }) {
  const [activeGroup, setActiveGroup] = useState<typeof SENSITIVE_GROUPS[number]["key"]>("menores");
  const [showGroups, setShowGroups] = useState(false);
  const active = SENSITIVE_GROUPS.find((g) => g.key === activeGroup)!;

  return (
    <div className="mb-3 overflow-hidden rounded-xl bg-gray-100">
      <div className="px-4 py-3">
        <p className="mb-1 text-sm font-semibold text-gray-700">Población General</p>
        <p className="text-sm leading-relaxed text-gray-500">{info.generalRec}</p>
      </div>
      <div className="border-t border-gray-200/70 px-4 py-3">
        <button
          type="button"
          onClick={() => setShowGroups((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600"
        >
          <span>Ver por grupo sensible</span>
          <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showGroups ? 'rotate-180' : ''}`} />
        </button>
        {showGroups && (
          <>
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-white p-1">
              {SENSITIVE_GROUPS.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setActiveGroup(g.key)}
                  className={`truncate rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeGroup === g.key ? "bg-gray-100 text-gray-800 shadow-sm" : "text-gray-400"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-500">{info.sensitiveRecs[active.key]}</p>
          </>
        )}
      </div>
    </div>
  );
}

function LegendContent() {
  const items = [
    { color: "#00e400", label: "Buena", range: "0 – 15 μg/m³", textColor: "#007200" },
    { color: "#ffff00", label: "Aceptable", range: "15 – 25 μg/m³", textColor: "#8a7a00" },
    { color: "#ff7e00", label: "Mala", range: "25 – 79 μg/m³", textColor: "#c05e00" },
    { color: "#ff0000", label: "Muy mala", range: "79 – 130 μg/m³", textColor: "#b30000" },
    { color: "#8f3f97", label: "Extremadamente mala", range: "> 130 μg/m³", textColor: "#6b2f72" },
  ];

  return (
    <div className="flex flex-col gap-1.5">
      {items.map(({ color, label, range, textColor }) => (
        <div
          key={label}
          className="rounded-xl px-3 py-2.5"
          style={{ backgroundColor: `${color}18` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-sm font-medium" style={{ color: textColor }}>{label}</span>
            </div>
            <span className="text-xs text-gray-400 md:hidden">{range}</span>
          </div>
          <p className="hidden pl-[22px] pt-0.5 text-xs text-gray-400 md:block">{range}</p>
        </div>
      ))}
    </div>
  );
}

type CheckState = 'checked' | 'indeterminate' | 'unchecked';

function LayerCheckbox({ state, size }: { state: CheckState; size: number }) {
  if (state === 'unchecked') {
    return (
      <div
        style={{ width: size, height: size, borderRadius: 5, border: '1.5px solid #d1d5db', flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center"
      style={{ width: size, height: size, borderRadius: 5, backgroundColor: '#374151', flexShrink: 0 }}
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
  compact,
  showOtros,
  setShowOtros,
  showOccamm,
  setShowOccamm,
  showSima,
  setShowSima,
  onShowOccammInfo,
  onShowPM25Info,
}: {
  compact: boolean;
  showOtros: boolean;
  setShowOtros: Dispatch<SetStateAction<boolean>>;
  showOccamm: boolean;
  setShowOccamm: Dispatch<SetStateAction<boolean>>;
  showSima: boolean;
  setShowSima: Dispatch<SetStateAction<boolean>>;
  onShowOccammInfo: () => void;
  onShowPM25Info: () => void;
}) {
  const rowPadding = compact ? "py-3" : "py-3.5";
  const subRowPadding = compact ? "py-2.5" : "py-3";
  const boxSize = compact ? 16 : 18;
  const [showCitizenGroup, setShowCitizenGroup] = useState(false);
  const [showPM10Tooltip, setShowPM10Tooltip] = useState(false);

  useEffect(() => {
    if (!showPM10Tooltip) return;
    const timeout = setTimeout(() => setShowPM10Tooltip(false), 2000);
    return () => clearTimeout(timeout);
  }, [showPM10Tooltip]);

  const citizenState: CheckState =
    showOtros && showOccamm ? 'checked' :
    !showOtros && !showOccamm ? 'unchecked' : 'indeterminate';

  const toggleCitizenGroup = () => {
    const next = citizenState !== 'checked';
    setShowOtros(next);
    setShowOccamm(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Contaminante</p>
        <div className="inline-flex items-center gap-1 rounded-2xl bg-gray-100 p-1">
          <div className="flex items-center gap-1.5 rounded-xl bg-white pl-5 pr-3 py-2 text-sm font-semibold text-gray-800 shadow-sm">
            <span>PM2.5</span>
            <button
              type="button"
              onClick={onShowPM25Info}
              className="flex-shrink-0 rounded-full text-gray-400 hover:text-gray-600"
              aria-label="Por qué medimos PM2.5"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPM10Tooltip(true)}
              className="rounded-xl px-5 py-2 text-sm font-semibold text-gray-400"
            >
              PM10
            </button>
            {showPM10Tooltip && (
              <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white shadow-sm">
                No disponible
              </div>
            )}
          </div>
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Fuente</p>
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className={`flex w-full items-center gap-3 px-4 ${rowPadding}`}>
              <button onClick={toggleCitizenGroup} className="flex flex-1 items-center gap-3">
                <LayerCheckbox state={citizenState} size={boxSize} />
                <span className="text-sm font-medium text-gray-700">Sensores Ciudadanos</span>
              </button>
              <button
                onClick={() => setShowCitizenGroup((v) => !v)}
                className="flex-shrink-0 rounded-full p-0.5 text-gray-400 hover:text-gray-600"
                aria-label={showCitizenGroup ? "Ocultar OCCAMM y Otros" : "Mostrar OCCAMM y Otros"}
              >
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showCitizenGroup ? 'rotate-180' : ''}`} />
              </button>
            </div>
            {showCitizenGroup && (
            <div className="flex flex-col border-t border-gray-100">
              <div className={`flex w-full items-center gap-2 pl-11 pr-4 ${subRowPadding}`}>
                <button
                  onClick={() => setShowOccamm((v) => !v)}
                  className="flex items-center gap-3"
                >
                  <LayerCheckbox state={showOccamm ? 'checked' : 'unchecked'} size={boxSize} />
                  <span className="text-sm text-gray-600">OCCAMM</span>
                </button>
                <button
                  onClick={onShowOccammInfo}
                  className="flex-shrink-0 rounded-full p-0.5 text-gray-400 hover:text-gray-600"
                  aria-label="Más información sobre OCCAMM"
                >
                  <Info className="h-3 w-3" />
                </button>
              </div>
              <button
                onClick={() => setShowOtros((v) => !v)}
                className={`flex w-full items-center gap-3 pl-11 pr-4 ${subRowPadding}`}
              >
                <LayerCheckbox state={showOtros ? 'checked' : 'unchecked'} size={boxSize} />
                <span className="text-sm text-gray-600">Otros</span>
              </button>
            </div>
            )}
          </div>
          <button
            onClick={() => setShowSima((v) => !v)}
            className={`flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 ${rowPadding} shadow-sm`}
          >
            <LayerCheckbox state={showSima ? 'checked' : 'unchecked'} size={boxSize} />
            <span className="text-sm font-medium text-gray-700">Estaciones de Gobierno</span>
          </button>
        </div>
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
  const markerElementsRef = useRef(new globalThis.Map<number, { el: HTMLElement }>());

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showFiltrosContent, setShowFiltrosContent] = useState(false); // desktop only — Filtros body starts collapsed
  const [showCalidadContent, setShowCalidadContent] = useState(true); // desktop only — Calidad del aire body starts expanded
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showOtros, setShowOtros] = useState(true);
  const [showOccammInfo, setShowOccammInfo] = useState(false);
  const [showPM25Info, setShowPM25Info] = useState(false);
  const [showSima, setShowSima] = useState(true);
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
  const [locationDenied, setLocationDenied] = useState(false);
  const [showLocationTip, setShowLocationTip] = useState(false);

  const nearestSensorData = useMemo(() => {
    if (!sensors.length || !data.length) return null;

    const buildFromSensor = (sensor: Sensor) => {
      const d = data.find((item) => item.sensor_id === sensor.sensor_id);
      if (!d || d.pm25 === null || d.pm25 <= 0.4) return null;
      const timestamp = format(new Date(d.time_stamp), "h") + ":00 " + format(new Date(d.time_stamp), "a");
      const isSima = sensor.source === "sima";
      const name = isSima && sensor.nombre_display ? sensor.nombre_display : sensor.nombre;
      return { pm25: d.pm25, timestamp, name, isSima, lat: sensor.lat, lon: sensor.lon, sensorId: sensor.sensor_id };
    };

    if (userLocation) {
      const sorted = [...sensors].sort((a, b) =>
        getDistance(userLocation.latitude, userLocation.longitude, a.lat, a.lon) -
        getDistance(userLocation.latitude, userLocation.longitude, b.lat, b.lon)
      );
      for (const sensor of sorted) {
        const result = buildFromSensor(sensor);
        if (result) return result;
      }
      return null;
    }

    // No location shared — default to a fixed representative station
    // (San Nicolás: UANL) instead of just an area median with no identity.
    const defaultSensor = sensors.find((s) => String(s.sensor_id) === DEFAULT_SENSOR_ID);
    return defaultSensor ? buildFromSensor(defaultSensor) : null;
  }, [userLocation, sensors, data]);

  const areaMedianPm25 = useMemo(() => {
    const values = data
      .map((d) => d.pm25)
      .filter((v): v is number => v !== null && v > 0.4);
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }, [data]);

  const latestPurpleAirTimestamp = useMemo(() => {
    const purpleAirIds = new Set(sensors.filter(s => s.source !== "sima").map(s => s.sensor_id));
    const recent = data
      .filter(d => purpleAirIds.has(d.sensor_id) && d.pm25 !== null && d.pm25 > 0.4)
      .reduce<Data | null>((a, b) => !a || new Date(b.time_stamp) > new Date(a.time_stamp) ? b : a, null);
    if (!recent) return null;
    return format(new Date(recent.time_stamp), "h") + ":00 " + format(new Date(recent.time_stamp), "a");
  }, [data, sensors]);

  const nearestPm25 = nearestSensorData?.pm25 ?? null;
  const nearestTimestamp = nearestSensorData?.timestamp ?? null;
  const nearestName = nearestSensorData?.name ?? null;
  const nearestIsSima = nearestSensorData?.isSima ?? null;
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

    map.current.on("load", () => {
      setMapLoaded(true);
      (map.current as any).flyTo({
        center: [-100.301, 25.685],
        zoom: 11,
        duration: 2000,
        essential: true,
      });
    });

    return () => {
      (map.current as any)?.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, []);

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

    const userMarkerElement = document.createElement("div");
    userMarkerElement.style.cssText = `
      width: 16px;
      height: 16px;
      background: #3b82f6;
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
    `;

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

      if (isSima && !showSima) return;
      if (!isSima) {
        const inOccamm = !!sensor.red;
        if (inOccamm ? !showOccamm : !showOtros) return;
      }

      const latestData = data.find(
        (dataItem) => dataItem.sensor_id === sensor.sensor_id,
      );

      const markerElement = createMarker(latestData ? latestData.pm25 : null);

      if (!markerElement) return;

      const colorInfo = getPM25Color(latestData?.pm25 ?? null);
      const color = colorInfo?.bg ?? "#ffffff";
      const textColor = colorInfo?.text ?? "#ffffff";
      const timestamp = latestData
        ? format(new Date(latestData.time_stamp), "h") + ":00 " + format(new Date(latestData.time_stamp), "a")
        : null;

      markerElement.style.cursor = "pointer";
      markerElement.style.transition = "box-shadow 0.15s ease";
      markerElement.addEventListener("click", (e) => {
        e.stopPropagation();
        const isDesktop = window.innerWidth >= 768;
        if (isDesktop && selectedSensor?.sensor.sensor_id === sensor.sensor_id) {
          setSelectedSensor(null);
          return;
        }
        setSelectedSensor({ sensor, pm25: latestData?.pm25 ?? null, color, textColor, timestamp });
      });

      markerElementsRef.current.set(sensor.sensor_id, { el: markerElement });

      const marker = new Marker({ element: markerElement })
        .setLngLat([sensor.lon, sensor.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [mapLoaded, sensors, data, showOtros, showOccamm, showSima]);

  // Cleanup markers when component unmounts
  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => (marker as any).remove());
      markersRef.current = [];
    };
  }, []);

  // Restore the plain marker shadow on everything before the pulse effect
  // (below) applies the animation to whichever one is active.
  useEffect(() => {
    markerElementsRef.current.forEach(({ el }) => {
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25), 0 0 0 2.5px white";
    });
  }, [selectedSensor, nearestSensorData]);

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

  // Pulse animation on the active marker — the explicitly selected sensor
  // if there is one, otherwise the nearest/default sensor. Replaces the
  // static ring entirely: whichever marker is "active" pulses instead.
  useEffect(() => {
    if (!mapLoaded) return;

    markerElementsRef.current.forEach(({ el }) => { el.style.animation = ''; });

    const active = selectedSensor
      ? { sensorId: selectedSensor.sensor.sensor_id, pm25: selectedSensor.pm25 }
      : nearestSensorData
        ? {
            sensorId: sensors.find(
              s => s.lat === nearestSensorData.lat && s.lon === nearestSensorData.lon
            )?.sensor_id,
            pm25: nearestSensorData.pm25,
          }
        : null;

    if (!active || active.sensorId === undefined) return;

    const markerData = markerElementsRef.current.get(active.sensorId);
    if (!markerData) return;

    const colorInfo = getPM25Color(active.pm25 ?? null);
    const hex = colorInfo?.bg ?? '#ffffff';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const baseShadow = PLAIN_MARKER_SHADOW;
    const startSpread = '2.5px';
    const animName = `nearestPulse_${hex.slice(1)}`;

    let styleEl = document.querySelector(`style[data-nearest-pulse="${animName}"]`) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.textContent = `
        @keyframes ${animName} {
          0%   { box-shadow: ${baseShadow}, 0 0 0 ${startSpread} rgba(${r},${g},${b},0.9); }
          70%  { box-shadow: ${baseShadow}, 0 0 0 22px rgba(${r},${g},${b},0); }
          100% { box-shadow: ${baseShadow}, 0 0 0 ${startSpread} rgba(${r},${g},${b},0); }
        }
      `;
      styleEl.setAttribute("data-nearest-pulse", animName);
      document.head.appendChild(styleEl);
    }

    markerData.el.style.animation = `${animName} 1.8s ease-out infinite`;
  }, [nearestSensorData, mapLoaded, sensors, showSima, showOtros, showOccamm, selectedSensor]);

  // Close selected sensor on map click
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    const handler = () => setSelectedSensor(null);
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
          <p className="text-base font-medium text-gray-800">Capas</p>
        </div>
        <div
          className="flex flex-col gap-3 px-5"
          style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 2rem)' }}
        >
          <LayersFilterContent
            compact={false}
            showOtros={showOtros}
            setShowOtros={setShowOtros}
            showOccamm={showOccamm}
            setShowOccamm={setShowOccamm}
            showSima={showSima}
            setShowSima={setShowSima}
            onShowOccammInfo={() => setShowOccammInfo(true)}
            onShowPM25Info={() => setShowPM25Info(true)}
          />
        </div>
      </div>

      {/* Desktop right-side floating controls */}
      <div className="pointer-events-none absolute bottom-12 right-6 z-10 hidden flex-col gap-2 md:flex">
        <button
          onClick={userLocation ? flyToUser : requestLocation}
          className="pointer-events-auto flex h-[52px] items-center gap-2 rounded-xl border border-white/60 bg-white/80 px-4 shadow-sm backdrop-blur-md transition-colors hover:bg-white/90"
          aria-label={userLocation ? 'Mi ubicación' : 'Activar ubicación'}
        >
          <Navigation className={`h-5 w-5 ${userLocation ? 'text-gray-700' : 'text-gray-400'}`} />
          <span className={`text-sm font-medium ${userLocation ? 'text-gray-700' : 'text-gray-400'}`}>
            {userLocation ? 'Mi ubicación' : 'Activar ubicación'}
          </span>
        </button>
      </div>

      {/* Desktop right area — quality card, replaced by the selected sensor's card when one is
          selected. Nav lives in the site-wide header now, not floating here. */}
      <div className="pointer-events-none absolute left-[350px] top-6 z-10 hidden flex-col items-start md:flex">

        {/* Quality card, replaced by the selected sensor's card when one is selected */}
        <div className="w-[460px]">
        {selectedSensor ? (() => {
          const { sensor, pm25, color, textColor, timestamp } = selectedSensor;
          const isSima = sensor.source === "sima";
          const sensorName = isSima && sensor.nombre_display ? sensor.nombre_display : sensor.nombre;
          const sensorQuality = getQualityInfo(pm25);
          return (
            <div className="pointer-events-auto max-h-[calc(100vh-14rem)] overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
              {/* Always-visible header */}
              <button
                onClick={() => setShowCalidadContent(v => !v)}
                className="flex w-full items-center justify-between px-5 pt-4 pb-3"
              >
                <span className="text-base font-medium text-gray-800">Calidad del Aire</span>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${showCalidadContent ? 'rotate-180' : ''}`} />
              </button>
              {showCalidadContent && (
                <>
                  <div className="flex flex-col gap-3 px-5 pb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold" style={{ color: textColor }}>
                        {sensorQuality ? sensorQuality.label : "—"}
                      </span>
                      {pm25 !== null && (
                        <span className="text-sm text-gray-400">{roundPM25(pm25)} μg/m³ PM2.5</span>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                        {isSima ? "Estación" : "Sensor"}
                      </p>
                      <div className="flex items-center gap-2.5 rounded-xl bg-gray-100 px-3 py-2.5">
                        <div className="min-w-0 flex-1 text-left">
                          <p className="truncate text-sm font-medium text-gray-700">{sensorName}</p>
                          {(sensor.red || timestamp) && (
                            <p className="truncate text-xs text-gray-400">
                              {[sensor.red ? `Red: ${sensor.red}` : null, timestamp ? `Actualizado a las ${timestamp}` : null].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${sensor.lat.toFixed(5)}, ${sensor.lon.toFixed(5)}`);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                          }}
                          className="flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs text-gray-400 hover:text-gray-600"
                          aria-label="Copiar coordenadas"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span>Coordenadas</span>
                        </button>
                      </div>
                      {copied && <p className="mt-1 text-right text-xs text-gray-400">Copiado</p>}
                    </div>

                    {/* Trend sparkline — power-user context (raw history, not just a snapshot) */}
                    <div className="mt-2">{historyLoading ? <SparklineSkeleton /> : <Sparkline data={sensorHistory} />}</div>
                  </div>

                  {/* Recommendations — Población General always visible, sensitive groups via tabs */}
                  {sensorQuality && (
                    <div className="relative z-[1] max-h-[280px] overflow-y-auto px-5 pb-8 pt-3">
                      <div className="mb-4 flex items-center gap-1.5 text-xs font-medium uppercase leading-none tracking-wide text-gray-400">
                        <span>Recomendaciones de salud</span>
                        <button
                          onClick={() => setCuidarmeQuality(sensorQuality)}
                          className="hover:text-gray-600 transition-colors"
                          aria-label="Más información sobre recomendaciones de salud"
                        >
                          <Info className="h-3 w-3" />
                        </button>
                      </div>
                      <HealthRecommendationTabs info={sensorQuality} />
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })() : qualityInfo && (
          <div className="pointer-events-auto max-h-[calc(100vh-14rem)] overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
            {/* Always-visible header */}
            <button
              onClick={() => setShowCalidadContent(v => !v)}
              className="flex w-full items-center justify-between px-5 pt-4 pb-3"
            >
              <span className="text-base font-medium text-gray-800">Calidad del Aire</span>
              <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${showCalidadContent ? 'rotate-180' : ''}`} />
            </button>
            {showCalidadContent && (
              <>
                <div className="flex flex-col gap-3 px-5 pb-3">
                  {/* Quality label + PM2.5 — always shown */}
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold" style={{ color: qualityInfo.textColor }}>
                      {qualityInfo.label}
                    </span>
                    {displayPm25 !== null && (
                      <span className="text-sm text-gray-400">{roundPM25(displayPm25)} μg/m³ PM2.5</span>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                      {nearestName ? (nearestIsSima ? "Estación" : "Sensor") : "Área metropolitana"}
                    </p>
                    <div className="flex items-center gap-2.5 rounded-xl bg-gray-100 px-3 py-2.5">
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-medium text-gray-700">
                          {nearestName ?? "Promedio del área metropolitana"}
                        </p>
                        {(userLocation && nearestName || (nearestTimestamp ?? latestPurpleAirTimestamp)) && (
                          <p className="truncate text-xs text-gray-400">
                            {[
                              userLocation && nearestName ? "Tu sensor más cercano" : null,
                              (nearestTimestamp ?? latestPurpleAirTimestamp) ? `Actualizado a las ${nearestTimestamp ?? latestPurpleAirTimestamp}` : null,
                            ].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      {nearestLat !== null && nearestLon !== null && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${nearestLat.toFixed(5)}, ${nearestLon.toFixed(5)}`);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                          }}
                          className="flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs text-gray-400 hover:text-gray-600"
                          aria-label="Copiar coordenadas"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span>Coordenadas</span>
                        </button>
                      )}
                    </div>
                    {copied && <p className="mt-1 text-right text-xs text-gray-400">Copiado</p>}
                  </div>

                  {/* Trend sparkline — power-user context (raw history, not just a snapshot) */}
                  <div className="mt-2">{historyLoading ? <SparklineSkeleton /> : <Sparkline data={sensorHistory} />}</div>
                </div>

                {/* Recommendations — Población General always visible, sensitive groups via tabs */}
                <div className="relative z-[1] max-h-[280px] overflow-y-auto px-5 pb-8 pt-3">
                  <div className="mb-4 flex items-center gap-1.5 text-xs font-medium uppercase leading-none tracking-wide text-gray-400">
                    <span>Recomendaciones de salud</span>
                    <button
                      onClick={() => setCuidarmeQuality(qualityInfo)}
                      className="hover:text-gray-600 transition-colors"
                      aria-label="Más información sobre recomendaciones de salud"
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </div>
                  <HealthRecommendationTabs info={qualityInfo} />
                </div>
              </>
            )}
          </div>
        )}
        </div>{/* end card width wrapper */}
      </div>

      {/* Filtros panel — floats on the left, collapsed by default on desktop */}
      <div className="pointer-events-none absolute left-6 top-6 z-10 hidden w-[310px] md:block">
        <div className="pointer-events-auto overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <button
            onClick={() => setShowFiltrosContent((v) => !v)}
            className="flex w-full items-center justify-between px-5 pt-4 pb-3"
          >
            <span className="text-base font-medium text-gray-800">Capas</span>
            <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${showFiltrosContent ? 'rotate-180' : ''}`} />
          </button>
          {showFiltrosContent && (
            <div className="px-5 pb-5 pt-2">
              <LayersFilterContent
                compact={false}
                showOtros={showOtros}
                setShowOtros={setShowOtros}
                showOccamm={showOccamm}
                setShowOccamm={setShowOccamm}
                showSima={showSima}
                setShowSima={setShowSima}
                onShowOccammInfo={() => setShowOccammInfo(true)}
                onShowPM25Info={() => setShowPM25Info(true)}
              />
            </div>
          )}
        </div>
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
          const { sensor, pm25, color, textColor, timestamp } = selectedSensor;
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
                  <div className="text-3xl font-bold leading-tight" style={{ color: textColor }}>
                    {sensorQuality ? sensorQuality.label : "—"}
                  </div>
                  {pm25 !== null && (
                    <span className="text-sm text-gray-400">
                      {roundPM25(pm25)} μg/m³ PM2.5
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowSensorDetail(v => !v)}
                  className="flex min-w-0 w-full items-center gap-1.5 text-sm text-gray-400"
                >
                  <span className="truncate">{isSima ? "Estación" : "Sensor"}: {sensorName}</span>
                  <ChevronDown className={`h-3 w-3 flex-shrink-0 transition-transform duration-200 ${showSensorDetail ? 'rotate-180' : ''}`} />
                </button>
                {showSensorDetail && (
                  <div className="mt-3 overflow-hidden rounded-xl bg-gray-50">
                    <div className="flex flex-col gap-3 px-4 py-3">
                      {sensor.red && (
                        <div className="flex items-center gap-2.5">
                          <Award className="h-3 w-3 flex-shrink-0 text-gray-400" />
                          <span className="text-sm text-gray-400">Red: {sensor.red}</span>
                        </div>
                      )}
                      {timestamp && (
                        <div className="flex items-center gap-2.5">
                          <Clock className="h-3 w-3 flex-shrink-0 text-gray-400" />
                          <span className="text-sm text-gray-400">Actualizado a las {timestamp}</span>
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
                  <div className="mb-4 flex items-center gap-1.5 text-xs font-medium uppercase leading-none tracking-wide text-gray-400">
                    <span>Recomendaciones de salud</span>
                    <button
                      onClick={() => setCuidarmeQuality(sensorQuality)}
                      className="hover:text-gray-600 transition-colors"
                      aria-label="Más información sobre recomendaciones de salud"
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </div>
                  <HealthRecommendationCards info={sensorQuality} />
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
              <span className="text-base font-medium text-gray-800">Calidad del Aire</span>
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
                  <div className="text-3xl font-bold leading-tight" style={{ color: qualityInfo.textColor }}>
                    {qualityInfo.label}
                  </div>
                  {displayPm25 !== null && (
                    <span className="text-sm text-gray-400">
                      {roundPM25(displayPm25)} μg/m³ PM2.5
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
                      : "Promedio del área metropolitana"}
                  </span>
                  <ChevronDown className={`h-3 w-3 flex-shrink-0 transition-transform duration-200 ${showNearestDetail ? 'rotate-180' : ''}`} />
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
                      {(nearestTimestamp ?? latestPurpleAirTimestamp) && (
                        <div className="flex items-center gap-2.5">
                          <Clock className="h-3 w-3 flex-shrink-0 text-gray-400" />
                          <span className="text-sm text-gray-400">Actualizado a las {nearestTimestamp ?? latestPurpleAirTimestamp}</span>
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
              <div className="mb-4 flex items-center gap-1.5 text-xs font-medium uppercase leading-none tracking-wide text-gray-400">
                <span>Recomendaciones de salud</span>
                <button
                  onClick={() => setCuidarmeQuality(qualityInfo)}
                  className="hover:text-gray-600 transition-colors"
                  aria-label="Más información sobre recomendaciones de salud"
                >
                  <Info className="h-3 w-3" />
                </button>
              </div>
              <HealthRecommendationCards info={qualityInfo} />

            </>
          )}
        </div>
      </div>

      {/* Recomendaciones de salud popup */}
      {cuidarmeQuality && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm" onClick={() => setCuidarmeQuality(null)} />
          <div className="fixed left-1/2 top-1/2 z-[71] flex w-[85%] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-3xl bg-white p-7 shadow-xl">
            <p className="text-center text-sm leading-relaxed text-gray-500">
              Recomendaciones oficiales según el Índice de Aire y Salud{' '}
              <a
                href="https://dof.gob.mx/nota_detalle.php?codigo=5715154&fecha=25/01/2024#gsc.tab=0"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 text-gray-600 hover:text-gray-800"
              >
                NOM-172-SEMARNAT-2023
              </a>
              , para la población general y grupos sensibles.
            </p>
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
        <>
          <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm" onClick={() => setShowOccammInfo(false)} />
          <div className="fixed left-1/2 top-1/2 z-[71] flex w-[85%] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-3xl bg-white p-7 shadow-xl">
            <div className="flex justify-center">
              <Image src="/occamm-logo.png" alt="OCCAMM" width={130} height={24} className="h-auto w-[130px]" />
            </div>
            <p className="text-center text-sm leading-relaxed text-gray-500">
              Red de sensores del Observatorio Ciudadano de la Calidad del
              Aire, una organización de la sociedad civil dedicada a mejorar
              la calidad del aire en la Zona Metropolitana de Monterrey.
            </p>
            <p className="text-center text-sm text-gray-500">
              Conoce más en{' '}
              <a
                href="https://observatoriodelaire.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 text-gray-600 hover:text-gray-800"
              >
                observatoriodelaire.com
              </a>
            </p>
            <button
              onClick={() => setShowOccammInfo(false)}
              className="w-full rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Entendido
            </button>
          </div>
        </>
      )}

      {/* PM2.5 info popup */}
      {showPM25Info && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm" onClick={() => setShowPM25Info(false)} />
          <div className="fixed left-1/2 top-1/2 z-[71] flex w-[85%] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-3xl bg-white p-7 shadow-xl">
            <p className="text-center text-base font-semibold text-gray-800">Contaminante PM2.5</p>
            <p className="text-center text-sm leading-relaxed text-gray-500">
              Las partículas PM2.5 son 100% respirables: viajan profundamente
              en los pulmones y pueden llegar hasta el torrente sanguíneo.
            </p>
            <p className="text-center text-sm leading-relaxed text-gray-500">
              A diferencia del PM10, que queda atrapado en la nariz y la
              garganta, el PM2.5 evade esas defensas — por eso es el
              contaminante más peligroso para la salud.
            </p>
            <button
              onClick={() => setShowPM25Info(false)}
              className="w-full rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Entendido
            </button>
          </div>
        </>
      )}

    </div>
  );
}
