"use client";

import { useEffect, useState } from "react";

// Define the Sensor interface
interface Sensor {
  id: number;
  sensor_id: number;
  nombre: string;
  lat: number;
  lon: number;
}

// Define the props interface for the component
interface ClosestSensorProps {
  sensors: Sensor[];
}

// Define the ClosestSensor component
export default function ClosestSensor({ sensors }: ClosestSensorProps) {
  // State for storing the user's current location
  const [location, setLocation] = useState<{
    latitude: number | null;
    longitude: number | null;
  }>({ latitude: null, longitude: null });

  // State for storing the closest sensor
  const [closestSensor, setClosestSensor] = useState<Sensor | null>(null);

  // State for storing any error messages
  const [error, setError] = useState<string | null>(null);

  // useEffect to get the user's current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      // If geolocation is supported, get the current position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setLocation(newLocation);
        },
        (error) => {
          // Handle any errors from the geolocation API
          setError(error.message);
        },
      );
    } else {
      // If geolocation is not supported, set an error message
      setError("Geolocation is not supported by this browser.");
    }
  }, []);

  // useEffect to find the closest sensor whenever the location or sensors change
  useEffect(() => {
    if (
      location.latitude !== null &&
      location.longitude !== null &&
      sensors.length > 0
    ) {
      // Calculate the closest sensor
      const closest = sensors.reduce((prev, curr) => {
        const prevDistance = getDistance(
          location.latitude!,
          location.longitude!,
          prev.lat,
          prev.lon,
        );
        const currDistance = getDistance(
          location.latitude!,
          location.longitude!,
          curr.lat,
          curr.lon,
        );
        return currDistance < prevDistance ? curr : prev;
      });
      // Update the state with the closest sensor
      setClosestSensor(closest);
    }
  }, [location, sensors]);

  // Function to calculate the distance between two geographic points using the Haversine formula
  const getDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const lat1Rad = toRad(lat1);
    const lat2Rad = toRad(lat2);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) *
        Math.sin(dLon / 2) *
        Math.cos(lat1Rad) *
        Math.cos(lat2Rad);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Render the component
  return (
    <div>
      {error ? (
        // Display the error message if there's an error
        <p>Error: {error}</p>
      ) : (
        <div>
          {/* Display the user's current location */}
          <p>
            Latitude: {location.latitude}, Longitude: {location.longitude}
          </p>
          {closestSensor ? (
            // Display the closest sensor if found
            <div>
              <h2>Closest Sensor:</h2>
              <p>Sensor ID: {closestSensor.sensor_id}</p>
              <p>Name: {closestSensor.nombre}</p>
              <p>
                Latitude: {closestSensor.lat}, Longitude: {closestSensor.lon}
              </p>
            </div>
          ) : (
            // Display a message while finding the closest sensor
            <p>Finding closest sensor...</p>
          )}
        </div>
      )}
    </div>
  );
}
