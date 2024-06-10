"use client";

import { useEffect, useRef } from "react";
import mapboxgl, { Map, Marker, Popup } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

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

// Function to get border color based on pm25 value
const getBorderColor = (pm25: number | null): string => {
  if (pm25 === null || pm25 < 5) return "bg-gray-400"; // gray
  if (pm25 <= 15) return "bg-green-400"; // green
  if (pm25 > 15 && pm25 <= 25) return "bg-yellow-400"; // yellow
  if (pm25 > 25 && pm25 <= 79) return "bg-orange-400"; // orange
  if (pm25 > 79 && pm25 <= 130) return "bg-red-400"; // red
  if (pm25 > 130) return "bg-purple-400"; // purple
  return "bg-white"; // default color (white)
};

// Function to create a custom marker element
const createCustomMarker = (colorClass: string): HTMLElement | null => {
  if (colorClass === "bg-gray-400" || colorClass === "bg-green-400") {
    return null; // Do not create marker if color is gray or green
  }
  const marker = document.createElement("div");
  marker.className = `marker ${colorClass} bg-opacity-75 w-12 h-12 rounded-full flex items-center justify-center`;
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
      zoom: 11,
    });

    map.current.on("load", () => {
      console.log("Map loaded"); // Log when the map is loaded

      if (sensors && sensors.length > 0) {
        sensors.forEach((sensor) => {
          // Find the latest data for the current sensor
          const latestData = data.find(
            (dataItem) => dataItem.sensor_id === sensor.sensor_id,
          );

          // Get the border color based on pm25 value
          const colorClass = getBorderColor(
            latestData ? latestData.pm25 : null,
          );

          // Create a custom marker with the specific border color
          const markerElement = createCustomMarker(colorClass);

          if (!markerElement) return; // Skip if marker is not created

          // Create a popup
          const popupContent = `
            <h3>${sensor.nombre}</h3>
            <p>ID: ${sensor.sensor_id}</p>
            <p>Lat: ${sensor.lat}</p>
            <p>Lon: ${sensor.lon}</p>
            ${
              latestData
                ? `<p>PM2.5: ${latestData.pm25}</p><p>Timestamp: ${latestData.time_stamp}</p>`
                : "<p>No data available</p>"
            }
          `;
          const popup = new Popup({ offset: 25 }).setHTML(popupContent);

          try {
            const marker = new Marker({
              element: markerElement, // Set the custom marker element
            })
              .setLngLat([sensor.lon, sensor.lat])
              .setPopup(popup) // Bind the popup to the marker
              .addTo(map.current!); // Use non-null assertion

            console.log("Marker added with popup for:", sensor);
          } catch (error) {
            console.error("Error adding marker:", error, sensor);
          }
        });
      } else {
        console.log("No sensors available");
      }
    });
  }, [sensors, data]);

  // Function to render the legend
  const renderLegend = () => {
    return (
      <div className="absolute bottom-10 left-10 rounded-lg bg-white bg-opacity-75 p-4 text-sm shadow-lg">
        <h3 className="mb-2 font-bold">Calidad del Aire</h3>
        <div className="flex space-x-4">
          <div className="flex items-center">
            <div className="mr-2 h-4 w-4 rounded-full bg-green-400"></div>
            <span>Buena</span>
          </div>
          <div className="flex items-center">
            <div className="mr-2 h-4 w-4 rounded-full bg-yellow-400"></div>
            <span>Aceptable</span>
          </div>
          <div className="flex items-center">
            <div className="mr-2 h-4 w-4 rounded-full bg-orange-400"></div>
            <span>Mala</span>
          </div>
          <div className="flex items-center">
            <div className="mr-2 h-4 w-4 rounded-full bg-red-400"></div>
            <span>Muy mala</span>
          </div>
          <div className="flex items-center">
            <div className="mr-2 h-4 w-4 rounded-full bg-purple-400"></div>
            <span>Extremadamente mala</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative h-full">
      <div ref={mapContainer} className="absolute left-0 top-0 h-full w-full" />
      {renderLegend()}
    </div>
  );
}
