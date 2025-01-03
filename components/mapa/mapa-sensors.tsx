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
  source: string;
}

// Air Quality Data interface
interface Data {
  id: number;
  sensor_id: number;
  pm25: number;
  time_stamp: string;
}

// Function to get marker color based on pm25 value
const createMarker = (
  pm25: number | null,
  source: string,
): HTMLElement | null => {
  let markerColor = "bg-gray-400"; // default color

  if (pm25 === null || pm25 < 0) {
    markerColor = "bg-gray-400"; // gray for null or negative values
  } else if (pm25 <= 0.4) {
    markerColor = "bg-gray-400"; // gray for values 0.4 or less
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
    markerColor === "bg-[#ffff00]" ? "text-black" : "text-white";
  marker.className = `marker ${markerColor} bg-opacity-85 w-8 h-8 flex items-center justify-center rounded-full ${
    source === "sima" ? "border border-black" : ""
  } ${textColor} text-xs font-bold`;
  marker.setAttribute("data-marker-color", markerColor); // Set data attribute for color

  // Add the PM2.5 value as text inside the marker
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

  useEffect(() => {
    if (map.current) return;

    map.current = new Map({
      container: mapContainer.current!,
      style: "mapbox://styles/edgargutgzz/climactgb00cn01qw7amo9bbd",
      center: [-100.32098588977951, 25.676269873872855],
      zoom: 11,
    });

    map.current.on("load", () => {
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

        const popup = new Popup({ offset: 25, closeButton: false }).setHTML(`
        <div style="padding: 10px; border-radius: 8px; background-color: white;">
          <div style="position: relative; padding-bottom: 8px; display: flex; align-items: baseline;">
            <div style="font-size: 42px; font-weight: bold; color: black;">
              ${latestData ? roundPM25(latestData.pm25) : "N/A"}
            </div>
            <span style="font-size: 12px; font-weight: normal; margin-left: 8px; color: black;">
              PM2.5
            </span>
            <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 3px; background-color: ${popupBorderColor}; border-radius: 3px;"></div>
          </div>
          <div style="margin-top: 8px; font-size: 12px; color: black;">
            <span style="font-weight: bold;">${sensor.source === "sima" ? "Estación: " : "Sensor: "}</span>${sensor.nombre}
          </div>
          <div style="font-size: 12px; color: black;">
            <span style="font-weight: bold;">Lat: </span>${formatLatLon(sensor.lat)}
          </div>
          <div style="font-size: 12px; color: black;">
            <span style="font-weight: bold;">Lon: </span>${formatLatLon(sensor.lon)}
          </div>
        </div>
      `);

        new Marker({
          element: markerElement,
        })
          .setLngLat([sensor.lon, sensor.lat])
          .setPopup(popup)
          .addTo(map.current!);
      });

      const firstDataTimestamp = data[0].time_stamp;
      const formattedTime = format(
        new Date(firstDataTimestamp.replace(" ", "T")),
        "h:mm a",
      ).replace(/:\d{2}/, ":00");

      setLatestUpdateTime(formattedTime);
    });
  }, [sensors, data]);

  return (
    <div className="relative h-screen">
      {/* Map container */}
      <div
        ref={mapContainer}
        className="absolute left-0 top-0 h-full w-full md:h-screen"
      />
      {/* Legend */}
      <div className="absolute bottom-14 left-2 rounded-lg bg-white bg-opacity-85 py-3 pl-3 pr-0 shadow-lg md:bottom-24 md:left-6 md:p-4 lg:bottom-12 lg:left-10">
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
        <div className="grid grid-cols-2 items-center space-x-2">
          <div className="col-span-1 flex items-center">
            <div className="mr-2 h-4 w-2 rounded-full bg-[#00e400]"></div>
            <span className="text-xs">Sensor de Purple Air</span>
          </div>
          <div className="col-span-1 flex items-center">
            <div className="mr-2 h-4 w-2 rounded-full border border-black bg-[#00e400]"></div>
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
