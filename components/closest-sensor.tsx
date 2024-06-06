"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import mbxGeocoding from "@mapbox/mapbox-sdk/services/geocoding";

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

// Props interface for the ClosestSensor component
interface ClosestSensorProps {
  sensors: Sensor[];
  data: Data[];
  showMenoresRecommendation?: boolean;
  showAdultosMayoresRecommendation?: boolean;
  showEmbarazadasRecommendation?: boolean;
  showEnfermedadesRecommendation?: boolean;
  showAddress?: boolean;
}

// Type for the air quality text
type QualityText =
  | "Buena"
  | "Aceptable"
  | "Mala"
  | "Muy Mala"
  | "Extremadamente Mala"
  | "No Disponible";

// Mapbox Geocoding Client
const geocodingClient = mbxGeocoding({
  accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!,
});

export default function ClosestSensor({
  sensors,
  data,
  showMenoresRecommendation = false,
  showAdultosMayoresRecommendation = false,
  showEmbarazadasRecommendation = false,
  showEnfermedadesRecommendation = false,
  showAddress = false,
}: ClosestSensorProps) {
  // State for storing the user's current location
  const [location, setLocation] = useState<{
    latitude: number | null;
    longitude: number | null;
  }>({ latitude: null, longitude: null });

  // State for storing the address of the closest sensor
  const [address, setAddress] = useState<string | null>(null);

  // State for storing the pm25 value for the closest sensor
  const [pm25, setPm25] = useState<number | null>(null);

  // State for storing any error messages
  const [error, setError] = useState<string | null>(null);

  // State for tracking the loading status
  const [loading, setLoading] = useState(true);

  // 1. Get the user's current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      // If geolocation is supported, get the current position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLoading(false);
        },
        (error) => {
          // Handle any errors from the geolocation API
          setError("Ubicación no disponible");
          setLoading(false);
        },
      );
    } else {
      // If geolocation is not supported, set an error message
      setError("Ubicación no disponible");
      setLoading(false);
    }
  }, []);

  // 2. Mapbox Geocoding Client
  useEffect(() => {
    if (
      location.latitude !== null &&
      location.longitude !== null &&
      showAddress
    ) {
      const fetchAddress = async () => {
        try {
          const response = await geocodingClient
            .reverseGeocode({
              query: [
                location.longitude as number,
                location.latitude as number,
              ],
              limit: 1,
            })
            .send();

          if (response.body.features.length > 0) {
            setAddress(response.body.features[0].place_name);
          } else {
            setError("Dirección no disponible");
          }
        } catch (error) {
          setError("Error al obtener la dirección");
        }
      };
      fetchAddress();
    }
  }, [location, showAddress]);

  // 3. Calculate the distance between two geographic points using the Haversine formula
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

  // 4. Find the pm25 value for the closest sensor whenever the location, sensors or data changes
  useEffect(() => {
    if (
      location.latitude !== null &&
      location.longitude !== null &&
      sensors.length > 0
    ) {
      setLoading(true);
      // Sort the sensors based on their distance to the user's location
      const sortedSensors = [...sensors].sort((a, b) => {
        const aDistance = getDistance(
          location.latitude!,
          location.longitude!,
          a.lat,
          a.lon,
        );
        const bDistance = getDistance(
          location.latitude!,
          location.longitude!,
          b.lat,
          b.lon,
        );
        return aDistance - bDistance;
      });

      // Iterate over the sorted sensors until you find one with a valid pm25 value
      for (const sensor of sortedSensors) {
        const sensorData = data.find((d) => d.sensor_id === sensor.sensor_id);
        if (sensorData && sensorData.pm25 !== null && sensorData.pm25 !== 0) {
          setPm25(sensorData.pm25);
          setLoading(false);
          return;
        }
      }

      // If no sensor with a valid pm25 value was found, set pm25 to null
      setPm25(null);
      setLoading(false);
    }
  }, [location, sensors, data]);

  // Air Quality text
  const getQualityText = (): QualityText => {
    if (pm25 === null) return "No Disponible";
    if (pm25 <= 15) return "Buena";
    if (pm25 > 15 && pm25 <= 25) return "Aceptable";
    if (pm25 > 25 && pm25 <= 79) return "Mala";
    if (pm25 > 79 && pm25 <= 130) return "Muy Mala";
    if (pm25 > 130) return "Extremadamente Mala";
    return "No Disponible"; // default text in case the value is null or undefined
  };

  // Población General recommendation
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

  // Marker position for the quality bar
  const getMarkerPosition = () => {
    if (pm25 === null) return 0; // return a default value when pm25 is null
    if (pm25 <= 15) return (pm25 / 15) * 10 + 6;
    if (pm25 <= 25) return 16 + ((pm25 - 16) / 10) * 10 + 6;
    if (pm25 <= 79) return 32 + ((pm25 - 26) / 54) * 20 + 6;
    if (pm25 <= 130) return 58 + ((pm25 - 80) / 51) * 20 + 6;
    return 84 + 6;
  };

  // Menores de 12 años recommendation
  const getMenoresRecommendation = (pm25: number | null): string => {
    if (pm25 === null) return "No Disponible";
    if (pm25 <= 15) return "Disfruta las actividades al aire libre.";
    if (pm25 > 15 && pm25 <= 25)
      return "Disfruta las actividades al aire libre.";
    if (pm25 > 25 && pm25 <= 79)
      return "Reduce las actividades físicas vigorosas al aire libre. Es posible hacer actividades moderadas en el exterior.";
    if (pm25 > 79 && pm25 <= 130)
      return "Evita la actividad física vigorosa o prolongada al aire libre. Si presentas algún síntoma, busca el consejo de tu médico.";
    if (pm25 > 130)
      return "Permanece en interiores. Acude al médico si presentas síntomas respiratorios o cardiacos.";
    return "No Disponible"; // default text in case the value is null or undefined
  };

  // Adultos Mayores recommendation
  const getAdultosMayoresRecommendation = (pm25: number | null): string => {
    if (pm25 === null) return "No Disponible";
    if (pm25 <= 15) return "Disfruta las actividades al aire libre.";
    if (pm25 > 15 && pm25 <= 25)
      return "Reduce las actividades físicas vigorosas al aire libre. Es posible hacer actividades moderadas en el exterior.";
    if (pm25 > 25 && pm25 <= 79)
      return "Reduce las actividades físicas vigorosas al aire libre.";
    if (pm25 > 79 && pm25 <= 130)
      return "Evita las actividades físicas y el tiempo de estancia al aire libre. Acude al médico si presentas síntomas respiratorios o cardiacos.";
    if (pm25 > 130)
      return "Permanece en interiores. Acude al médico si presentas síntomas respiratorios o cardiacos.";
    return "No Disponible"; // default text in case the value is null or undefined
  };

  // Embarazadas recommendation
  const getEmbarazadasRecommendation = (pm25: number | null): string => {
    if (pm25 === null) return "No Disponible";
    if (pm25 <= 15) return "Disfruta las actividades al aire libre.";
    if (pm25 > 15 && pm25 <= 25)
      return "Disfruta las actividades al aire libre.";
    if (pm25 > 25 && pm25 <= 79)
      return "Reduce las actividades físicas vigorosas al aire libre. Es posible hacer actividades moderadas en el exterior.";
    if (pm25 > 79 && pm25 <= 130)
      return "Evita la actividad física vigorosa o prolongada al aire libre. Si presentas algún síntoma, busca el consejo de tu médico.";
    if (pm25 > 130)
      return "Permanece en interiores. Acude al médico si presentas síntomas respiratorios o cardiacos.";
    return "No Disponible"; // default text in case the value is null or undefined
  };

  // Enfermedades recommendation
  const getEnfermedadesRecommendation = (pm25: number | null): string => {
    if (pm25 === null) return "No Disponible";
    if (pm25 <= 15) return "Disfruta las actividades al aire libre.";
    if (pm25 > 15 && pm25 <= 25)
      return "Reduce las actividades físicas vigorosas al aire libre. Es posible hacer actividades moderadas en el exterior.";
    if (pm25 > 25 && pm25 <= 79)
      return "Reduce las actividades físicas vigorosas al aire libre.";
    if (pm25 > 79 && pm25 <= 130)
      return "Evita las actividades físicas y el tiempo de estancia al aire libre. Acude al médico si presentas síntomas respiratorios o cardiacos.";
    if (pm25 > 130)
      return "Permanece en interiores. Acude al médico si presentas síntomas respiratorios o cardiacos.";
    return "No Disponible"; // default text in case the value is null or undefined
  };

  // Población sensible border colors
  const getBorderColor = (pm25: number | null): string => {
    if (pm25 === null) return "border-white-400";
    if (pm25 <= 15) return "border-green-400";
    if (pm25 > 15 && pm25 <= 25) return "border-yellow-400";
    if (pm25 > 25 && pm25 <= 79) return "border-orange-400";
    if (pm25 > 79 && pm25 <= 130) return "border-red-400";
    if (pm25 > 130) return "border-purple-400";
    return "border-white-400"; // default color in case the value is null or undefined
  };

  return (
    <>
      {error ? (
        // 1. Display error message
        <p>{error}</p>
      ) : loading ? (
        // 2. Display loading skeleton
        <div className="flex flex-col space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <div className="flex flex-col space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-1/2" />
          </div>
          <div className="pb-1 pt-2">
            <Skeleton className="h-5 w-full" />
          </div>
        </div>
      ) : (
        <>
          {showAddress && <div>{address || "ubicación no disponible"}</div>}
          {showMenoresRecommendation && (
            <div className="flex flex-col">
              <div
                className={`mb-4 rounded-lg border-b-4 ${getBorderColor(pm25)}`}
              />
              {getMenoresRecommendation(pm25)}
            </div>
          )}
          {showAdultosMayoresRecommendation && (
            <div>
              <div
                className={`mb-4 rounded-lg border-b-4 ${getBorderColor(pm25)}`}
              />
              {getAdultosMayoresRecommendation(pm25)}
            </div>
          )}
          {showEmbarazadasRecommendation && (
            <div>
              <div
                className={`mb-4 rounded-lg border-b-4 ${getBorderColor(pm25)}`}
              />
              {getEmbarazadasRecommendation(pm25)}
            </div>
          )}
          {showEnfermedadesRecommendation && (
            <div>
              <div
                className={`mb-4 rounded-lg border-b-4 ${getBorderColor(pm25)}`}
              />
              {getEnfermedadesRecommendation(pm25)}
            </div>
          )}
          {!showAddress &&
            !showMenoresRecommendation &&
            !showAdultosMayoresRecommendation &&
            !showEmbarazadasRecommendation &&
            !showEnfermedadesRecommendation && (
              <div className="flex flex-col space-y-4">
                <div className="text-4xl font-semibold lg:text-5xl">
                  {getQualityText()}
                </div>
                <div className="text-lg">{getRecommendedText()}</div>
                <div className="pb-1 pt-2">
                  <div className="relative flex min-h-[12px] overflow-hidden rounded-lg">
                    <div
                      style={{ flexBasis: "12%" }}
                      className="bg-green-400"
                    />
                    <div
                      style={{ flexBasis: "10%" }}
                      className="bg-gradient-to-r from-green-400 to-yellow-400"
                    />
                    <div
                      style={{ flexBasis: "12%" }}
                      className="bg-yellow-400"
                    />
                    <div
                      style={{ flexBasis: "10%" }}
                      className="bg-gradient-to-r from-yellow-400 to-orange-400"
                    />
                    <div
                      style={{ flexBasis: "12%" }}
                      className="bg-orange-400"
                    />
                    <div
                      style={{ flexBasis: "10%" }}
                      className="bg-gradient-to-r from-orange-400 to-red-400"
                    />
                    <div style={{ flexBasis: "12%" }} className="bg-red-400" />
                    <div
                      style={{ flexBasis: "10%" }}
                      className="bg-gradient-to-r from-red-400 to-purple-400"
                    />
                    <div
                      style={{ flexBasis: "12%" }}
                      className="bg-purple-400"
                    />
                    <div
                      style={{
                        left: `${getMarkerPosition()}%`,
                        borderColor: "white",
                      }}
                      className="absolute top-1/2 h-4 w-4 -translate-y-1/2 transform rounded-full border-4 bg-gray-200"
                    ></div>
                  </div>
                </div>
              </div>
            )}
        </>
      )}
    </>
  );
}
