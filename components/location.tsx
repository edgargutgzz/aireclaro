"use client";

import { useEffect, useState, useCallback } from "react";

interface GeolocationComponentProps {
  sensors: any[];
  onLocationChange?: (latitude: number, longitude: number) => void;
}

export default function GeolocationComponent({
  sensors,
  onLocationChange,
}: GeolocationComponentProps) {
  const [location, setLocation] = useState<{
    latitude: number | null;
    longitude: number | null;
  }>({ latitude: null, longitude: null });

  const [closestSensor, setClosestSensor] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const getDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const toRad = (x: number) => (x * Math.PI) / 180;
      const R = 6371; // Earth radius in km

      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    },
    [],
  );

  const findClosestSensor = useCallback(
    (location: { latitude: number; longitude: number }, sensors: any[]) => {
      if (!location.latitude || !location.longitude) return null;

      console.log("Finding closest sensor for location:", location);
      console.log("Available sensors:", sensors);

      let closestSensor = null;
      let minDistance = Infinity;

      sensors.forEach((sensor) => {
        const distance = getDistance(
          location.latitude,
          location.longitude,
          sensor.lat, // Updated to match the data structure
          sensor.lon, // Updated to match the data structure
        );

        console.log(`Distance to sensor ${sensor.id}:`, distance);

        if (distance < minDistance) {
          minDistance = distance;
          closestSensor = sensor;
        }
      });

      console.log("Closest sensor found:", closestSensor);

      return closestSensor;
    },
    [getDistance],
  );

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setLocation(newLocation);
          if (onLocationChange) {
            onLocationChange(newLocation.latitude, newLocation.longitude);
          }

          const closest = findClosestSensor(newLocation, sensors);
          setClosestSensor(closest);
        },
        (error) => {
          setError(error.message);
        },
      );
    } else {
      setError("Geolocation is not supported by this browser.");
    }
  }, [onLocationChange, findClosestSensor, sensors]);

  return (
    <div>
      {error ? (
        <p>Error: {error}</p>
      ) : (
        <div>
          <p>
            Latitude: {location.latitude}, Longitude: {location.longitude}
          </p>
          {closestSensor ? (
            <div>
              <h3>Closest Sensor:</h3>
              <pre>{JSON.stringify(closestSensor, null, 2)}</pre>
            </div>
          ) : (
            <p>Finding closest sensor...</p>
          )}
        </div>
      )}
    </div>
  );
}
