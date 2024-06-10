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
  if (pm25 === null || pm25 < 5) return "#808080"; // gray
  if (pm25 <= 15) return "#00FF00"; // green
  if (pm25 > 15 && pm25 <= 25) return "#FFFF00"; // yellow
  if (pm25 > 25 && pm25 <= 79) return "#FFA500"; // orange
  if (pm25 > 79 && pm25 <= 130) return "#FF0000"; // red
  if (pm25 > 130) return "#800080"; // purple
  return "#FFFFFF"; // default color (white)
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
      center: [-100.28292303668854, 25.67906067159077],
      zoom: 11,
    });

    map.current.on("load", () => {
      if (sensors && sensors.length > 0) {
        sensors.forEach((sensor) => {
          // Find the latest data for the current sensor
          const latestData = data.find(
            (dataItem) => dataItem.sensor_id === sensor.sensor_id,
          );

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

          console.log("Popup created for:", sensor);

          // Get the border color based on pm25 value
          const borderColor = getBorderColor(
            latestData ? latestData.pm25 : null,
          );

          // Create a marker with the specific border color
          const marker = new Marker({
            color: borderColor, // Set the marker color
          })
            .setLngLat([sensor.lon, sensor.lat])
            .setPopup(popup) // Bind the popup to the marker
            .addTo(map.current!); // Use non-null assertion

          console.log("Marker added with popup for:", sensor);
        });
      }
    });
  }, [sensors, data]);

  // Function to render the legend
  const renderLegend = () => {
    return (
      <div className="absolute bottom-10 left-10 rounded-md bg-white p-4 shadow-lg">
        <h3 className="mb-2 font-bold">Calidad del Aire</h3>
        <div className="mb-1 flex items-center">
          <div className="mr-2 h-4 w-4 bg-gray-500"></div>
          <span>Dato no disponible</span>
        </div>
        <div className="mb-1 flex items-center">
          <div className="mr-2 h-4 w-4 bg-green-500"></div>
          <span>Buena</span>
        </div>
        <div className="mb-1 flex items-center">
          <div className="mr-2 h-4 w-4 bg-yellow-500"></div>
          <span>Aceptable</span>
        </div>
        <div className="mb-1 flex items-center">
          <div className="mr-2 h-4 w-4 bg-orange-500"></div>
          <span>Mala</span>
        </div>
        <div className="mb-1 flex items-center">
          <div className="mr-2 h-4 w-4 bg-red-500"></div>
          <span>Muy mala</span>
        </div>
        <div className="flex items-center">
          <div className="mr-2 h-4 w-4 bg-purple-500"></div>
          <span>Extremadamente mala</span>
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
