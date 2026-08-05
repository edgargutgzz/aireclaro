"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed, Info } from "lucide-react";
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

// Add this interface after your existing interfaces
interface UserLocation {
  latitude: number;
  longitude: number;
}

// Function to get marker color based on pm25 value
const createMarker = (
  pm25: number | null,
  source: string,
): HTMLElement | null => {
  let markerColor = "bg-gray-400"; // default color

  if (pm25 === null || pm25 < 0 || pm25 <= 0.4) {
    markerColor = "bg-gray-400"; // gray for null, negative, or low values (≤ 0.4)
  } else if (pm25 > 0.4 && pm25 <= 15) {
    markerColor = "bg-[#00e400]"; // green for (0.4, 15]
  } else if (pm25 > 15 && pm25 <= 25) {
    markerColor = "bg-[#ffff00]"; // yellow for (15, 25]
  } else if (pm25 > 25 && pm25 <= 79) {
    markerColor = "bg-[#ff7e00]"; // orange for (25, 79]
  } else if (pm25 > 79 && pm25 <= 130) {
    markerColor = "bg-[#ff0000]"; // red for (79, 130]
  } else if (pm25 > 130) {
    markerColor = "bg-[#8f3f97]"; // purple for > 130
  }

  if (markerColor === "bg-gray-400") {
    return null; // Do not create marker if color is gray
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

// Utility function to round the pm25 value to the nearest integer
const roundPM25 = (value: number | null): string | null => {
  return value !== null ? Math.round(value).toString() : null;
};

// Utility function to format latitude and longitude to five decimal places
const formatLatLon = (value: number): string => {
  return value.toFixed(5);
};


// Mapping between Tailwind color classes for popup borders (300 variants)
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
  // Reference to the map container
  const mapContainer = useRef<HTMLDivElement>(null);

  // Reference to the map instance
  const map = useRef<Map | null>(null);

  // Reference to track all markers
  const markersRef = useRef<Marker[]>([]);


  // Add this new state
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  const [isLegendVisible, setIsLegendVisible] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showPurpleAir, setShowPurpleAir] = useState(true);
  const [showSima, setShowSima] = useState(true);

  // Initialize map once
  useEffect(() => {
    if (map.current) return;

    map.current = new Map({
      container: mapContainer.current!,
      style: "mapbox://styles/edgargutgzz/climactgb00cn01qw7amo9bbd",
      center: [-100.32098588977951, 25.665],
      zoom: 10,
    });

    // Set map loaded state when ready
    map.current.on("load", () => {
      setMapLoaded(true);
    });

    // Request user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setUserLocation(location);
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

    // Add the keyframe animation if not already added
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

    // Always clear existing markers first
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
          <div class="hidden md:block text-xs text-gray-400 px-1">
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
        className={`absolute right-6 rounded-xl bg-white p-4 shadow-lg transition-all duration-300 ease-in-out
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
    </div>
  );
}
