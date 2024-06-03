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

// Define the Data interface
interface Data {
  id: number;
  sensor_id: number;
  pm25: number;
  time_stamp: string;
}

// Define the props interface for the component
interface ClosestSensorProps {
  sensors: Sensor[];
  data: Data[];
}

// Define a type for the quality text
type QualityText =
  | "Buena"
  | "Aceptable"
  | "Mala"
  | "Muy Mala"
  | "Extremadamente Mala"
  | "No Disponible";

export default function ClosestSensor({ sensors, data }: ClosestSensorProps) {
  // State for storing the user's current location
  const [location, setLocation] = useState<{
    latitude: number | null;
    longitude: number | null;
  }>({ latitude: null, longitude: null });

  // State for storing the pm25 value for the closest sensor
  const [pm25, setPm25] = useState<number | null>(null);

  // State for storing any error messages
  const [error, setError] = useState<string | null>(null);

  // useEffect to get the user's current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      // If geolocation is supported, get the current position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
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

  // useEffect to find the pm25 value for the closest sensor whenever the location or sensors change
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

      // Find the pm25 value for the closest sensor
      const sensorData = data.find((d) => d.sensor_id === closest.sensor_id);
      setPm25(sensorData ? sensorData.pm25 : null);
    }
  }, [location, sensors, data]);

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

  // Function to get the quality text based on the pm25 value
  const getQualityText = (): QualityText => {
    if (pm25 === null) return "No Disponible";
    if (pm25 <= 15) return "Buena";
    if (pm25 > 15 && pm25 <= 25) return "Aceptable";
    if (pm25 > 25 && pm25 <= 79) return "Mala";
    if (pm25 > 79 && pm25 <= 130) return "Muy Mala";
    if (pm25 > 130) return "Extremadamente Mala";
    return "No Disponible"; // default text in case the value is null or undefined
  };

  // Function to get the recommended text based on the quality text
  const getRecommendedText = (): string => {
    const textMap: { [key in QualityText]?: string } = {
      Buena: "Disfruta las actividades al aire libre.",
      Aceptable:
        "Disfruta las actividades al aire libre. Infórmate sobre la evolución de la calidad del aire.",
      Mala: "Es posible realizar actividades al aire libre. Si presentas síntomas como tos o falta de aire, toma más descansos y realiza actividades menos vigorosas.",
      "Muy Mala":
        "Reduce las actividades físicas al aire libre. Evita la actividad física vigorosa o prolongada en exteriores.",
      "Extremadamente Mala":
        "Permanece en interiores. Reprograma tus actividades al aire libre y si presentas síntomas respiratorios o cardiacos acude al médico.",
    };
    return textMap[getQualityText()] || "No Disponible"; // Default text in case of unexpected input
  };

  return (
    <div>
      {error ? (
        // Display the error message if there's an error
        <p>Error: {error}</p>
      ) : (
        // Display the pm25 value and quality text if found
        <div>
          <div className="text-4xl font-semibold lg:text-5xl">
            {getQualityText()}
          </div>
          <div className="mt-4 text-lg">{getRecommendedText()}</div>
        </div>
      )}
    </div>
  );
}
