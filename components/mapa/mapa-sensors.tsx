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

// MapaSensors component
export default function MapaSensors({ sensors }: { sensors: Sensor[] }) {
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
          // Create a popup
          const popup = new Popup({ offset: 25 }).setHTML(`
            <h3>${sensor.nombre}</h3>
            <p>ID: ${sensor.sensor_id}</p>
            <p>Lat: ${sensor.lat}</p>
            <p>Lon: ${sensor.lon}</p>
          `);

          console.log("Popup created for:", sensor);

          // Create a marker and bind the popup to it
          const marker = new Marker()
            .setLngLat([sensor.lon, sensor.lat])
            .setPopup(popup) // Bind the popup to the marker
            .addTo(map.current!); // Use non-null assertion

          console.log("Marker added with popup for:", sensor);
        });
      }
    });
  }, [sensors]);

  return (
    <div
      ref={mapContainer}
      style={{
        width: "100%",
        height: "100vh", // Ensure the map container is tall enough
        position: "relative",
      }}
    />
  );
}
