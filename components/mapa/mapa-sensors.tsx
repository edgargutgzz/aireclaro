"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Navigation, Layers, X, Landmark, Users, Copy, Baby, Glasses, Heart, HeartPulse, MapPin, ChevronDown, Clock, User } from "lucide-react";
import Navlinks from "@/components/navbar/navlinks";
import mapboxgl, { Map, Marker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { format } from "date-fns";

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

const getPM25Color = (pm25: number | null): { bg: string; text: string } | null => {
  if (pm25 === null || pm25 <= 0.4) return null;
  if (pm25 <= 15) return { bg: "#00e400", text: "#00b300" };
  if (pm25 <= 25) return { bg: "#ffff00", text: "#b8a000" };
  if (pm25 <= 79) return { bg: "#ff7e00", text: "#ff7e00" };
  if (pm25 <= 130) return { bg: "#ff0000", text: "#ff0000" };
  return { bg: "#8f3f97", text: "#8f3f97" };
};

const createMarker = (pm25: number | null, source: string): HTMLElement | null => {
  const colorInfo = getPM25Color(pm25);
  if (!colorInfo) return null;

  const { bg } = colorInfo;
  const isSima = source === "sima";
  const textColor = bg === "#ffff00" ? "#6b7280" : "white";

  const el = document.createElement("div");
  el.style.width = "40px";
  el.style.height = "40px";
  el.style.backgroundColor = bg;
  el.style.borderRadius = "50%";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.opacity = "0.9";
  el.style.boxShadow = isSima
    ? "0 2px 8px rgba(0,0,0,0.2), 0 0 0 2.5px white"
    : "0 2px 8px rgba(0,0,0,0.25), 0 0 0 2.5px white";
  if (isSima) {
    const stripeColor = (bg === "#ffff00" || bg === "#00e400") ? "rgba(0,0,0,0.09)" : "rgba(255,255,255,0.25)";
    el.style.backgroundImage =
      `repeating-linear-gradient(45deg, transparent, transparent 6px, ${stripeColor} 6px, ${stripeColor} 8px)`;
  }
  el.textContent = Math.round(pm25!).toString();
  el.style.color = textColor;
  el.style.fontSize = "12px";
  el.style.fontWeight = "700";

  return el;
};

const roundPM25 = (value: number | null): string | null => {
  return value !== null ? Math.round(value).toString() : null;
};


const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

interface QualityInfo {
  label: string;
  color: string;
  textColor: string;
  generalRec: string;
  sensitiveRecs: {
    menores: string;
    adultos: string;
    embarazadas: string;
    enfermedades: string;
  };
}

const getQualityInfo = (pm25: number | null): QualityInfo | null => {
  if (pm25 === null || pm25 <= 0.4) return null;
  if (pm25 <= 15) return {
    label: "Buena", color: "#00e400", textColor: "#00b300",
    generalRec: "Disfruta las actividades al aire libre.",
    sensitiveRecs: {
      menores: "Disfruta las actividades al aire libre.",
      adultos: "Disfruta las actividades al aire libre.",
      embarazadas: "Disfruta las actividades al aire libre.",
      enfermedades: "Disfruta las actividades al aire libre.",
    },
  };
  if (pm25 <= 25) return {
    label: "Aceptable", color: "#ffff00", textColor: "#b8a000",
    generalRec: "Disfruta las actividades al aire libre. Infórmate sobre la evolución de la calidad del aire.",
    sensitiveRecs: {
      menores: "Disfruta las actividades al aire libre.",
      adultos: "Reduce las actividades físicas vigorosas al aire libre.",
      embarazadas: "Disfruta las actividades al aire libre.",
      enfermedades: "Reduce las actividades físicas vigorosas al aire libre.",
    },
  };
  if (pm25 <= 79) return {
    label: "Mala", color: "#ff7e00", textColor: "#ff7e00",
    generalRec: "Es posible realizar actividades al aire libre. Si presentas síntomas como tos o falta de aire, toma más descansos y realiza actividades menos vigorosas.",
    sensitiveRecs: {
      menores: "Reduce las actividades físicas vigorosas al aire libre. Es posible hacer actividades moderadas en el exterior.",
      adultos: "Reduce las actividades físicas vigorosas al aire libre.",
      embarazadas: "Reduce las actividades físicas vigorosas al aire libre. Es posible hacer actividades moderadas en el exterior.",
      enfermedades: "Reduce las actividades físicas vigorosas al aire libre.",
    },
  };
  if (pm25 <= 130) return {
    label: "Muy mala", color: "#ff0000", textColor: "#ff0000",
    generalRec: "Reduce las actividades físicas al aire libre. Evita la actividad física vigorosa o prolongada en exteriores.",
    sensitiveRecs: {
      menores: "Evita la actividad física al aire libre. Consulta a tu médico si presentas síntomas.",
      adultos: "Evita las actividades físicas y el tiempo al aire libre. Acude al médico si presentas síntomas.",
      embarazadas: "Evita la actividad física al aire libre. Consulta a tu médico si presentas síntomas.",
      enfermedades: "Evita las actividades físicas al aire libre. Acude al médico si presentas síntomas.",
    },
  };
  return {
    label: "Extremadamente mala", color: "#8f3f97", textColor: "#8f3f97",
    generalRec: "Permanece en interiores. Si presentas síntomas respiratorios o cardiacos acude al médico.",
    sensitiveRecs: {
      menores: "Permanece en interiores. Acude al médico si presentas síntomas.",
      adultos: "Permanece en interiores. Acude al médico si presentas síntomas.",
      embarazadas: "Permanece en interiores. Acude al médico si presentas síntomas.",
      enfermedades: "Permanece en interiores. Acude al médico si presentas síntomas.",
    },
  };
};


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
  const [showPurpleAir, setShowPurpleAir] = useState(true);
  const [showSima, setShowSima] = useState(true);
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
        return { pm25: d.pm25, timestamp, name, isSima, lat: sensor.lat, lon: sensor.lon };
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
      if (!isSima && !showPurpleAir) return;

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
        setSelectedSensor({ sensor, pm25: latestData?.pm25 ?? null, color, textColor, timestamp });
      });

      markerElementsRef.current.set(sensor.sensor_id, { el: markerElement, source: sensor.source });

      const marker = new Marker({ element: markerElement })
        .setLngLat([sensor.lon, sensor.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [mapLoaded, sensors, data, showPurpleAir, showSima]);

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
  }, [nearestSensorData, mapLoaded, sensors, showSima, showPurpleAir]);

  // Close selected sensor on map click
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    const handler = () => setSelectedSensor(null);
    map.current.on("click", handler);
    return () => { (map.current as any)?.off("click", handler); };
  }, [mapLoaded]);

  const sheetTransform = sheetState === 'mid' ? 'translateY(0)' : 'translateY(calc(100% - 5rem))';

  const handleSheetTap = useCallback(() => {
    setSheetState((s) => s === 'peek' ? 'mid' : 'peek');
  }, []);

  return (
    <div className="relative h-screen">
      {/* Map container */}
      <div
        ref={mapContainer}
        className="absolute left-0 top-0 h-full w-full md:h-screen"
      />



      {/* Mobile right-side buttons — hidden when sheet is expanded */}
      {sheetState === 'peek' && (
        <div className="fixed right-6 z-[45] flex flex-col gap-2 md:hidden" style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 6rem)' }}>
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
          <button
            onClick={() => setShowSima((v) => !v)}
            className={`flex items-center justify-between rounded-2xl border px-4 py-4 transition-all duration-200 ${
              showSima ? "border-gray-200 bg-white shadow-sm" : "border-gray-100 bg-gray-50 opacity-50"
            }`}
            style={showSima ? { backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(0,0,0,0.04) 6px, rgba(0,0,0,0.04) 8px)' } : undefined}
          >
            <div className="flex items-center gap-3">
              <Landmark className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Estaciones SIMA</span>
            </div>
            <div style={{ width: 40, height: 22, borderRadius: 11, backgroundColor: showSima ? '#3b82f6' : '#e5e7eb', transition: 'background-color 300ms', position: 'relative', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 2, left: 2, width: 18, height: 18, borderRadius: '50%', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 300ms cubic-bezier(0.4,0,0.2,1)', transform: showSima ? 'translateX(18px)' : 'translateX(0)' }} />
            </div>
          </button>
          <button
            onClick={() => setShowPurpleAir((v) => !v)}
            className={`flex items-center justify-between rounded-2xl border px-4 py-4 transition-all duration-200 ${
              showPurpleAir ? "border-gray-200 bg-white shadow-sm" : "border-gray-100 bg-gray-50 opacity-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Sensores Ciudadanos</span>
            </div>
            <div style={{ width: 40, height: 22, borderRadius: 11, backgroundColor: showPurpleAir ? '#3b82f6' : '#e5e7eb', transition: 'background-color 300ms', position: 'relative', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 2, left: 2, width: 18, height: 18, borderRadius: '50%', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 300ms cubic-bezier(0.4,0,0.2,1)', transform: showPurpleAir ? 'translateX(18px)' : 'translateX(0)' }} />
            </div>
          </button>
        </div>
      </div>

      {/* Desktop left area — quality card + filter pills beside it */}
      <div className="pointer-events-none absolute left-6 top-6 z-10 hidden items-start gap-2 md:flex">

        {/* Left column: logo + nav + quality card + legend */}
        <div className="flex w-[300px] flex-col gap-2">

        {/* Nav */}
        <div className="pointer-events-auto overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex w-full items-center justify-around px-4 py-3">
            <Navlinks />
          </div>
        </div>

        {/* Quality card */}
        {qualityInfo && (
          <div className="pointer-events-auto overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="overflow-y-auto px-4 pb-4 pt-4" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
              <div className="mb-5 flex flex-col items-center gap-2">
                <div className="text-2xl font-bold leading-tight" style={{ color: qualityInfo.textColor }}>
                  {qualityInfo.label}
                </div>
                {displayPm25 !== null && (
                  <span className="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-500">
                    {roundPM25(displayPm25)} μg/m³ · PM2.5
                  </span>
                )}
              </div>
              <a href="https://dof.gob.mx/nota_detalle.php?codigo=5715154&fecha=25/01/2024#gsc.tab=0" target="_blank" rel="noopener noreferrer" className="mb-4 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-400 hover:text-gray-600 transition-colors">
                <span className="underline underline-offset-2 decoration-gray-300">Recomendaciones Oficiales</span>
              </a>
              <div className="mb-5 flex flex-col gap-4">
                <div className="rounded-xl bg-gray-50 px-4 py-3">
                  <div className="mb-1 flex items-center gap-2">
                    <User className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-700">Población General</p>
                  </div>
                  <p className="pl-[1.375rem] text-sm leading-relaxed text-gray-500">{qualityInfo.generalRec}</p>
                </div>
                {[
                  { label: "Niños menores de 12", rec: qualityInfo.sensitiveRecs.menores, Icon: Baby },
                  { label: "Adultos mayores", rec: qualityInfo.sensitiveRecs.adultos, Icon: Glasses },
                  { label: "Mujeres embarazadas", rec: qualityInfo.sensitiveRecs.embarazadas, Icon: Heart },
                  { label: "Condiciones cardiovasculares o respiratorias", rec: qualityInfo.sensitiveRecs.enfermedades, Icon: HeartPulse },
                ].map(({ label, rec, Icon }) => (
                  <div key={label} className="rounded-xl bg-gray-50 px-4 py-3">
                    <div className="mb-1 flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                      <p className="text-sm font-semibold text-gray-700">{label}</p>
                    </div>
                    <p className="pl-[1.375rem] text-sm leading-relaxed text-gray-500">{rec}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowNearestDetail(v => !v)} className="mb-5 flex w-full items-center justify-between gap-2 rounded-xl bg-gray-50 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  {userLocation && nearestName
                    ? (nearestIsSima ? <Landmark className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" /> : <Users className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />)
                    : <Users className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                  }
                  <span className="truncate text-sm font-medium text-gray-600">
                    {userLocation && nearestName ? nearestName : "Promedio del área metropolitana"}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${showNearestDetail ? 'rotate-180' : ''}`} />
              </button>
              {showNearestDetail && (
                <div className="mb-5 overflow-hidden rounded-xl bg-gray-50">
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
          </div>
        )}


</div>{/* end left column */}

        {/* Column 2: selected sensor */}
        {selectedSensor && (() => {
          const { sensor, pm25, color, textColor, timestamp } = selectedSensor;
          const isSima = sensor.source === "sima";
          const sensorName = isSima && sensor.nombre_display ? sensor.nombre_display : sensor.nombre;
          const sensorQuality = getQualityInfo(pm25);
          return (
            <div className="pointer-events-auto w-[300px] overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="overflow-y-auto px-4 pb-4 pt-4" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="text-2xl font-bold leading-tight" style={{ color: textColor }}>
                      {sensorQuality ? sensorQuality.label : "—"}
                    </div>
                    {pm25 !== null && (
                      <span className="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-500">
                        {roundPM25(pm25)} μg/m³ · PM2.5
                      </span>
                    )}
                  </div>
                  <button onClick={() => setSelectedSensor(null)} className="ml-2 flex-shrink-0 rounded-full p-1 text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <button
                  onClick={() => setShowSensorDetail(v => !v)}
                  className="mb-5 flex w-full items-center justify-between gap-2 rounded-xl bg-gray-50 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {isSima ? <Landmark className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" /> : <Users className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />}
                    <span className="truncate text-sm font-medium text-gray-600">{sensorName}</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${showSensorDetail ? 'rotate-180' : ''}`} />
                </button>
                {showSensorDetail && (
                  <div className="mb-5 overflow-hidden rounded-xl bg-gray-50">
                    <div className="flex flex-col gap-3 px-4 py-3">
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
                {sensorQuality && (
                  <>
                    <a href="https://dof.gob.mx/nota_detalle.php?codigo=5715154&fecha=25/01/2024#gsc.tab=0" target="_blank" rel="noopener noreferrer" className="mb-4 mt-10 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-400 hover:text-gray-600 transition-colors"><span className="underline underline-offset-2 decoration-gray-300">Recomendaciones Oficiales</span></a>
                    <div className="mb-5 flex flex-col gap-4">
                      <div className="rounded-xl bg-gray-50 px-4 py-3">
                        <div className="mb-1 flex items-center gap-2">
                          <User className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                          <p className="text-sm font-semibold text-gray-700">Población General</p>
                        </div>
                        <p className="pl-[1.375rem] text-sm leading-relaxed text-gray-500">{sensorQuality.generalRec}</p>
                      </div>
                      {[
                        { label: "Niños menores de 12", rec: sensorQuality.sensitiveRecs.menores, Icon: Baby },
                        { label: "Adultos mayores", rec: sensorQuality.sensitiveRecs.adultos, Icon: Glasses },
                        { label: "Mujeres embarazadas", rec: sensorQuality.sensitiveRecs.embarazadas, Icon: Heart },
                        { label: "Condiciones cardiovasculares o respiratorias", rec: sensorQuality.sensitiveRecs.enfermedades, Icon: HeartPulse },
                      ].map(({ label, rec, Icon }) => (
                        <div key={label} className="rounded-xl bg-gray-50 px-4 py-3">
                          <div className="mb-1 flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                            <p className="text-sm font-semibold text-gray-700">{label}</p>
                          </div>
                          <p className="pl-[1.375rem] text-sm leading-relaxed text-gray-500">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}

      </div>

      {/* Desktop filter panel — above layers button */}
      {showFilters && (
        <div className="pointer-events-auto absolute bottom-[13.5rem] right-8 z-10 hidden w-[220px] flex-col gap-3 rounded-2xl bg-white p-4 shadow-lg md:flex">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Capas</p>
          <button
            onClick={() => setShowSima((v) => !v)}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 transition-all duration-200 ${
              showSima ? "border-gray-200 bg-white shadow-sm" : "border-gray-100 bg-gray-50 opacity-50"
            }`}
            style={showSima ? { backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(0,0,0,0.04) 6px, rgba(0,0,0,0.04) 8px)' } : undefined}
          >
            <div className="flex items-center gap-3">
              <Landmark className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Estaciones SIMA</span>
            </div>
            <div style={{ width: 36, height: 20, borderRadius: 10, backgroundColor: showSima ? '#3b82f6' : '#e5e7eb', transition: 'background-color 300ms', position: 'relative', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 2, left: 2, width: 16, height: 16, borderRadius: '50%', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 300ms cubic-bezier(0.4,0,0.2,1)', transform: showSima ? 'translateX(16px)' : 'translateX(0)' }} />
            </div>
          </button>
          <button
            onClick={() => setShowPurpleAir((v) => !v)}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 transition-all duration-200 ${
              showPurpleAir ? "border-gray-200 bg-white shadow-sm" : "border-gray-100 bg-gray-50 opacity-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Sensores Ciudadanos</span>
            </div>
            <div style={{ width: 36, height: 20, borderRadius: 10, backgroundColor: showPurpleAir ? '#3b82f6' : '#e5e7eb', transition: 'background-color 300ms', position: 'relative', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 2, left: 2, width: 16, height: 16, borderRadius: '50%', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 300ms cubic-bezier(0.4,0,0.2,1)', transform: showPurpleAir ? 'translateX(16px)' : 'translateX(0)' }} />
            </div>
          </button>
        </div>
      )}

      {/* Desktop zoom + locate buttons — bottom-right */}
      <div className="pointer-events-auto absolute bottom-16 right-8 z-10 hidden flex-col gap-2 md:flex">
        <button
          onClick={userLocation ? flyToUser : requestLocation}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.18)] transition-colors hover:bg-gray-50"
          aria-label="Mi ubicación"
        >
          <Navigation className={`h-5 w-5 ${userLocation ? 'text-gray-700' : 'text-gray-400'}`} />
        </button>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex h-10 w-10 items-center justify-center rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.18)] transition-colors hover:bg-gray-50 ${showFilters ? 'bg-gray-100' : 'bg-white'}`}
          aria-label="Filtrar capas"
        >
          <Layers className={`h-5 w-5 ${showFilters ? 'text-gray-900' : 'text-gray-700'}`} />
        </button>
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
                className="flex-1 overflow-y-auto px-5 pb-8"
              >
              <div className="mb-5 flex items-center gap-2">
                <div className="text-3xl font-bold leading-tight" style={{ color: textColor }}>
                  {sensorQuality ? sensorQuality.label : "—"}
                </div>
                {pm25 !== null && (
                  <span className="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-500">
                    {roundPM25(pm25)} μg/m³ · PM2.5
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowSensorDetail(v => !v)}
                className="mb-5 flex w-full items-center justify-between gap-2 rounded-xl bg-gray-50 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {isSima ? <Landmark className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" /> : <Users className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />}
                  <span className="truncate text-sm font-medium text-gray-600">{sensorName}</span>
                </div>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${showSensorDetail ? 'rotate-180' : ''}`} />
              </button>
              {showSensorDetail && (
                <div className="mb-5 overflow-hidden rounded-xl bg-gray-50">
                  <div className="flex flex-col gap-3 px-4 py-3">
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
              {sensorQuality && (
                <>
                  <a href="https://dof.gob.mx/nota_detalle.php?codigo=5715154&fecha=25/01/2024#gsc.tab=0" target="_blank" rel="noopener noreferrer" className="mb-4 mt-10 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-400 hover:text-gray-600 transition-colors"><span className="underline underline-offset-2 decoration-gray-300">Recomendaciones Oficiales</span></a>
                  <div className="mb-5 flex flex-col gap-4">
                    <div className="rounded-xl bg-gray-50 px-4 py-3">
                      <div className="mb-1 flex items-center gap-2">
                        <User className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                        <p className="text-sm font-semibold text-gray-700">Población General</p>
                      </div>
                      <p className="pl-[1.375rem] text-sm leading-relaxed text-gray-500">{sensorQuality.generalRec}</p>
                    </div>
                    {[
                      { label: "Niños menores de 12", rec: sensorQuality.sensitiveRecs.menores, Icon: Baby },
                      { label: "Adultos mayores", rec: sensorQuality.sensitiveRecs.adultos, Icon: Glasses },
                      { label: "Mujeres embarazadas", rec: sensorQuality.sensitiveRecs.embarazadas, Icon: Heart },
                      { label: "Condiciones cardiovasculares o respiratorias", rec: sensorQuality.sensitiveRecs.enfermedades, Icon: HeartPulse },
                    ].map(({ label, rec, Icon }) => (
                      <div key={label} className="rounded-xl bg-gray-50 px-4 py-3">
                        <div className="mb-1 flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                          <p className="text-sm font-semibold text-gray-700">{label}</p>
                        </div>
                        <p className="pl-[1.375rem] text-sm leading-relaxed text-gray-500">{rec}</p>
                      </div>
                    ))}
                  </div>
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
        className="fixed left-0 right-0 z-[40] rounded-t-3xl bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex flex-col md:hidden overflow-hidden"
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
          className={`flex-1 overflow-y-auto px-5 pb-8 ${sheetState === 'peek' ? 'invisible' : ''}`}
        >
          {qualityInfo && (
            <>
              <div className="mb-5 flex items-center gap-2">
                <div className="text-3xl font-bold leading-tight" style={{ color: qualityInfo.textColor }}>
                  {qualityInfo.label}
                </div>
                {displayPm25 !== null && (
                  <span className="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-500">
                    {roundPM25(displayPm25)} μg/m³ · PM2.5
                  </span>
                )}
              </div>

              <button
                onClick={() => setShowNearestDetail(v => !v)}
                className="mb-5 flex w-full items-center justify-between gap-2 rounded-xl bg-gray-50 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {userLocation && nearestName
                    ? (nearestIsSima ? <Landmark className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" /> : <Users className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />)
                    : <Users className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                  }
                  <span className="truncate text-sm font-medium text-gray-600">
                    {userLocation && nearestName ? nearestName : "Promedio del área metropolitana"}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${showNearestDetail ? 'rotate-180' : ''}`} />
              </button>
              {showNearestDetail && (
                <div className="mb-5 overflow-hidden rounded-xl bg-gray-50">
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

              {/* Recommendations */}
              <a href="https://dof.gob.mx/nota_detalle.php?codigo=5715154&fecha=25/01/2024#gsc.tab=0" target="_blank" rel="noopener noreferrer" className="mb-4 mt-10 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-400 hover:text-gray-600 transition-colors"><span className="underline underline-offset-2 decoration-gray-300">Recomendaciones Oficiales</span></a>
              <div className="mb-5 flex flex-col gap-4">
                <div className="rounded-xl bg-gray-50 px-4 py-3">
                  <div className="mb-1 flex items-center gap-2">
                    <User className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-700">Población General</p>
                  </div>
                  <p className="pl-[1.375rem] text-sm leading-relaxed text-gray-500">{qualityInfo.generalRec}</p>
                </div>
                {[
                  { label: "Niños menores de 12", rec: qualityInfo.sensitiveRecs.menores, Icon: Baby },
                  { label: "Adultos mayores", rec: qualityInfo.sensitiveRecs.adultos, Icon: Glasses },
                  { label: "Mujeres embarazadas", rec: qualityInfo.sensitiveRecs.embarazadas, Icon: Heart },
                  { label: "Condiciones cardiovasculares o respiratorias", rec: qualityInfo.sensitiveRecs.enfermedades, Icon: HeartPulse },
                ].map(({ label, rec, Icon }) => (
                  <div key={label} className="rounded-xl bg-gray-50 px-4 py-3">
                    <div className="mb-1 flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                      <p className="text-sm font-semibold text-gray-700">{label}</p>
                    </div>
                    <p className="pl-[1.375rem] text-sm leading-relaxed text-gray-500">{rec}</p>
                  </div>
                ))}
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  );
}
