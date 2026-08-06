"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, Info, X } from "lucide-react";
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
  const size = source === "sima" ? "w-12 h-12" : "w-10 h-10";
  const fontSize = source === "sima" ? "text-sm" : "text-xs";
  marker.className = `marker ${markerColor} bg-opacity-90 ${size} flex items-center justify-center rounded-full ${textColor} ${fontSize} font-bold`;
  marker.style.boxShadow = source === "sima"
    ? "0 3px 10px rgba(0,0,0,0.3), 0 0 0 2px white, 0 0 0 4px #1f2937"
    : "0 2px 8px rgba(0,0,0,0.2), 0 0 0 2px rgba(255,255,255,0.6)";
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
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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

      const popup = new Popup({
        offset: 25,
        closeButton: false,
      }).setHTML(`
        <div class="p-3 rounded-xl bg-white max-w-[240px]">
          <div class="flex items-center bg-opacity-15 p-2.5 rounded-xl mb-2" style="background-color: ${popupBorderColor}15;">
            <div class="text-3xl font-bold mr-2.5 leading-none" style="color: ${popupTextColor};">
              ${latestData ? roundPM25(latestData.pm25) : "—"}
            </div>
            <div class="flex flex-col">
              <span class="text-base font-semibold text-gray-600">PM2.5</span>
              <span class="text-xs text-gray-500">μg/m³</span>
            </div>
          </div>

          <div class="bg-gray-100 p-2 rounded-xl mb-2">
            <div class="text-sm font-semibold text-gray-900 mb-0.5">
              ${isSima && sensor.nombre_display ? sensor.nombre_display : sensor.nombre}
            </div>
            <div class="text-xs text-gray-500">
              ${isSima ? "Estación SIMA" : "Sensor Purple Air"}
            </div>
          </div>
          ${latestData ? `<div class="text-xs text-gray-400 mb-1 px-1">Actualizado a las ${format(new Date(latestData.time_stamp), "h:00 a")}</div>` : ""}
          <div class="hidden text-xs text-gray-400 px-1">
            Lat: ${formatLatLon(sensor.lat)} | Lon: ${formatLatLon(sensor.lon)}
          </div>
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
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
          border-radius: 1rem !important;
          padding: 0;
        }
        .mapboxgl-popup-tip {
          border-top-color: white !important;
        }
      `;
      style.setAttribute("data-popup-shadow", "true");
      document.head.appendChild(style);
    }
  }, []);

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

      {/* Locate me button */}
      {userLocation && (
        <button
          onClick={flyToUser}
          className="absolute right-6 top-[5.5rem] z-10 rounded-xl border border-white/60 bg-white/80 p-3 backdrop-blur-md transition-colors duration-200 shadow-sm md:bottom-10 md:top-auto"
          aria-label="Ir a mi ubicación"
        >
          <LocateFixed className="h-6 w-6 text-gray-700" />
        </button>
      )}

      {/* Filter chips - always visible */}
      <div className="absolute left-4 top-6 z-10 flex flex-col gap-2 md:bottom-6 md:left-6 md:top-auto lg:bottom-6 lg:left-10">
        <button
          onClick={() => setShowSima((v) => !v)}
          className={`rounded-full border-2 px-4 py-2 backdrop-blur-md transition-all duration-200 ${
            showSima
              ? "border-gray-800 bg-white/90 text-gray-900 shadow-sm"
              : "border-white/20 bg-white/20 text-white/60"
          }`}
        >
          <span className="text-xs font-medium">Estación SIMA</span>
        </button>
        <button
          onClick={() => setShowPurpleAir((v) => !v)}
          className={`rounded-full border px-4 py-2 backdrop-blur-md transition-all duration-200 ${
            showPurpleAir
              ? "border-white/60 bg-white/80 text-gray-900 shadow-sm"
              : "border-white/20 bg-white/20 text-white/60"
          }`}
        >
          <span className="text-xs font-medium">Sensor Purple Air</span>
        </button>
      </div>

      {/* Legend Toggle Button - mobile only */}
      <button
        onClick={() => setIsLegendVisible(!isLegendVisible)}
        className="absolute right-6 top-6 z-10 rounded-xl border border-white/60 bg-white/80 p-3 backdrop-blur-md transition-colors duration-200 shadow-sm md:hidden"
        aria-label={isLegendVisible ? "Ocultar leyenda" : "Mostrar leyenda"}
      >
        <Info className="h-6 w-6 text-gray-700" />
      </button>

      {/* Legend - color scale only */}
      <div
        className={`absolute right-6 rounded-xl bg-white/80 backdrop-blur-md border border-white/60 p-4 shadow-sm transition-all duration-300 ease-in-out
          ${
            isLegendVisible
              ? "top-[9.5rem] translate-y-0 opacity-100"
              : "top-[9.5rem] translate-y-[-100%] opacity-0 md:translate-y-0 md:opacity-100"
          }
          md:bottom-6 md:left-[12rem] md:right-auto md:top-auto
          lg:bottom-6 lg:left-[13rem]`}
      >
        <div className="mb-2 text-sm font-semibold">Calidad del Aire</div>
        <div className="grid grid-cols-3 items-center gap-x-3 gap-y-3">
          <div className="col-span-1 flex items-center">
            <div className="mr-2 h-4 w-4 flex-shrink-0 rounded-full bg-[#00e400]"></div>
            <span className="text-xs">Buena</span>
          </div>
          <div className="col-span-1 flex items-center">
            <div className="mr-2 h-4 w-4 flex-shrink-0 rounded-full bg-[#ffff00]"></div>
            <span className="text-xs">Aceptable</span>
          </div>
          <div className="col-span-1 flex items-center">
            <div className="mr-2 h-4 w-4 flex-shrink-0 rounded-full bg-[#ff7e00]"></div>
            <span className="text-xs">Mala</span>
          </div>
          <div className="col-span-1 flex items-center">
            <div className="mr-2 h-4 w-4 flex-shrink-0 rounded-full bg-[#ff0000]"></div>
            <span className="text-xs">Muy mala</span>
          </div>
          <div className="col-span-2 flex items-center">
            <div className="mr-2 h-4 w-4 flex-shrink-0 rounded-full bg-[#8f3f97]"></div>
            <span className="text-xs">Extremadamente mala</span>
          </div>
        </div>
      </div>

      {/* Air quality peek strip — mobile: full-width flush above navbar */}
      {userLocation && qualityInfo && (
        <>
          <button
            onClick={() => setIsSheetOpen(true)}
            className={`fixed left-0 right-0 z-[45] rounded-t-2xl bg-white px-5 pb-3 pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-opacity duration-300 md:hidden ${
              isSheetOpen ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
            style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-gray-200" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="h-3 w-3 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: qualityInfo.color }}
                />
                <div>
                  <span className="text-sm font-semibold text-gray-900">{qualityInfo.label}</span>
                  {nearestPm25 !== null && (
                    <span className="ml-2 text-xs text-gray-400">{Math.round(nearestPm25)} μg/m³</span>
                  )}
                </div>
              </div>
            </div>
          </button>

          {/* Desktop: compact card bottom-right */}
          <button
            onClick={() => setIsSheetOpen(true)}
            className={`fixed bottom-24 right-6 z-[45] hidden w-72 items-center justify-between rounded-2xl border border-white/60 bg-white/90 px-4 py-3 shadow-md backdrop-blur-md transition-opacity duration-300 md:flex ${
              isSheetOpen ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-3 w-3 flex-shrink-0 rounded-full"
                style={{ backgroundColor: qualityInfo.color }}
              />
              <div className="text-left">
                <div className="text-sm font-semibold text-gray-900">{qualityInfo.label}</div>
                <div className="text-xs text-gray-400">
                  {nearestPm25 !== null ? `${Math.round(nearestPm25)} μg/m³ · ` : ""}cerca de ti
                </div>
              </div>
            </div>
          </button>
        </>
      )}

      {/* Bottom sheet backdrop */}
      <div
        className={`fixed inset-0 z-[55] bg-black/30 transition-opacity duration-300 ${
          isSheetOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsSheetOpen(false)}
      />

      {/* Bottom sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[60] max-h-[75vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 ease-out ${
          isSheetOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {qualityInfo && (
          <div className="px-5 pb-10 pt-4">
            {/* Handle */}
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-gray-200" />

            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Calidad del aire cerca de ti
              </span>
              <button onClick={() => setIsSheetOpen(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Quality label + PM2.5 */}
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

            {/* General recommendation */}
            <p className="mb-5 text-sm text-gray-600">{qualityInfo.generalRec}</p>

            {/* Divider */}
            <div className="mb-4 h-px bg-gray-100" />

            {/* Sensitive groups */}
            <div className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
              Para grupos sensibles
            </div>
            <div className="flex flex-col gap-4">
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
          </div>
        )}
      </div>
    </div>
  );
}
