"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { LocateFixed, GaugeCircle, X, Landmark, Users, Copy, Baby, PersonStanding, Heart, HeartPulse, MapPin, ChevronDown, Clock } from "lucide-react";
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
    ? "0 2px 8px rgba(0,0,0,0.2), 0 0 0 2.5px white, 0 0 0 4.5px #1f2937"
    : "0 2px 8px rgba(0,0,0,0.25), 0 0 0 2.5px white";
  el.style.color = textColor;
  el.style.fontSize = "12px";
  el.style.fontWeight = "700";

  if (pm25 !== null && pm25 > 0.4) {
    el.textContent = Math.round(pm25).toString();
  }

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
  const [isLegendVisible, setIsLegendVisible] = useState(false);
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
  const [sheetState, setSheetState] = useState<'peek' | 'mid'>('peek');
  const [isDesktopCardExpanded, setIsDesktopCardExpanded] = useState(false);
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

  // Highlight selected marker via box-shadow (avoids touching Mapbox's transform)
  useEffect(() => {
    markerElementsRef.current.forEach(({ el, source }) => {
      el.style.boxShadow = source === "sima"
        ? "0 2px 8px rgba(0,0,0,0.2), 0 0 0 2.5px white, 0 0 0 4.5px #1f2937"
        : "0 2px 8px rgba(0,0,0,0.25), 0 0 0 2.5px white";
    });
    if (selectedSensor) {
      const entry = markerElementsRef.current.get(selectedSensor.sensor.sensor_id);
      if (entry) {
        entry.el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.35), 0 0 0 2.5px white, 0 0 0 5px rgba(0,0,0,0.85)";
      }
    }
  }, [selectedSensor]);

  // Close selected sensor on map click
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    const handler = () => setSelectedSensor(null);
    map.current.on("click", handler);
    return () => { (map.current as any)?.off("click", handler); };
  }, [mapLoaded]);

  const sheetTransform = sheetState === 'mid' ? 'translateY(0)' : 'translateY(calc(100% - 4.5rem))';

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



      {/* Locate me button — mobile only, hidden when sheet is expanded */}
      {sheetState === 'peek' && (
        <button
          onClick={userLocation ? flyToUser : requestLocation}
          className="fixed right-6 z-[45] rounded-xl border border-white/60 bg-white/80 p-3 backdrop-blur-md transition-colors duration-200 shadow-sm md:hidden"
          style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 6rem)' }}
          aria-label="Mi ubicación"
        >
          <LocateFixed className={`h-6 w-6 ${userLocation ? 'text-gray-700' : 'text-gray-400'}`} />
        </button>
      )}

      {/* Mobile filter pills — full width 50/50 */}
      <div className="fixed left-0 right-0 z-[44] flex flex-row gap-2 px-4 md:hidden" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}>
        <button
          onClick={() => setShowSima((v) => !v)}
          className={`flex-1 rounded-full px-4 py-2 backdrop-blur-md transition-all duration-200 ${
            showSima ? "border-2 border-gray-900 bg-white/80 text-gray-900 shadow-sm" : "border border-white/20 bg-white/20 text-white/60"
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

      {/* Desktop left column — filter pills */}
      <div className="absolute left-6 top-[5rem] z-10 hidden gap-2 md:flex">
        <button
          onClick={() => setShowSima((v) => !v)}
          className={`flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium backdrop-blur-md shadow-sm transition-all duration-200 ${
            showSima ? "border-2 border-gray-900 bg-white/90 text-gray-900" : "border border-white/60 bg-white/60 text-gray-500 hover:bg-white/80"
          }`}
        >
          <Landmark className="h-3.5 w-3.5" />
          Estación SIMA
        </button>
        <button
          onClick={() => setShowPurpleAir((v) => !v)}
          className={`flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium backdrop-blur-md shadow-sm transition-all duration-200 ${
            showPurpleAir ? "border border-white/60 bg-white/90 text-gray-900" : "border border-white/60 bg-white/60 text-gray-500 hover:bg-white/80"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Sensor Ciudadano
        </button>
      </div>

      {/* Desktop bottom-right buttons — legend + locate */}
      <div className="absolute bottom-8 right-6 z-10 hidden flex-col items-end gap-2 md:flex">
        <button
          onClick={() => setIsDesktopLegendExpanded((v) => !v)}
          className="flex items-center justify-center rounded-xl border border-white/60 bg-white/80 p-3 shadow-sm backdrop-blur-md transition-colors hover:bg-white/90"
          aria-label="Leyenda"
        >
          <GaugeCircle className="h-5 w-5 text-gray-700" />
        </button>
        <button
          onClick={userLocation ? flyToUser : requestLocation}
          className="flex items-center justify-center rounded-xl border border-white/60 bg-white/80 p-3 shadow-sm backdrop-blur-md transition-colors hover:bg-white/90"
          aria-label="Mi ubicación"
        >
          <LocateFixed className={`h-5 w-5 ${userLocation ? 'text-gray-700' : 'text-gray-400'}`} />
        </button>
      </div>

      {/* Desktop legend panel — above bottom-right buttons */}
      {isDesktopLegendExpanded && (
        <div className="absolute bottom-24 right-6 z-10 hidden w-[240px] overflow-hidden rounded-2xl border border-white/60 bg-white shadow-sm backdrop-blur-md md:block">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <span className="text-xs font-medium text-gray-400">Calidad del aire · PM2.5</span>
            <button onClick={() => setIsDesktopLegendExpanded(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-3">
            <LegendContent />
          </div>
        </div>
      )}

      {/* Legend toggle button — mobile only, hidden when sheet is expanded */}
      {sheetState === 'peek' && <button
        onClick={() => setIsLegendVisible(!isLegendVisible)}
        className="fixed right-6 z-[45] rounded-xl border border-white/60 bg-white/80 p-3 backdrop-blur-md shadow-sm transition-colors duration-200 md:hidden"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 9.75rem)' }}
        aria-label={isLegendVisible ? "Ocultar leyenda" : "Mostrar leyenda"}
      >
        <GaugeCircle className="h-6 w-6 text-gray-700" />
      </button>}

      {/* Legend backdrop — mobile only */}
      <div
        className={`fixed inset-0 z-[46] bg-black/20 transition-opacity duration-300 md:hidden ${
          isLegendVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsLegendVisible(false)}
      />

      {/* Legend panel — mobile: slides up from bottom */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[47] rounded-t-3xl bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)] md:hidden"
        style={{
          transform: isLegendVisible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div
          className="flex-shrink-0 cursor-grab select-none px-5 pb-4 pt-3"
          onClick={() => setIsLegendVisible(false)}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200" />
          <p className="text-xs font-medium text-gray-400">Calidad del aire · PM2.5</p>
        </div>
        <div
          className="overflow-y-auto px-5 pt-2"
          style={{
            paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 2rem)',
          }}
        >
          <LegendContent />
        </div>
      </div>

      {/* Mobile: sensor info panel — slides up from bottom */}
      <div
        className="fixed left-0 right-0 z-[48] flex flex-col rounded-t-3xl bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)] md:hidden"
        style={{
          bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))',
          height: '62dvh',
          transform: selectedSensor ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
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
                className="flex-shrink-0 cursor-grab select-none px-5 pb-4 pt-3"
                onClick={() => setSelectedSensor(null)}
              >
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200" />
              </div>
              <div
                className="flex-1 overflow-y-auto px-5 pb-8"
              >
              <div className="mb-5 flex items-center gap-2">
                <div className="text-3xl font-bold leading-tight" style={{ color: textColor }}>
                  {sensorQuality ? sensorQuality.label : "—"}
                </div>
                {pm25 !== null && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                    {roundPM25(pm25)} μg/m³ · PM2.5
                  </span>
                )}
              </div>
              <div className="mb-4 flex items-center gap-2">
                <div className="text-sm font-semibold text-gray-900">{sensorName}</div>
                <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                  {isSima ? <Landmark className="h-2.5 w-2.5" /> : <Users className="h-2.5 w-2.5" />}
                  {isSima ? "Estación SIMA" : "Sensor Ciudadano"}
                </span>
              </div>
              {sensorQuality && (
                <>
                  <div className="mb-5 rounded-xl px-4 py-3" style={{ backgroundColor: `${color}12` }}>
                    <p className="text-sm leading-relaxed text-gray-600">{sensorQuality.generalRec}</p>
                  </div>
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">Grupos sensibles</p>
                  <div className="mb-4 flex flex-col gap-3">
                    {[
                      { label: "Niños menores de 12", rec: sensorQuality.sensitiveRecs.menores, Icon: Baby },
                      { label: "Adultos mayores", rec: sensorQuality.sensitiveRecs.adultos, Icon: PersonStanding },
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
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${sensor.lat.toFixed(5)}, ${sensor.lon.toFixed(5)}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-gray-600 transition-colors hover:bg-gray-200"
              >
                <Copy className="h-4 w-4" />
                <span className="text-sm font-medium">{copied ? "Copiado" : "Copiar coordenadas"}</span>
              </button>
              {timestamp && (
                <div className="mt-4 flex items-center justify-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-gray-300" />
                  <span className="text-xs text-gray-300">Actualizado a las {timestamp}</span>
                </div>
              )}
            </div>
            </>
          );
        })()}
      </div>

      {/* Desktop: right column — sensor detail + recommendation */}
      <div className="fixed right-6 top-[5rem] z-[48] hidden w-[300px] flex-col gap-2 md:flex">

        {/* Sensor detail card */}
        {selectedSensor && (() => {
          const { sensor, pm25, color, textColor, timestamp } = selectedSensor;
          const isSima = sensor.source === "sima";
          const sensorName = isSima && sensor.nombre_display ? sensor.nombre_display : sensor.nombre;
          const sensorQuality = getQualityInfo(pm25);
          return (
            <div className="overflow-hidden rounded-2xl border border-white/60 bg-white shadow-sm">
              <div className="overflow-y-auto px-4 pb-4 pt-4" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{sensorName}</p>
                    <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                      {isSima ? <Landmark className="h-2.5 w-2.5" /> : <Users className="h-2.5 w-2.5" />}
                      {isSima ? "Estación SIMA" : "Sensor Ciudadano"}
                    </span>
                  </div>
                  <button onClick={() => setSelectedSensor(null)} className="rounded-full p-1 text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="text-lg font-bold leading-tight" style={{ color: textColor }}>
                    {sensorQuality ? sensorQuality.label : "—"}
                  </div>
                  {pm25 !== null && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                      {roundPM25(pm25)} μg/m³ · PM2.5
                    </span>
                  )}
                </div>
                {sensorQuality && (
                  <>
                    <div className="mb-4 rounded-xl px-3 py-2.5" style={{ backgroundColor: `${color}12` }}>
                      <p className="text-xs leading-relaxed text-gray-600">{sensorQuality.generalRec}</p>
                    </div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Grupos sensibles</p>
                    <div className="mb-3 flex flex-col gap-2">
                      {[
                        { label: "Niños menores de 12", rec: sensorQuality.sensitiveRecs.menores, Icon: Baby },
                        { label: "Adultos mayores", rec: sensorQuality.sensitiveRecs.adultos, Icon: PersonStanding },
                        { label: "Mujeres embarazadas", rec: sensorQuality.sensitiveRecs.embarazadas, Icon: Heart },
                        { label: "Condiciones cardiovasculares o respiratorias", rec: sensorQuality.sensitiveRecs.enfermedades, Icon: HeartPulse },
                      ].map(({ label, rec, Icon }) => (
                        <div key={label} className="rounded-lg bg-gray-50 px-3 py-2.5">
                          <div className="mb-1 flex items-center gap-1.5">
                            <Icon className="h-3 w-3 flex-shrink-0 text-gray-400" />
                            <p className="text-sm font-semibold text-gray-700">{label}</p>
                          </div>
                          <p className="pl-[1.125rem] text-sm leading-relaxed text-gray-500">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${sensor.lat.toFixed(5)}, ${sensor.lon.toFixed(5)}`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-gray-600 transition-colors hover:bg-gray-200"
                >
                  <Copy className="h-4 w-4" />
                  <span className="text-sm font-medium">{copied ? "Copiado" : "Copiar coordenadas"}</span>
                </button>
                {timestamp && (
                  <div className="mt-4 flex items-center justify-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-gray-300" />
                    <span className="text-xs text-gray-300">Actualizado a las {timestamp}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Recommendation card — collapsible */}
        {qualityInfo && (
          <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/40 shadow-sm backdrop-blur-md">
            <button
              onClick={() => setIsDesktopCardExpanded((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <p className="text-xs font-medium text-gray-400">Calidad del aire</p>
              <ChevronDown
                className="h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-300"
                style={{ transform: isDesktopCardExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>
            {isDesktopCardExpanded && (
              <div className="overflow-y-auto border-t border-gray-100 bg-white px-4 pb-4 pt-3" style={{ maxHeight: 'calc(100vh - 10rem)' }}>
                {userLocation && nearestName ? (
                  <div className="mb-3 flex items-center gap-2">
                    <div className="text-sm font-semibold text-gray-900">{nearestName}</div>
                    <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                      {nearestIsSima ? <Landmark className="h-2.5 w-2.5" /> : <Users className="h-2.5 w-2.5" />}
                      {nearestIsSima ? "Estación SIMA" : "Sensor Ciudadano"}
                    </span>
                  </div>
                ) : !userLocation && (
                  <div className="mb-3 flex items-center gap-2">
                    <p className="text-xs text-gray-400">Promedio de los sensores en la zona</p>
                    <button
                      onClick={requestLocation}
                      className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                    >
                      <LocateFixed className="h-3 w-3" />
                      Mi ubicación
                    </button>
                  </div>
                )}
                <div className="mb-4 flex items-center gap-2">
                  <div className="text-lg font-bold leading-tight" style={{ color: qualityInfo.textColor }}>
                    {qualityInfo.label}
                  </div>
                  {displayPm25 !== null && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                      {roundPM25(displayPm25)} μg/m³ · PM2.5
                    </span>
                  )}
                </div>
                <div className="mb-4 rounded-xl px-3 py-2.5" style={{ backgroundColor: `${qualityInfo.color}12` }}>
                  <p className="text-xs leading-relaxed text-gray-600">{qualityInfo.generalRec}</p>
                </div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Grupos sensibles</p>
                <div className="mb-3 flex flex-col gap-2">
                  {[
                    { label: "Niños menores de 12", rec: qualityInfo.sensitiveRecs.menores, Icon: Baby },
                    { label: "Adultos mayores", rec: qualityInfo.sensitiveRecs.adultos, Icon: PersonStanding },
                    { label: "Mujeres embarazadas", rec: qualityInfo.sensitiveRecs.embarazadas, Icon: Heart },
                    { label: "Condiciones cardiovasculares o respiratorias", rec: qualityInfo.sensitiveRecs.enfermedades, Icon: HeartPulse },
                  ].map(({ label, rec, Icon }) => (
                    <div key={label} className="rounded-lg bg-gray-50 px-3 py-2.5">
                      <div className="mb-1 flex items-center gap-1.5">
                        <Icon className="h-3 w-3 flex-shrink-0 text-gray-400" />
                        <p className="text-sm font-semibold text-gray-700">{label}</p>
                      </div>
                      <p className="pl-[1.125rem] text-sm leading-relaxed text-gray-500">{rec}</p>
                    </div>
                  ))}
                </div>
                {nearestLat !== null && nearestLon !== null && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${nearestLat.toFixed(5)}, ${nearestLon.toFixed(5)}`);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-gray-600 transition-colors hover:bg-gray-200"
                  >
                    <Copy className="h-4 w-4" />
                    <span className="text-sm font-medium">{copied ? "Copiado" : "Copiar coordenadas"}</span>
                  </button>
                )}
                {nearestTimestamp && (
                  <div className="mt-4 flex items-center justify-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-gray-300" />
                    <span className="text-xs text-gray-300">Actualizado a las {nearestTimestamp}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
                <LocateFixed className="h-6 w-6 text-gray-400" />
              </div>
            </div>
            <p className="mb-1.5 text-center text-base font-semibold text-gray-900">Activa tu ubicación</p>
            <p className="text-center text-sm leading-relaxed text-gray-500">
              Para ver la calidad del aire más cercana a ti, activa el acceso a tu ubicación en los ajustes de tu navegador.
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
        className="fixed left-0 right-0 z-[40] rounded-t-3xl bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex flex-col md:hidden"
        style={{
          bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))',
          height: '62dvh',
          transform: sheetTransform,
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Drag handle + peek summary */}
        <div
          className="flex-shrink-0 cursor-pointer select-none px-5 pt-3 pb-4"
          onClick={handleSheetTap}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200" />
          <div className="flex items-center justify-between">
            {sheetState === 'peek' && <span className="text-sm font-medium text-gray-400">Calidad del aire</span>}
            {sheetState === 'peek' && (qualityInfo ? (
              <span className="text-lg font-bold" style={{ color: qualityInfo.textColor }}>
                {qualityInfo.label}
              </span>
            ) : (
              <span className="text-sm text-gray-300">—</span>
            ))}
          </div>
        </div>

        {/* Scrollable content — visible when expanded to mid */}
        <div
          className="flex-1 overflow-y-auto px-5 pb-8"
        >
          {qualityInfo && (
            <>
              <div className="mb-5 flex items-center gap-2">
                <div className="text-3xl font-bold leading-tight" style={{ color: qualityInfo.textColor }}>
                  {qualityInfo.label}
                </div>
                {displayPm25 !== null && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                    {roundPM25(displayPm25)} μg/m³ · PM2.5
                  </span>
                )}
              </div>
              {userLocation && nearestName ? (
                <div className="mb-4 flex items-center gap-2">
                  <div className="text-sm font-semibold text-gray-900">{nearestName}</div>
                  <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                    {nearestIsSima ? <Landmark className="h-2.5 w-2.5" /> : <Users className="h-2.5 w-2.5" />}
                    {nearestIsSima ? "Estación SIMA" : "Sensor Ciudadano"}
                  </span>
                </div>
              ) : !userLocation && (
                <div className="mb-4 flex items-center gap-2">
                  <p className="text-xs text-gray-400">Promedio de los sensores en la zona</p>
                  <button
                    onClick={requestLocation}
                    className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                  >
                    <LocateFixed className="h-3 w-3" />
                    Mi ubicación
                  </button>
                </div>
              )}

              {/* General recommendation */}
              <div className="mb-5 rounded-xl px-4 py-3" style={{ backgroundColor: `${qualityInfo.color}12` }}>
                <p className="text-sm leading-relaxed text-gray-600">{qualityInfo.generalRec}</p>
              </div>

              {/* Sensitive groups */}
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">Grupos sensibles</p>
              <div className="mb-4 flex flex-col gap-3">
                {[
                  { label: "Niños menores de 12", rec: qualityInfo.sensitiveRecs.menores, Icon: Baby },
                  { label: "Adultos mayores", rec: qualityInfo.sensitiveRecs.adultos, Icon: PersonStanding },
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
              {nearestLat !== null && nearestLon !== null && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${nearestLat.toFixed(5)}, ${nearestLon.toFixed(5)}`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-gray-600 transition-colors hover:bg-gray-200"
                >
                  <Copy className="h-4 w-4" />
                  <span className="text-sm font-medium">{copied ? "Copiado" : "Copiar coordenadas"}</span>
                </button>
              )}
              {nearestTimestamp && (
                <div className="mt-4 flex items-center justify-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-gray-300" />
                  <span className="text-xs text-gray-300">Actualizado a las {nearestTimestamp}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
