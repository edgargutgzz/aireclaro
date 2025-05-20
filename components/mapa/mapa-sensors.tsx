"use client";

import { useEffect, useRef, useState } from "react";
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
  marker.className = `marker ${markerColor} bg-opacity-85 w-9 h-9 flex items-center justify-center rounded-full ${
    source === "sima" ? "border-2 border-black" : ""
  } ${textColor} text-xs font-bold`;
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

  // State to hold the latest update time
  const [latestUpdateTime, setLatestUpdateTime] = useState<string>("");

  // Add this new state
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  const [isLegendVisible, setIsLegendVisible] = useState(false); // Add this state

  useEffect(() => {
    if (map.current) return;

    // Initialize map
    map.current = new Map({
      container: mapContainer.current!,
      style: "mapbox://styles/edgargutgzz/climactgb00cn01qw7amo9bbd",
      center: [-100.32098588977951, 25.676269873872855],
      zoom: 10,
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

          // Add marker if map is already loaded
          if (map.current) {
            const userMarkerElement = document.createElement("div");
            userMarkerElement.className =
              "w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg";
            userMarkerElement.style.animation =
              "pulsate 1.5s ease-out infinite";
            userMarkerElement.style.cssText = `
              width: 16px;
              height: 16px;
              background: #3b82f6;
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 0 0 rgba(59, 130, 246, 0.4);
              animation: pulsate 2s ease-out infinite;
            `;

            // Add the keyframe animation
            const style = document.createElement("style");
            style.textContent = `
              @keyframes pulsate {
                0% {
                  box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
                }
                70% {
                  box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
                }
                100% {
                  box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
                }
              }
            `;
            document.head.appendChild(style);

            new Marker({
              element: userMarkerElement,
            })
              .setLngLat([location.longitude, location.latitude])
              .addTo(map.current);
          }
        },
        (error) => {
          console.error("Error getting user location:", error);
        },
      );
    }

    map.current.on("load", () => {
      // Add user location marker if we already have the location
      if (userLocation && map.current) {
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

        new Marker({
          element: userMarkerElement,
        })
          .setLngLat([userLocation.longitude, userLocation.latitude])
          .addTo(map.current);
      }

      sensors.forEach((sensor) => {
        const latestData = data.find(
          (dataItem) => dataItem.sensor_id === sensor.sensor_id,
        );

        const markerElement = createMarker(
          latestData ? latestData.pm25 : null,
          sensor.source,
        );

        if (!markerElement) return;

        const markerColorClass =
          markerElement.getAttribute("data-marker-color");
        const popupBorderColor = markerColorClass
          ? borderColorMap[markerColorClass] // Use 300 variant for border
          : "#FFFFFF";

        const popup = new Popup({
          offset: 25,
          closeButton: false,
        }).setHTML(`
          <div style="padding: 15px; border-radius: 16px; background-color: white;">
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
              <div style="font-size: 42px; font-weight: bold; color: ${popupBorderColor}; line-height: 1;">
                ${latestData ? roundPM25(latestData.pm25) : "—"}
              </div>
              <div style="font-size: 14px; margin-left: 8px; color: #6b7280; font-weight: 500;">
                PM2.5
              </div>
            </div>
            
            <div style="font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 8px; line-height: 1.3;">
              ${sensor.nombre}
            </div>
            
            <div style="display: flex; align-items: center;">
              <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${popupBorderColor}; margin-right: 6px;"></div>
              <div style="font-size: 12px; color: #6b7280;">
                ${sensor.source === "sima" ? "Estación SIMA" : "Sensor Purple Air"}
              </div>
            </div>
            
            <div class="hidden md:block" style="font-size: 11px; color: #6b7280; margin-top: 8px;">
              ${formatLatLon(sensor.lat)}, ${formatLatLon(sensor.lon)}
            </div>
          </div>
        `);

        // Add custom CSS for the popup shadow
        const style = document.createElement("style");
        if (!document.querySelector("style[data-popup-shadow]")) {
          style.textContent = `
            .mapboxgl-popup-content {
              box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
              border-radius: 16px;
            }
          `;
          style.setAttribute("data-popup-shadow", "true");
          document.head.appendChild(style);
        }

        new Marker({
          element: markerElement,
        })
          .setLngLat([sensor.lon, sensor.lat])
          .setPopup(popup)
          .addTo(map.current!);
      });

      const firstDataTimestamp = data[0].time_stamp;
      const currentDate = new Date();
      const minutes = currentDate.getMinutes();

      console.log("Real current time:", currentDate, "Minutes:", minutes); // Debug log

      // If we're less than 15 minutes into the hour, show previous hour
      if (minutes < 15) {
        currentDate.setHours(currentDate.getHours() - 1);
      }

      const formattedTime = format(currentDate, "h:mm a").replace(
        /:\d{2}/,
        ":00",
      );
      console.log("Formatted time:", formattedTime); // Debug log
      setLatestUpdateTime(formattedTime);
    });
  }, [sensors, data, userLocation]); // Add userLocation back to dependencies

  return (
    <div className="relative h-screen">
      {/* Map container */}
      <div
        ref={mapContainer}
        className="absolute left-0 top-0 h-full w-full md:h-screen"
      />

      {/* Legend Toggle Button */}
      <button
        onClick={() => setIsLegendVisible(!isLegendVisible)}
        className="absolute bottom-36 left-6 z-10 rounded-2xl bg-white p-3 shadow-lg transition-colors duration-200 hover:bg-gray-50 active:bg-gray-100 md:hidden"
        style={{ boxShadow: "0 6px 24px rgba(0, 0, 0, 0.18)" }}
        aria-label={isLegendVisible ? "Ocultar leyenda" : "Mostrar leyenda"}
      >
        {isLegendVisible ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        )}
      </button>

      {/* Legend */}
      <div
        className={`absolute left-6 rounded-xl bg-white py-3 pl-3 pr-0 shadow-lg transition-all duration-300 ease-in-out
          ${
            isLegendVisible
              ? "bottom-52 translate-y-0 opacity-100"
              : "bottom-52 translate-y-[100%] opacity-0 md:translate-y-0 md:opacity-100"
          }
          md:bottom-24 md:left-6 md:top-auto md:p-4 
          lg:bottom-12 lg:left-10`}
      >
        {/* Calidad del Aire - Title */}
        <div className="mb-2 flex flex-col font-semibold">
          <span className="text-sm">Calidad del Aire</span>
        </div>
        {/* Calidad del Aire - Legend */}
        <div className="grid grid-cols-3 items-center gap-x-3 gap-y-3">
          <div className="col-span-1 flex">
            <div className="mr-2 h-4 w-2 rounded-full bg-[#00e400]"></div>
            <span className="text-xs">Buena</span>
          </div>
          <div className="col-span-1 flex">
            <div className="mr-2 h-4 w-2 rounded-full bg-[#ffff00]"></div>
            <span className="text-xs">Aceptable</span>
          </div>
          <div className="col-span-1 flex">
            <div className="mr-2 h-4 w-2 rounded-full bg-[#ff7e00]"></div>
            <span className="text-xs">Mala</span>
          </div>
          <div className="col-span-1 flex">
            <div className="mr-2 h-4 w-2 rounded-full bg-[#ff0000]"></div>
            <span className="text-xs">Muy mala</span>
          </div>
          <div className="col-span-2 flex">
            <div className="mr-2 h-4 w-2 rounded-full bg-[#8f3f97]"></div>
            <span className="text-xs">Extremadamente mala</span>
          </div>
        </div>
        {/* Sensores - Title */}
        <div className="mb-2 mt-5 flex flex-col font-semibold">
          <span className="text-sm">Fuente de Medición</span>
        </div>
        {/* Sensores - Legend */}
        <div className="grid grid-cols-2 items-center gap-x-4">
          <div className="col-span-1 flex items-center">
            <span className="text-xs">Sensor Purple Air</span>
          </div>
          <div className="col-span-1 flex items-center pr-2">
            <span className="text-xs">Estación SIMA</span>
          </div>
        </div>
        {/* Hora de actualización */}
        <div className="pt-4 text-xs font-normal text-gray-400">
          Actualizado a las {latestUpdateTime}
        </div>
      </div>
    </div>
  );
}
