"use client";

import { useEffect, useRef } from "react";
import mapboxgl, { Map, Marker, Popup } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

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
}

// Air Quality Data interface
interface Data {
  id: number;
  sensor_id: number;
  pm25: number;
  time_stamp: string;
}

// Function to get marker color based on pm25 value
const createMarker = (pm25: number | null): HTMLElement | null => {
  let markerColor = "bg-white"; // default color

  if (pm25 === null || pm25 === 0) {
    markerColor = "bg-gray-400"; // gray
  } else if (pm25 > 0 && pm25 <= 15) {
    markerColor = "bg-green-400"; // green
  } else if (pm25 > 15 && pm25 <= 25) {
    markerColor = "bg-yellow-400"; // yellow
  } else if (pm25 > 25 && pm25 <= 79) {
    markerColor = "bg-orange-400"; // orange
  } else if (pm25 > 79 && pm25 <= 130) {
    markerColor = "bg-red-400"; // red
  } else if (pm25 > 130) {
    markerColor = "bg-purple-400"; // purple
  }

  if (markerColor === "bg-gray-400") {
    return null; // Do not create marker if color is gray
  }

  const marker = document.createElement("div");
  marker.className = `marker ${markerColor} bg-opacity-75 w-12 h-12 rounded-full flex items-center justify-center`;
  return marker;
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

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    map.current = new Map({
      container: mapContainer.current!,
      style: "mapbox://styles/edgargutgzz/climactgb00cn01qw7amo9bbd",
      center: [-100.32098588977951, 25.676269873872855],
      zoom: 10,
    });

    map.current.on("load", () => {
      sensors.forEach((sensor) => {
        const latestData = data.find(
          (dataItem) => dataItem.sensor_id === sensor.sensor_id,
        );

        const markerElement = createMarker(latestData ? latestData.pm25 : null);

        if (!markerElement) return; // Skip if marker is not created

        const popupContent = `
        <h3><strong>${sensor.nombre}</strong></h3>
        ${
          latestData
            ? `<p>PM2.5: ${latestData.pm25}</p>`
            : "<p>No data available</p>"
        }
        <p>Lat: ${sensor.lat}</p>
        <p>Lon: ${sensor.lon}</p>
      `;
        const popup = new Popup({ offset: 25, closeButton: false }).setHTML(
          popupContent,
        );

        new Marker({
          element: markerElement, // Set the custom marker element
        })
          .setLngLat([sensor.lon, sensor.lat])
          .setPopup(popup) // Bind the popup to the marker
          .addTo(map.current!); // Use non-null assertion
      });
    });
  }, [sensors, data]);

  return (
    <div className="relative h-full">
      <div ref={mapContainer} className="absolute left-0 top-0 h-full w-full" />
    </div>
  );
}
