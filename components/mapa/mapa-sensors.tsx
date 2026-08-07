"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, Info, X, Landmark, Users } from "lucide-react";
import mapboxgl, { Map, Marker, Popup } from "mapbox-gl";
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

// Function to get marker color based on pm25 value
const createMarker = (
  pm25: number | null,
  source: string,
): HTMLElement | null => {
  let markerColor = "bg-gray-400";

  if (pm25 === null || pm25 < 0 || pm25 <= 0.4) {
    markerColor = "bg-gray-400";
  } else if (pm25 > 0.4 && pm25 <= 15) {
    markerColor = "bg-[#00e400]";
  } else if (pm25 > 15 && pm25 <= 25) {
    markerColor = "bg-[#ffff00]";
  } else if (pm25 > 25 && pm25 <= 79) {
    markerColor = "bg-[#ff7e00]";
  } else if (pm25 > 79 && pm25 <= 130) {
    markerColor = "bg-[#ff0000]";
  } else if (pm25 > 130) {
    markerColor = "bg-[#8f3f97]";
  }

  if (markerColor === "bg-gray-400") {
    return null;
  }

  const marker = document.createElement("div");
  const textColor =
    markerColor === "bg-[#ffff00]" ? "text-gray-700" : "text-white";
  marker.className = `marker ${markerColor} bg-opacity-90 w-10 h-10 flex items-center justify-center rounded-full ${textColor} text-xs font-bold`;
  marker.style.boxShadow = source === "sima"
    ? "0 2px 8px rgba(0,0,0,0.2), 0 0 0 2px white, 0 0 0 4px #1f2937"
    : "0 2px 8px rgba(0,0,0,0.2), 0 0 0 4px rgba(255,255,255,0.8)";
  marker.setAttribute("data-marker-color", markerColor);

  if (pm25 !== null && pm25 >= 0) {
    marker.textContent = roundPM25(pm25);
  }

  return marker;
};

const roundPM25 = (value: number | null): string | null => {
  return value !== null ? Math.round(value).toString() : null;
};

const formatLatLon = (value: number): string => {
  return value.toFixed(5);
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

// Mapping between Tailwind color classes for popup borders
const borderColorMap: { [key: string]: string } = {
  "bg-[#00e400]": "#00e400",
  "bg-[#ffff00]": "#ffff00",
  "bg-[#ff7e00]": "#ff7e00",
  "bg-[#ff0000]": "#ff0000",
  "bg-[#8f3f97]": "#8f3f97",
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

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLegendVisible, setIsLegendVisible] = useState(false);
const [mapLoaded, setMapLoaded] = useState(false);
  const [showPurpleAir, setShowPurpleAir] = useState(true);
  const [showSima, setShowSima] = useState(true);
  const [sheetState, setSheetState] = useState<'closed' | 'mid' | 'full'>('closed');
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartY = useRef(0);

  // Find the nearest sensor's PM2.5 reading to the user's location
  const nearestPm25 = useMemo(() => {
    if (!userLocation || !sensors.length || !data.length) return null;
    const sorted = [...sensors].sort((a, b) =>
      getDistance(userLocation.latitude, userLocation.longitude, a.lat, a.lon) -
      getDistance(userLocation.latitude, userLocation.longitude, b.lat, b.lon)
    );
    for (const sensor of sorted) {
      const d = data.find((item) => item.sensor_id === sensor.sensor_id);
      if (d && d.pm25 !== null && d.pm25 > 0.4) return d.pm25;
    }
    return null;
  }, [userLocation, sensors, data]);

  const qualityInfo = getQualityInfo(nearestPm25);

  // Initialize map once
  useEffect(() => {
    if (map.current) return;

    map.current = new Map({
      container: mapContainer.current!,
      style: "mapbox://styles/edgargutgzz/climactgb00cn01qw7amo9bbd",
      center: [-100.32098588977951, 25.665],
      zoom: 10,
    });

    map.current.on("load", () => {
      setMapLoaded(true);
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
          console.error("Error getting user location:", error);
        },
      );
    }
  }, []);

  const flyToUser = () => {
    if (!userLocation || !map.current) return;
    (map.current as any).flyTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 13,
      duration: 1500,
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
      box-shadow: 0 0 0 rgba(59, 130, 246, 0.4);
      animation: pulsate 2s ease-out infinite;
    `;

    if (!document.querySelector("style[data-user-marker]")) {
      const style = document.createElement("style");
      style.textContent = `
        @keyframes pulsate {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `;
      style.setAttribute("data-user-marker", "true");
      document.head.appendChild(style);
    }

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

      const markerColorClass = markerElement.getAttribute("data-marker-color");
      const popupBorderColor = markerColorClass
        ? borderColorMap[markerColorClass]
        : "#FFFFFF";
      const popupTextColor = popupBorderColor === "#ffff00" ? "#b8a000" : popupBorderColor;

      const sensorName = isSima && sensor.nombre_display ? sensor.nombre_display : sensor.nombre;
      const sourceLabel = isSima ? "Estación SIMA" : "Sensor Ciudadano";
      const sourceIcon = isSima
        ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>`
        : `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
      const value = latestData ? roundPM25(latestData.pm25) : "—";
      const timestamp = latestData ? format(new Date(latestData.time_stamp), "h:00 a") : null;

      const popup = new Popup({
        offset: 25,
        closeButton: false,
      }).setHTML(`
        <div style="padding: 14px; min-width: 170px;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
            <div style="width: 4px; height: 44px; border-radius: 2px; background: ${popupBorderColor}; flex-shrink: 0;"></div>
            <div>
              <div style="font-size: 30px; font-weight: 700; line-height: 1; color: ${popupTextColor};">${value}</div>
              <div style="font-size: 11px; color: #9ca3af; margin-top: 3px;">μg/m³ · PM2.5</div>
            </div>
          </div>
          <div style="font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 2px;">${sensorName}</div>
          <div style="display: flex; align-items: center; gap: 4px; margin-bottom: ${timestamp ? "8px" : "0"};">
            ${sourceIcon}
            <span style="font-size: 11px; color: #9ca3af;">${sourceLabel}</span>
          </div>
          ${timestamp ? `
            <div style="display: flex; align-items: center; gap: 5px;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span style="font-size: 11px; color: #6b7280;">Actualizado a las ${timestamp}</span>
            </div>
          ` : ""}
        </div>
      `);

      const marker = new Marker({ element: markerElement })
        .setLngLat([sensor.lon, sensor.lat])
        .setPopup(popup)
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

  // Add popup styles if not already added
  useEffect(() => {
    if (!document.querySelector("style[data-popup-shadow]")) {
      const style = document.createElement("style");
      style.textContent = `
        .mapboxgl-popup-content {
          background: rgba(255, 255, 255, 0.88) !important;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          border-radius: 1rem !important;
          padding: 0;
        }
        .mapboxgl-popup-tip {
          border-top-color: rgba(255,255,255,0.88) !important;
          border-bottom-color: rgba(255,255,255,0.88) !important;
        }
      `;
      style.setAttribute("data-popup-shadow", "true");
      document.head.appendChild(style);
    }
  }, []);

  const sheetTopBase = sheetState === 'full' ? '8vh' : sheetState === 'mid' ? '55vh' : '100vh';
  const sheetTopStyle = dragOffset > 0 ? `calc(${sheetTopBase} + ${dragOffset}px)` : sheetTopBase;

  const handleHandleTap = () => {
    if (sheetState === 'mid') setSheetState('full');
    else if (sheetState === 'full') setSheetState('mid');
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta > 0) setDragOffset(delta);
  };

  const handleTouchEnd = () => {
    if (dragOffset > 80) {
      if (sheetState === 'full') setSheetState('mid');
      else if (sheetState === 'mid') setSheetState('closed');
    }
    setDragOffset(0);
  };

  return (
    <div className="relative h-screen">
      {/* Map container */}
      <div
        ref={mapContainer}
        className="absolute left-0 top-0 h-full w-full md:h-screen"
      />

      {/* Empty state when both sources are toggled off */}
      {!showPurpleAir && !showSima && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4">
          <div className="rounded-2xl bg-white px-6 py-5 text-center shadow-lg">
            <p className="mb-3 text-sm text-gray-600">Activa al menos una fuente para ver los datos.</p>
            <button
              onClick={() => { setShowPurpleAir(true); setShowSima(true); }}
              className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-700 transition-colors"
            >
              Mostrar todo
            </button>
          </div>
        </div>
      )}

      {/* Locate me button — mobile only */}
      {userLocation && (
        <button
          onClick={flyToUser}
          className="fixed right-6 z-[45] rounded-xl border border-white/60 bg-white/80 p-3 backdrop-blur-md transition-colors duration-200 shadow-sm md:hidden"
          style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 2rem)' }}
          aria-label="Ir a mi ubicación"
        >
          <LocateFixed className="h-6 w-6 text-gray-700" />
        </button>
      )}

      {/* Mobile filter pills — full width 50/50 */}
      <div className="absolute left-0 right-0 top-6 z-10 flex flex-row gap-2 px-4 md:hidden">
        <button
          onClick={() => setShowSima((v) => !v)}
          className={`flex-1 rounded-full border-2 px-4 py-2 backdrop-blur-md transition-all duration-200 ${
            showSima ? "border-gray-900 bg-white/80 text-gray-900 shadow-sm" : "border-white/20 bg-white/20 text-white/60"
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <Landmark className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Estación SIMA</span>
          </div>
        </button>
        <button
          onClick={() => setShowPurpleAir((v) => !v)}
          className={`flex-1 rounded-full border px-4 py-2 backdrop-blur-md transition-all duration-200 ${
            showPurpleAir ? "border-white/60 bg-white/80 text-gray-900 shadow-sm" : "border-white/20 bg-white/20 text-white/60"
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Sensor Ciudadano</span>
          </div>
        </button>
      </div>

      {/* Desktop left panel — one outer card, three inner cards */}
      <div className="absolute left-6 top-[5rem] z-10 hidden md:block">
        <div className="flex w-[280px] flex-col gap-2 rounded-2xl border border-white/60 bg-white/40 p-2 shadow-sm backdrop-blur-md">

          {/* Inner card 1: Fuente */}
          <div className="rounded-xl bg-white px-2 py-3">
            <div className="mb-2 px-3 text-xs font-semibold text-gray-700">Fuente</div>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => setShowSima((v) => !v)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all duration-200 ${
                  showSima ? "bg-gray-100 text-gray-900 ring-1 ring-inset ring-gray-900" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Landmark className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs font-medium">Estación SIMA</span>
              </button>
              <button
                onClick={() => setShowPurpleAir((v) => !v)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all duration-200 ${
                  showPurpleAir ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Users className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs font-medium">Sensor Ciudadano</span>
              </button>
            </div>
          </div>

          {/* Inner card 2: Navegación */}
          {userLocation && (
            <div className="rounded-xl bg-white px-2 py-3">
              <div className="mb-2 px-3 text-xs font-semibold text-gray-700">Navegación</div>
              <button
                onClick={flyToUser}
                className="flex w-full items-center gap-2.5 rounded-lg bg-gray-100 px-3 py-2 text-left text-gray-900 transition-colors duration-200 hover:bg-gray-200"
              >
                <LocateFixed className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs font-medium">Centrar en mi ubicación</span>
              </button>
            </div>
          )}

          {/* Inner card 3: Legend */}
          <div className="rounded-xl bg-white px-2 py-3">
            <div className="mb-3 flex items-center gap-2 px-3">
              <span className="text-xs font-semibold text-gray-700">Calidad del Aire</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">PM2.5</span>
            </div>
            <LegendContent />
          </div>

        </div>
      </div>

      {/* Legend toggle button — mobile only, bottom right above locate button */}
      <button
        onClick={() => setIsLegendVisible(!isLegendVisible)}
        className="fixed right-6 z-[45] rounded-xl border border-white/60 bg-white/80 p-3 backdrop-blur-md shadow-sm transition-colors duration-200 md:hidden"
        style={{ bottom: 'calc(9.25rem + env(safe-area-inset-bottom, 0px))' }}
        aria-label={isLegendVisible ? "Ocultar leyenda" : "Mostrar leyenda"}
      >
        <Info className="h-6 w-6 text-gray-700" />
      </button>

      {/* Legend backdrop — mobile only */}
      <div
        className={`fixed inset-0 z-[46] bg-black/20 transition-opacity duration-300 md:hidden ${
          isLegendVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsLegendVisible(false)}
      />

      {/* Legend panel — mobile: slides up from bottom */}
      <div
        className={`fixed left-0 right-0 bottom-0 z-[47] rounded-t-3xl bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden ${
          isLegendVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 pb-4 pt-5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Calidad del Aire</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">PM2.5</span>
          </div>
          <button
            onClick={() => setIsLegendVisible(false)}
            aria-label="Cerrar"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        <div className="px-5 pt-2" style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 1rem)' }}>
          <LegendContent />
        </div>
      </div>

      {/* Bottom sheet backdrop */}
      <div
        className={`fixed inset-0 z-[35] bg-black/20 transition-opacity duration-300 ${
          sheetState !== 'closed' ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setSheetState('closed')}
      />

      {/* Bottom sheet — 3-state: closed / mid / full — sits below navbar (z-50) */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[40] rounded-t-3xl bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)] overflow-hidden"
        style={{
          top: sheetTopStyle,
          transition: dragOffset > 0 ? 'none' : 'top 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {qualityInfo && (
          <>
            {/* Drag handle — tap to toggle mid↔full, drag down to dismiss */}
            <div
              className="cursor-pointer select-none px-5 pb-4 pt-3"
              onClick={handleHandleTap}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-gray-200" />
              <div className="mb-4">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Calidad del aire cerca de ti
                </span>
              </div>
              <div className="mb-2 flex items-end gap-3">
                <div
                  className="text-4xl font-bold leading-none"
                  style={{ color: qualityInfo.textColor }}
                >
                  {qualityInfo.label}
                </div>
                {nearestPm25 !== null && (
                  <div className="mb-1 text-sm text-gray-400">
                    {Math.round(nearestPm25)} μg/m³
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600">{qualityInfo.generalRec}</p>
            </div>

            {/* Scrollable content — visible only in full state */}
            <div className="overflow-y-auto px-5 pb-24">
              <div className="mb-4 h-px bg-gray-100" />
              <div className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                Para grupos sensibles
              </div>
              <div className="mb-6 flex flex-col gap-4">
                {[
                  { label: "Niños (menores de 12)", rec: qualityInfo.sensitiveRecs.menores },
                  { label: "Adultos mayores", rec: qualityInfo.sensitiveRecs.adultos },
                  { label: "Mujeres embarazadas", rec: qualityInfo.sensitiveRecs.embarazadas },
                  { label: "Enfermedades cardio o respiratorias", rec: qualityInfo.sensitiveRecs.enfermedades },
                ].map(({ label, rec }) => (
                  <div key={label}>
                    <div className="mb-0.5 text-xs font-semibold text-gray-700">{label}</div>
                    <div className="text-xs text-gray-500">{rec}</div>
                  </div>
                ))}
              </div>
              <div className="mb-3 h-px bg-gray-100" />
              <div className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                Escala de colores
              </div>
              <div className="flex flex-col gap-2">
                {[
                  { color: "#00e400", label: "Buena", range: "0 – 15 μg/m³" },
                  { color: "#ffff00", label: "Aceptable", range: "15 – 25 μg/m³" },
                  { color: "#ff7e00", label: "Mala", range: "25 – 79 μg/m³" },
                  { color: "#ff0000", label: "Muy mala", range: "79 – 130 μg/m³" },
                  { color: "#8f3f97", label: "Extremadamente mala", range: "> 130 μg/m³" },
                ].map(({ color, label, range }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs text-gray-700">{label}</span>
                    <span className="ml-auto text-xs text-gray-400">{range}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
