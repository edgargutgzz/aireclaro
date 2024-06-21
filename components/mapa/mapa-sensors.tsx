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
  let markerColor = "bg-gray-400"; // default color

  if (pm25 === null || pm25 < 0) {
    markerColor = "bg-gray-400"; // gray
  } else if (pm25 >= 0 && pm25 <= 15) {
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
  // Reference to the map container
  const mapContainer = useRef<HTMLDivElement>(null);

  // Reference to the map instance
  const map = useRef<Map | null>(null);

  // State to hold the latest update time
  const [latestUpdateTime, setLatestUpdateTime] = useState<string>("");

  // useEffect hook to initialize the map and add markers
  useEffect(() => {
    // Check if the map is already initialized
    if (map.current) return; // Initialize map only once

    // Create a new Mapbox map instance
    map.current = new Map({
      container: mapContainer.current!, // Set the map container
      style: "mapbox://styles/edgargutgzz/climactgb00cn01qw7amo9bbd", // Set the map style
      center: [-100.32098588977951, 25.676269873872855], // Set the initial center coordinates
      zoom: 10, // Set the initial zoom level
    });

    // Event listener for when the map has loaded
    map.current.on("load", () => {
      // Iterate over each sensor
      sensors.forEach((sensor) => {
        // Find the latest data for the sensor
        const latestData = data.find(
          (dataItem) => dataItem.sensor_id === sensor.sensor_id,
        );

        // Create a marker element based on the PM2.5 value
        const markerElement = createMarker(latestData ? latestData.pm25 : null);

        // Skip if no marker is created
        if (!markerElement) return;

        // Create the popup content
        const popupContent = `
          <h3><strong>${sensor.nombre}</strong></h3>
          ${
            latestData
              ? `<p>PM2.5: <span class="text-gray-400">${latestData.pm25}</span></p>`
              : "<p>No data available</p>"
          }
          <p>Lat: <span class="text-gray-400">${sensor.lat}</span></p>
          <p>Lon: <span class="text-gray-400">${sensor.lon}</span></p>
        `;

        // Create a new popup instance
        const popup = new Popup({ offset: 25, closeButton: false }).setHTML(
          popupContent,
        );

        // Create a new marker instance
        new Marker({
          element: markerElement, // Set the custom marker element
        })
          .setLngLat([sensor.lon, sensor.lat]) // Set the marker coordinates
          .setPopup(popup) // Bind the popup to the marker
          .addTo(map.current!); // Add the marker to the map
      });

      // Get the timestamp from the first data element and format it
      const firstDataTimestamp = data[0].time_stamp;
      const formattedTime = format(
        new Date(firstDataTimestamp.replace(" ", "T")),
        "h:mm a",
      ).replace(/:\d{2}/, ":00");

      // Update the state with the formatted time
      setLatestUpdateTime(formattedTime);
    });
  }, [sensors, data]); // Dependencies: re-run if sensors or data change

  return (
    <div className="relative h-screen">
      {/* Map container */}
      <div
        ref={mapContainer}
        className="absolute left-0 top-0 h-full w-full md:h-screen"
      />
      {/* Legend */}
      <div className="absolute bottom-14 left-2 rounded-lg bg-white bg-opacity-75 py-2 pl-3 pr-0 text-xs shadow-lg md:left-10 md:pr-3 md:text-sm">
        <div className="mb-3 flex flex-col font-bold md:flex-row md:justify-between">
          <span className="text-sm">Calidad del Aire</span>
          <span className="text-xs font-normal text-gray-400 md:ml-4">
            Actualización a las {latestUpdateTime}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-x-3 gap-y-2 md:flex md:space-x-4">
          <div className="col-span-1 flex items-center">
            <div className="mr-2 h-4 w-2 rounded-full bg-green-400"></div>
            <span className="text-xs md:text-sm">Buena</span>
          </div>
          <div className="col-span-1 flex items-center">
            <div className="mr-2 h-4 w-2 rounded-full bg-yellow-400"></div>
            <span className="text-xs md:text-sm">Aceptable</span>
          </div>
          <div className="col-span-1 flex items-center">
            <div className="mr-2 h-4 w-2 rounded-full bg-orange-400"></div>
            <span className="text-xs md:text-sm">Mala</span>
          </div>
          <div className="col-span-1 flex items-center md:col-span-1">
            <div className="mr-2 h-4 w-2 rounded-full bg-red-400"></div>
            <span className="text-xs md:text-sm">Muy mala</span>
          </div>
          <div className="col-span-2 flex items-center md:col-span-1">
            <div className="mr-2 h-4 w-2 rounded-full bg-purple-400"></div>
            <span className="text-xs md:text-sm">Extremadamente mala</span>
          </div>
        </div>
      </div>
    </div>
  );
}
