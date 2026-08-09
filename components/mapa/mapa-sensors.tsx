"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed, Info, X, Landmark, Users, Copy } from "lucide-react";
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
    : "0 2px 8px rgba(0,0,0,0.25)";
  marker.setAttribute("data-marker-color", markerColor);

  if (pm25 !== null && pm25 >= 0) {
    marker.textContent = roundPM25(pm25);
  }

  return marker;
};

const roundPM25 = (value: number | null): string | null => {
  return value !== null ? Math.round(value).toString() : null;
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
  const markerElementsRef = useRef(new globalThis.Map<number, HTMLElement>());

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

      const markerColorClass = markerElement.getAttribute("data-marker-color");
      const color = markerColorClass ? borderColorMap[markerColorClass] : "#FFFFFF";
      const textColor = color === "#ffff00" ? "#b8a000" : color;
      const timestamp = latestData
        ? format(new Date(latestData.time_stamp), "h") + ":00 " + format(new Date(latestData.time_stamp), "a")
        : null;

      markerElement.style.cursor = "pointer";
      markerElement.style.transition = "transform 0.15s ease";
      markerElement.style.transformOrigin = "center";
      markerElement.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedSensor({ sensor, pm25: latestData?.pm25 ?? null, color, textColor, timestamp });
      });

      markerElementsRef.current.set(sensor.sensor_id, markerElement);

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

  // Highlight selected marker
  useEffect(() => {
    markerElementsRef.current.forEach((el) => {
      el.style.transform = 'scale(1)';
      el.style.zIndex = '';
    });
    if (selectedSensor) {
      const el = markerElementsRef.current.get(selectedSensor.sensor.sensor_id);
      if (el) {
        el.style.transform = 'scale(1.35)';
        el.style.zIndex = '10';
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
      <div className="fixed left-0 right-0 z-[44] flex flex-row gap-2 px-4 md:hidden" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}>
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

      {/* Legend toggle button — mobile only */}
      <button
        onClick={() => setIsLegendVisible(!isLegendVisible)}
        className="fixed right-6 z-[45] rounded-xl border border-white/60 bg-white/80 p-3 backdrop-blur-md shadow-sm transition-colors duration-200 md:hidden"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 5.75rem)' }}
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

      {/* Mobile: sensor info panel — slides up from bottom */}
      <div
        className={`fixed left-0 right-0 bottom-0 z-[48] rounded-t-3xl bg-white/90 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden ${
          selectedSensor ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {selectedSensor && (() => {
          const { sensor, pm25, color, textColor, timestamp } = selectedSensor;
          const isSima = sensor.source === "sima";
          const sensorName = isSima && sensor.nombre_display ? sensor.nombre_display : sensor.nombre;
          const sensorQuality = getQualityInfo(pm25);
          return (
            <div className="px-5 pt-5" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{sensorName}</div>
                  {timestamp && (
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
                      {isSima ? <Landmark className="h-3 w-3 flex-shrink-0" /> : <Users className="h-3 w-3 flex-shrink-0" />}
                      <span>{isSima ? "Estación SIMA" : "Sensor Ciudadano"}</span>
                      <span>·</span>
                      <span>Actualizado a las {timestamp}</span>
                    </div>
                  )}
                </div>
                <button onClick={() => setSelectedSensor(null)} className="rounded-full p-1 text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mb-4 flex items-end gap-3">
                <div className="text-4xl font-bold leading-none" style={{ color: textColor }}>
                  {sensorQuality ? sensorQuality.label : "—"}
                </div>
                {pm25 !== null && (
                  <div className="mb-0.5 text-sm text-gray-400">{roundPM25(pm25)} μg/m³</div>
                )}
              </div>
              {sensorQuality && (
                <div className="mb-3 rounded-xl px-4 py-3" style={{ backgroundColor: `${color}12` }}>
                  <p className="text-sm leading-relaxed text-gray-600">{sensorQuality.generalRec}</p>
                </div>
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
            </div>
          );
        })()}
      </div>

      {/* Desktop: sensor info card */}
      {selectedSensor && (() => {
        const { sensor, pm25, color, textColor, timestamp } = selectedSensor;
        const isSima = sensor.source === "sima";
        const sensorName = isSima && sensor.nombre_display ? sensor.nombre_display : sensor.nombre;
        const sensorQuality = getQualityInfo(pm25);
        return (
          <div className="fixed right-6 top-[5rem] z-[48] hidden w-[300px] md:block">
            <div className="flex flex-col gap-2 rounded-2xl border border-white/60 bg-white/40 p-2 shadow-sm backdrop-blur-md">
              <div className="rounded-xl bg-white p-4">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{sensorName}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
                      {isSima ? <Landmark className="h-3 w-3 flex-shrink-0" /> : <Users className="h-3 w-3 flex-shrink-0" />}
                      <span>{isSima ? "Estación SIMA" : "Sensor Ciudadano"}</span>
                    </div>
                    {timestamp && (
                      <div className="mt-0.5 text-xs text-gray-400">Actualizado a las {timestamp}</div>
                    )}
                  </div>
                  <button onClick={() => setSelectedSensor(null)} className="rounded-full p-1 text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="mb-4 flex items-end gap-3">
                  <div className="text-3xl font-bold leading-none" style={{ color: textColor }}>
                    {sensorQuality ? sensorQuality.label : "—"}
                  </div>
                  {pm25 !== null && (
                    <div className="mb-0.5 text-sm text-gray-400">{roundPM25(pm25)} μg/m³</div>
                  )}
                </div>
                {sensorQuality && (
                  <div className="mb-3 rounded-xl px-4 py-3" style={{ backgroundColor: `${color}12` }}>
                    <p className="text-sm leading-relaxed text-gray-600">{sensorQuality.generalRec}</p>
                  </div>
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
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
