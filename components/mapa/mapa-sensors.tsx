"use client";

import { useEffect, useMemo, useRef, useState, useCallback, type Dispatch, type SetStateAction } from "react";
import { Navigation, Layers, X, Copy, MapPin, ChevronDown, Clock, Award, Check, Minus, Info } from "lucide-react";
import Navlinks from "@/components/navbar/navlinks";
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
      style={{ width: size, height: size, borderRadius: 5, backgroundColor: '#9ca3af', flexShrink: 0 }}
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
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <button
          onClick={toggleCitizenGroup}
          className={`flex w-full items-center gap-3 px-4 ${rowPadding}`}
        >
          <LayerCheckbox state={citizenState} size={boxSize} />
          <span className="text-sm font-medium text-gray-700">Sensores Ciudadanos</span>
        </button>
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
    if (!userLocation || !sensors.length || !data.length) return null;
    const sorted = [...sensors].sort((a, b) =>
      getDistance(userLocation.latitude, userLocation.longitude, a.lat, a.lon) -
      getDistance(userLocation.latitude, userLocation.longitude, b.lat, b.lon)
    );
    for (const sensor of sorted) {
      const d = data.find((item) => item.sensor_id === sensor.sensor_id);
      if (d && d.pm25 !== null && d.pm25 > 0.4) {
        const timestamp = format(new Date(d.time_stamp), "h") + ":00 " + format(new Date(d.time_stamp), "a");
        const isSima = sensor.source === "sima";
        const name = isSima && sensor.nombre_display ? sensor.nombre_display : sensor.nombre;
        return { pm25: d.pm25, timestamp, name, isSima, lat: sensor.lat, lon: sensor.lon, sensorId: sensor.sensor_id };
      }
    }
    return null;
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
      center: [-100.32098588977951, 25.665],
      zoom: 8,
    });

    map.current.on("load", () => {
      setMapLoaded(true);
      const isMobile = window.innerWidth < 768;
      (map.current as any).flyTo({
        center: [-100.32098588977951, 25.665],
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
    <div className="relative h-svh">
      {/* Map container */}
      <div
        ref={mapContainer}
        className="absolute left-0 top-0 h-full w-full md:h-screen"
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
            aria-label="Filtrar capas"
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
          <p className="text-sm font-medium text-gray-400">Capas</p>
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

      {/* Desktop layers panel — floats in from the right, same glass style as the left cards.
          No click-away backdrop: the map stays interactive (zoom/pan) while this is open,
          close via the X or the Layers toggle button. */}
      <div
        className="pointer-events-none fixed right-6 top-6 z-[61] hidden w-[340px] md:block"
      >
        <div
          className="pointer-events-auto overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-md"
          style={{
            transform: showFilters ? 'translateX(0)' : 'translateX(16px)',
            opacity: showFilters ? 1 : 0,
            transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease',
            pointerEvents: showFilters ? 'auto' : 'none',
          }}
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <span className="text-sm font-medium text-gray-400">Capas</span>
            <button
              onClick={() => setShowFilters(false)}
              className="rounded-full p-1 text-gray-400 hover:text-gray-600"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
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
        </div>
      </div>

      {/* Desktop right-side floating controls */}
      <div className="pointer-events-none absolute bottom-12 right-12 z-10 hidden flex-col gap-2 md:flex">
        <button
          onClick={userLocation ? flyToUser : requestLocation}
          className="pointer-events-auto flex h-[52px] w-[52px] items-center justify-center rounded-xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-md transition-colors hover:bg-white/90"
          aria-label={userLocation ? 'Mi ubicación' : 'Activar ubicación'}
        >
          <Navigation className={`h-5 w-5 ${userLocation ? 'text-gray-700' : 'text-gray-400'}`} />
        </button>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`pointer-events-auto flex h-[52px] w-[52px] items-center justify-center rounded-xl border shadow-sm backdrop-blur-md transition-colors hover:bg-white/90 ${showFilters ? 'border-gray-900/20 bg-white/90' : 'border-white/60 bg-white/80'}`}
          aria-label="Capas"
        >
          <Layers className={`h-5 w-5 ${showFilters ? 'text-gray-900' : 'text-gray-700'}`} />
        </button>
      </div>

      {/* Desktop left area — nav rail column, then the quality card as its own column to the right */}
      <div className="pointer-events-none absolute left-6 top-6 z-10 hidden items-start gap-2 md:flex">

        {/* Nav column — vertical rail */}
        <div className="pointer-events-auto w-[210px] flex-shrink-0 overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-md">
          <div className="flex flex-col items-stretch gap-1 p-2.5">
            <Navlinks />
          </div>
        </div>

        {/* Card column: quality card, replaced by the selected sensor's card when one is selected */}
        <div className="flex w-[340px] flex-col gap-2">

        {selectedSensor ? (() => {
          const { sensor, pm25, color, textColor, timestamp } = selectedSensor;
          const isSima = sensor.source === "sima";
          const sensorName = isSima && sensor.nombre_display ? sensor.nombre_display : sensor.nombre;
          const sensorQuality = getQualityInfo(pm25);
          return (
            <div className={`pointer-events-auto overflow-hidden rounded-2xl border shadow-sm transition-colors duration-300 ${selectedSensorCardOpen ? 'border-gray-100 bg-white' : 'border-white/60 bg-white/80 backdrop-blur-md'}`}>
              {/* Always-visible header */}
              <div className="px-5 pt-4 pb-3">
                <span className="text-sm font-medium text-gray-400">Calidad del aire</span>
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-2xl font-bold" style={{ color: textColor }}>
                    {sensorQuality ? sensorQuality.label : "—"}
                  </span>
                  {pm25 !== null && (
                    <span className="text-sm text-gray-400">{roundPM25(pm25)} μg/m³ (PM2.5)</span>
                  )}
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
                  <button onClick={(e) => { e.stopPropagation(); setCuidarmeQuality(sensorQuality); }} className="mb-4 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-400 hover:text-gray-600 transition-colors">
                    <span className="underline underline-offset-2 decoration-gray-300">Recomendaciones de salud</span>
                  </button>
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
                  <button onClick={() => setCuidarmeQuality(sensorQuality)} className="mb-4 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-400 hover:text-gray-600 transition-colors">
                    <span className="underline underline-offset-2 decoration-gray-300">Recomendaciones de salud</span>
                  </button>
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
              <span className="text-sm font-medium text-gray-400">Calidad del aire</span>
              {/* Quality label + PM2.5 — always shown */}
              <div className="mt-1 flex items-center gap-3">
                <span className="text-2xl font-bold" style={{ color: qualityInfo.textColor }}>
                  {qualityInfo.label}
                </span>
                {displayPm25 !== null && (
                  <span className="text-sm text-gray-400">{roundPM25(displayPm25)} μg/m³ (PM2.5)</span>
                )}
              </div>
              {/* Sensor name — always shown */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowNearestDetail(v => !v); }}
                className="mt-1.5 flex min-w-0 w-full items-center gap-1.5 text-sm text-gray-400"
              >
                <span className="truncate">
                  {userLocation && nearestName
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
                    {(userLocation ? nearestTimestamp : latestPurpleAirTimestamp) && (
                      <div className="flex items-center gap-2.5">
                        <Clock className="h-3 w-3 flex-shrink-0 text-gray-400" />
                        <span className="text-sm text-gray-400">Actualizado a las {userLocation ? nearestTimestamp : latestPurpleAirTimestamp}</span>
                      </div>
                    )}
                    {userLocation && nearestLat !== null && nearestLon !== null && (
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
                <button onClick={(e) => { e.stopPropagation(); setCuidarmeQuality(qualityInfo); }} className="mb-4 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-400 hover:text-gray-600 transition-colors">
                  <span className="underline underline-offset-2 decoration-gray-300">Recomendaciones de salud</span>
                </button>
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
                <button onClick={() => setCuidarmeQuality(qualityInfo)} className="mb-4 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-400 hover:text-gray-600 transition-colors">
                  <span className="underline underline-offset-2 decoration-gray-300">Recomendaciones de salud</span>
                </button>
                <HealthRecommendationCards info={qualityInfo} />
                <div className="mt-3 flex cursor-pointer justify-center pb-1" onClick={() => setDesktopCardOpen(false)}>
                  <ChevronDown className="h-4 w-4 rotate-180 text-gray-500" />
                </div>
              </div>
            )}
          </div>
        )}

        </div>{/* end card column */}
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
                  <button onClick={() => setCuidarmeQuality(sensorQuality)} className="mb-4 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-400 hover:text-gray-600 transition-colors">
                    <span className="underline underline-offset-2 decoration-gray-300">Recomendaciones de salud</span>
                  </button>
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
              <span className="text-sm font-medium text-gray-400">Calidad del aire</span>
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
                    {userLocation && nearestName
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
                      {(userLocation ? nearestTimestamp : latestPurpleAirTimestamp) && (
                        <div className="flex items-center gap-2.5">
                          <Clock className="h-3 w-3 flex-shrink-0 text-gray-400" />
                          <span className="text-sm text-gray-400">Actualizado a las {userLocation ? nearestTimestamp : latestPurpleAirTimestamp}</span>
                        </div>
                      )}
                      {userLocation && nearestLat !== null && nearestLon !== null && (
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
              <button onClick={() => setCuidarmeQuality(qualityInfo)} className="mb-4 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-400 hover:text-gray-600 transition-colors">
                <span className="underline underline-offset-2 decoration-gray-300">Recomendaciones de salud</span>
              </button>
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
