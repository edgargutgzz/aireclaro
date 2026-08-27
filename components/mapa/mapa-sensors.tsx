"use client";

import { useEffect, useMemo, useRef, useState, useCallback, type Dispatch, type SetStateAction } from "react";
import { Navigation, Layers, Copy, MapPin, ChevronDown, Clock, Award, Check, Minus, Info } from "lucide-react";
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
// in particular is too low-contrast on white to read as a line/fill.
const SPARKLINE_COLOR = "#3b82f6";

// Shown as the default "Calidad del aire" station (San Nicolás: UANL) when
// the visitor hasn't shared their location, instead of a nameless area median.
const DEFAULT_SENSOR_ID = "Norte2";

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
  const verticalPadding = 10; // keeps peaks/troughs from touching the chart edges
  const drawableHeight = height - verticalPadding * 2;
  const values = data.map((d) => d.pm25);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const toY = (value: number) => verticalPadding + drawableHeight - ((value - min) / range) * drawableHeight;

  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * width,
    y: toY(d.pm25),
  }));

  // IMECA thresholds — only draw the ones this window's range actually
  // crosses, so it stays a quiet reference instead of cluttering the chart.
  const thresholds = [
    { value: 15, color: "#eab308" },
    { value: 25, color: "#f97316" },
    { value: 79, color: "#ef4444" },
    { value: 130, color: "#a855f7" },
  ].filter((t) => t.value > min && t.value < max);

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

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
          <path d={areaPath} fill={SPARKLINE_COLOR} fillOpacity={0.12} stroke="none" />
          {thresholds.map((t) => (
            <line key={t.value} x1={0} y1={toY(t.value)} x2={width} y2={toY(t.value)} stroke={t.color} strokeWidth={1} strokeDasharray="4,3" strokeOpacity={0.45} />
          ))}
          {dayBoundaries.map((b) => (
            <line key={b.x} x1={b.x} y1={0} x2={b.x} y2={height} stroke="#9ca3af" strokeWidth={1} strokeDasharray="2,3" />
          ))}
          <path d={linePath} fill="none" stroke={SPARKLINE_COLOR} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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
      style={{ width: size, height: size, borderRadius: 5, backgroundColor: '#3b82f6', flexShrink: 0 }}
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
}: {
  compact: boolean;
  showOtros: boolean;
  setShowOtros: Dispatch<SetStateAction<boolean>>;
  showOccamm: boolean;
  setShowOccamm: Dispatch<SetStateAction<boolean>>;
  showSima: boolean;
  setShowSima: Dispatch<SetStateAction<boolean>>;
  onShowOccammInfo: () => void;
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
          <button type="button" className="rounded-xl bg-blue-50/60 px-5 py-2 text-sm font-semibold text-gray-800 shadow-sm">
            PM2.5
          </button>
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
      <div className="border-t border-gray-200" />
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
                  <Info className="h-4 w-4" />
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
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(0,0,0,0.04) 6px, rgba(0,0,0,0.04) 8px)' }}
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
  const markerElementsRef = useRef(new globalThis.Map<number, { el: HTMLElement; source: string }>());

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showFiltrosContent, setShowFiltrosContent] = useState(false); // desktop only — Filtros body starts collapsed
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showOtros, setShowOtros] = useState(true);
  const [showOccammInfo, setShowOccammInfo] = useState(false);
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
  const [copied, setCopied] = useState(false);
  const [showSensorDetail, setShowSensorDetail] = useState(false);
  const [showNearestDetail, setShowNearestDetail] = useState(false);
  const [sheetState, setSheetState] = useState<'peek' | 'mid'>('peek');
  const [showQualitySource, setShowQualitySource] = useState(false);
  const [isDesktopLegendExpanded, setIsDesktopLegendExpanded] = useState(false);
  const [desktopCardOpen, setDesktopCardOpen] = useState(false);
  const [selectedSensorCardOpen, setSelectedSensorCardOpen] = useState(false);
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

    map.current.on("load", () => {
      setMapLoaded(true);
      const isMobile = window.innerWidth < 768;
      (map.current as any).flyTo({
        center: [-100.301, 25.685],
        zoom: 12,
        duration: 2000,
        essential: true,
        padding: isMobile ? { top: 0, bottom: 180, left: 0, right: 0 } : { top: 0, bottom: 0, left: 280, right: 0 },
      });
    });

    if (navigator.geolocation) {
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
    }

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
    (map.current as any).flyTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 14,
      duration: 3000,
      essential: true,
      padding: isMobile ? { top: 0, bottom: 180, left: 0, right: 0 } : { top: 0, bottom: 0, left: 280, right: 0 },
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

      const markerElement = createMarker(
        latestData ? latestData.pm25 : null,
        sensor.source,
      );

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
        if (window.innerWidth >= 768) { setDesktopCardOpen(false); setSelectedSensorCardOpen(false); }
      });

      markerElementsRef.current.set(sensor.sensor_id, { el: markerElement, source: sensor.source });

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

  // Highlight selected marker, restore all others
  useEffect(() => {
    markerElementsRef.current.forEach(({ el, source }) => {
      el.style.boxShadow = source === "sima"
        ? "0 2px 8px rgba(0,0,0,0.2), 0 0 0 2.5px white"
        : "0 2px 8px rgba(0,0,0,0.25), 0 0 0 2.5px white";
    });
    if (selectedSensor) {
      const markerData = markerElementsRef.current.get(selectedSensor.sensor.sensor_id);
      if (markerData) {
        markerData.el.style.boxShadow = "0 4px 14px rgba(0,0,0,0.25), 0 0 0 3px white, 0 0 0 6px rgba(0,0,0,0.8)";
      }
    }
  }, [selectedSensor]);

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
      return;
    }
    let cancelled = false;
    fetch(`/api/sensor-history?sensor_id=${target.sensorId}&source=${target.source}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSensorHistory(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setSensorHistory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSensor?.sensor.sensor_id, selectedSensor?.sensor.source, nearestSensorData?.sensorId, nearestSensorData?.isSima]);

  // Pulse animation on nearest sensor marker
  useEffect(() => {
    if (!mapLoaded) return;

    markerElementsRef.current.forEach(({ el }) => { el.style.animation = ''; });

    if (!nearestSensorData) return;

    const nearestSensor = sensors.find(
      s => s.lat === nearestSensorData.lat && s.lon === nearestSensorData.lon
    );
    if (!nearestSensor) return;

    const markerData = markerElementsRef.current.get(nearestSensor.sensor_id);
    if (!markerData) return;

    const colorInfo = getPM25Color(nearestSensorData.pm25 ?? null);
    const hex = colorInfo?.bg ?? '#ffffff';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const isSima = nearestSensorData.isSima;
    const baseShadow = isSima
      ? '0 2px 8px rgba(0,0,0,0.2), 0 0 0 2.5px white'
      : '0 2px 8px rgba(0,0,0,0.25), 0 0 0 2.5px white';
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
  }, [nearestSensorData, mapLoaded, sensors, showSima, showOtros, showOccamm]);

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
            aria-label="Filtros"
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
          <p className="text-base font-semibold text-gray-800">Filtros</p>
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
      <div className="pointer-events-none absolute right-6 top-6 z-10 hidden max-h-[calc(100%-3rem)] flex-col items-start overflow-y-auto md:flex">

        {/* Quality card, replaced by the selected sensor's card when one is selected */}
        <div className="w-[460px]">
        {selectedSensor ? (() => {
          const { sensor, pm25, textColor, timestamp } = selectedSensor;
          const isSima = sensor.source === "sima";
          const sensorName = isSima && sensor.nombre_display ? sensor.nombre_display : sensor.nombre;
          const sensorQuality = getQualityInfo(pm25);
          return (
            <div className={`pointer-events-auto overflow-hidden rounded-2xl border shadow-sm transition-colors duration-300 ${selectedSensorCardOpen ? 'border-gray-100 bg-white' : 'border-white/60 bg-white/80 backdrop-blur-md'}`}>
              {/* Always-visible header */}
              <div className="px-5 pt-4 pb-3">
                <span className="text-base font-semibold text-gray-800">Calidad del aire</span>
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-2xl font-bold" style={{ color: textColor }}>
                    {sensorQuality ? sensorQuality.label : "—"}
                  </span>
                  {pm25 !== null && (
                    <span className="text-sm text-gray-400">{roundPM25(pm25)} μg/m³ (PM2.5)</span>
                  )}
                </div>

                {/* Trend sparkline — power-user context (raw history, not just a snapshot) */}
                <div className="mt-3">
                  <Sparkline data={sensorHistory} />
                </div>

                <button
                  onClick={() => setShowSensorDetail(v => !v)}
                  className="mt-1.5 flex min-w-0 w-full items-center gap-1.5 text-sm text-gray-400"
                >
                  <span className="truncate">{isSima ? "Estación" : "Sensor"}: {sensorName}</span>
                  <ChevronDown className={`h-3 w-3 flex-shrink-0 transition-transform duration-200 ${showSensorDetail ? 'rotate-180' : ''}`} />
                </button>
                {showSensorDetail && (
                  <div className="mt-3 overflow-hidden rounded-xl bg-gray-100">
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

              {/* Closed state: Población General + expand hint */}
              {!selectedSensorCardOpen && sensorQuality && (
                <div className="px-5 pb-4">
                  <div className="mt-0 mb-6 border-t border-gray-100" />
                  <div className="mb-4 flex items-center gap-1.5 text-xs font-medium uppercase leading-none tracking-wide text-gray-400">
                    <span>Recomendaciones de salud</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCuidarmeQuality(sensorQuality); }}
                      className="hover:text-gray-600 transition-colors"
                      aria-label="Más información sobre recomendaciones de salud"
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="rounded-xl bg-gray-100 px-4 py-3">
                    <p className="mb-1 text-sm font-semibold text-gray-700">Población General</p>
                    <p className="text-sm leading-relaxed text-gray-500">{sensorQuality.generalRec}</p>
                  </div>
                  <div className="mt-3 flex cursor-pointer justify-center pb-1" onClick={() => setSelectedSensorCardOpen(true)}>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </div>
                </div>
              )}

              {/* Expanded state: all rec cards */}
              {selectedSensorCardOpen && sensorQuality && (
                <div className="relative z-[1] overflow-y-auto px-5 pb-8" style={{ maxHeight: 'calc(100vh - 16rem)' }}>
                  <div className="mt-0 mb-6 border-t border-gray-100" />
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
                  <div className="mt-3 flex cursor-pointer justify-center pb-1" onClick={() => setSelectedSensorCardOpen(false)}>
                    <ChevronDown className="h-4 w-4 rotate-180 text-gray-500" />
                  </div>
                </div>
              )}
            </div>
          );
        })() : qualityInfo && (
          <div className={`pointer-events-auto overflow-hidden rounded-2xl border shadow-sm transition-colors duration-300 ${desktopCardOpen ? 'border-gray-100 bg-white' : 'border-white/60 bg-white/80 backdrop-blur-md'}`}>
            {/* Always-visible header */}
            <div className="px-5 pt-4 pb-3">
              <span className="text-base font-semibold text-gray-800">Calidad del aire</span>
              {/* Quality label + PM2.5 — always shown */}
              <div className="mt-1 flex items-center gap-3">
                <span className="text-2xl font-bold" style={{ color: qualityInfo.textColor }}>
                  {qualityInfo.label}
                </span>
                {displayPm25 !== null && (
                  <span className="text-sm text-gray-400">{roundPM25(displayPm25)} μg/m³ (PM2.5)</span>
                )}
              </div>

              {/* Trend sparkline — power-user context (raw history, not just a snapshot) */}
              <div className="mt-3">
                <Sparkline data={sensorHistory} />
              </div>

              {/* Sensor name — always shown */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowNearestDetail(v => !v); }}
                className="mt-1.5 flex min-w-0 w-full items-center gap-1.5 text-sm text-gray-400"
              >
                <span className="truncate">
                  {nearestName
                    ? `${nearestIsSima ? "Estación" : "Sensor"}: ${nearestName}`
                    : "Promedio del área metropolitana"}
                </span>
                <ChevronDown className={`h-3 w-3 flex-shrink-0 transition-transform duration-200 ${showNearestDetail ? 'rotate-180' : ''}`} />
              </button>
              {showNearestDetail && (
                <div className="mt-3 overflow-hidden rounded-xl bg-gray-100">
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
                        onClick={(e) => {
                          e.stopPropagation();
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

            {/* Closed-only: divider + rec preview + expand hint */}
            {!desktopCardOpen && (
              <div className="px-5 pb-4">
                <div className="mt-0 mb-6 border-t border-gray-100" />
                <div className="mb-4 flex items-center gap-1.5 text-xs font-medium uppercase leading-none tracking-wide text-gray-400">
                  <span>Recomendaciones de salud</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCuidarmeQuality(qualityInfo); }}
                    className="hover:text-gray-600 transition-colors"
                    aria-label="Más información sobre recomendaciones de salud"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </div>
                <div className="rounded-xl bg-gray-100 px-4 py-3">
                  <p className="mb-1 text-sm font-semibold text-gray-700">Población General</p>
                  <p className="text-sm leading-relaxed text-gray-500">{qualityInfo.generalRec}</p>
                </div>
                <div className="mt-3 flex cursor-pointer justify-center pb-1" onClick={() => setDesktopCardOpen(true)}>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </div>
              </div>
            )}

            {/* Expanded content */}
            {desktopCardOpen && (
              <div className="relative z-[1] overflow-y-auto px-5 pb-8" style={{ maxHeight: 'calc(100vh - 16rem)' }}>
                <div className="mt-0 mb-6 border-t border-gray-100" />
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
                <div className="mt-3 flex cursor-pointer justify-center pb-1" onClick={() => setDesktopCardOpen(false)}>
                  <ChevronDown className="h-4 w-4 rotate-180 text-gray-500" />
                </div>
              </div>
            )}
          </div>
        )}
        </div>{/* end card width wrapper */}
      </div>

      {/* Filtros panel — floats on the left, collapsed by default on desktop */}
      <div className="pointer-events-none absolute left-6 top-6 z-10 hidden w-[310px] md:block">
        <div className="pointer-events-auto overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-md">
          <button
            onClick={() => setShowFiltrosContent((v) => !v)}
            className="flex w-full items-center justify-between px-5 pt-4 pb-3"
          >
            <span className="text-base font-semibold text-gray-800">Filtros</span>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showFiltrosContent ? 'rotate-180' : ''}`} />
          </button>
          {showFiltrosContent && (
            <div className="px-5 pb-5">
              <LayersFilterContent
                compact={false}
                showOtros={showOtros}
                setShowOtros={setShowOtros}
                showOccamm={showOccamm}
                setShowOccamm={setShowOccamm}
                showSima={showSima}
                setShowSima={setShowSima}
                onShowOccammInfo={() => setShowOccammInfo(true)}
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
                <div className="mb-2 flex items-center gap-4">
                  <div className="text-3xl font-bold leading-tight" style={{ color: textColor }}>
                    {sensorQuality ? sensorQuality.label : "—"}
                  </div>
                  {pm25 !== null && (
                    <span className="text-sm text-gray-400">
                      {roundPM25(pm25)} μg/m³ (PM2.5)
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
                  <div className="mt-3 mb-6 border-t border-gray-100" />
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
              <span className="text-base font-semibold text-gray-800">Calidad del aire</span>
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
                <div className="mb-2 flex items-center gap-4">
                  <div className="text-3xl font-bold leading-tight" style={{ color: qualityInfo.textColor }}>
                    {qualityInfo.label}
                  </div>
                  {displayPm25 !== null && (
                    <span className="text-sm text-gray-400">
                      {roundPM25(displayPm25)} μg/m³ (PM2.5)
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
              <div className="my-6 border-t border-gray-100" />
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
          <div className="fixed left-1/2 top-1/2 z-[71] w-[85%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-xl">
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

    </div>
  );
}
