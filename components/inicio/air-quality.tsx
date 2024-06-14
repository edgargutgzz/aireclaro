"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import SkeletonGeneral from "./skeleton-general";
import SkeletonSensible from "./skeleton-sensible";
import { format } from "date-fns";
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

// Props interface for the Air Quality component
interface AirQualityProps {
  sensors: Sensor[];
  data: Data[];
  showMenoresRecommendation?: boolean;
  showAdultosMayoresRecommendation?: boolean;
  showEmbarazadasRecommendation?: boolean;
  showEnfermedadesRecommendation?: boolean;
  showAddress?: boolean;
  showTime?: boolean;
}

// Type for the air quality text
type QualityText =
  | "Buena"
  | "Aceptable"
  | "Mala"
  | "Muy Mala"
  | "Extremadamente Mala"
  | "No Disponible";

// Geocoding client
const geocodingClient = mbxGeocoding({
  accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!,
});

export default function AirQuality({
  sensors,
  data,
  showMenoresRecommendation = false,
  showAdultosMayoresRecommendation = false,
  showEmbarazadasRecommendation = false,
  showEnfermedadesRecommendation = false,
  showAddress = false,
  showTime = false,
}: AirQualityProps) {
  // Consolidated state for location, air quality data, error, and loading status
  const [state, setState] = useState({
    location: {
      latitude: null as number | null,
      longitude: null as number | null,
    },
    airQuality: {
      pm25: null as number | null,
      timestamp: null as string | null,
    },
    address: null as string | null,
    error: null as string | null,
    loading: true,
  });

  // Fetch the user's current address based on latitude and longitude from the use effect hook below
  const fetchAddress = useCallback(
    async (latitude: number, longitude: number): Promise<void> => {
      try {
        // Make a request to the geocoding service with the given coordinates
        const response = await geocodingClient
          .reverseGeocode({
            query: [longitude, latitude], // Provide the coordinates
            limit: 1, // Limit the response to 1 result
          })
          .send(); // Send the request and await the response

        // If the response contains at least one feature, update the state with the place name
        if (response.body.features.length > 0) {
          setState((prevState) => ({
            ...prevState,
            address: response.body.features[0].place_name, // Update state with the address
          }));
        } else {
          // If no features are found, update the state with a default message
          setState((prevState) => ({
            ...prevState,
            address: "Dirección no disponible", // Address not available
          }));
        }
      } catch {
        // If an error occurs during the request, update the state with an error message
        setState((prevState) => ({
          ...prevState,
          address: "Error al obtener la dirección", // Error obtaining the address
        }));
      }
    },
    [], // Empty dependency array means this function is created once and won't change
  );

  // Fetch the user's current latitude and longitude
  useEffect(() => {
    // Check if the browser supports geolocation
    if (navigator.geolocation) {
      // Request the user's current position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Success callback: extracting latitude and longitude from the position object
          const { latitude, longitude } = position.coords;

          // Update the state with the obtained coordinates and set loading to false
          setState((prevState) => ({
            ...prevState,
            location: { latitude, longitude },
            loading: false,
          }));

          // Fetch the address for the given coordinates
          fetchAddress(latitude, longitude);
        },
        () => {
          // Error callback: if obtaining the position fails, update the state with an error message
          setState((prevState) => ({
            ...prevState,
            error: "Ubicación no disponible", // Location not available
            loading: false,
          }));
        },
      );
    } else {
      // If the browser does not support geolocation, update the state with an error message
      setState((prevState) => ({
        ...prevState,
        error: "Ubicación no disponible", // Location not available
        loading: false,
      }));
    }
  }, [fetchAddress]); // Dependency array ensures this effect runs only once on mount

  // Calculate the distance between two sets of coordinates
  const getDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number) => {
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
    },
    [],
  );

  // Sort sensors by distance to the user's location using the getDistance function above
  const sortedSensors = useMemo(() => {
    if (
      state.location.latitude !== null &&
      state.location.longitude !== null &&
      sensors.length > 0
    ) {
      return [...sensors].sort((a, b) => {
        const aDistance = getDistance(
          state.location.latitude!,
          state.location.longitude!,
          a.lat,
          a.lon,
        );
        const bDistance = getDistance(
          state.location.latitude!,
          state.location.longitude!,
          b.lat,
          b.lon,
        );
        return aDistance - bDistance;
      });
    }
    return [];
  }, [state.location, sensors, getDistance]);

  // Find the pm25 and timestamp value for the closest sensor
  useEffect(() => {
    if (sortedSensors.length > 0) {
      setState((prevState) => ({ ...prevState, loading: true }));
      for (const sensor of sortedSensors) {
        const sensorData = data.find((d) => d.sensor_id === sensor.sensor_id);
        if (sensorData && sensorData.pm25 !== null && sensorData.pm25 !== 0) {
          setState((prevState) => ({
            ...prevState,
            airQuality: {
              pm25: sensorData.pm25,
              timestamp: sensorData.time_stamp,
            },
            loading: false,
          }));
          return;
        }
      }
      setState((prevState) => ({
        ...prevState,
        airQuality: { pm25: null, timestamp: null },
        loading: false,
      }));
    }
  }, [sortedSensors, data]);

  // Air Quality text based on pm25 value
  const getQualityText = useCallback((): QualityText => {
    const { pm25 } = state.airQuality;
    if (pm25 === null) return "No Disponible";
    if (pm25 <= 15) return "Buena";
    if (pm25 > 15 && pm25 <= 25) return "Aceptable";
    if (pm25 > 25 && pm25 <= 79) return "Mala";
    if (pm25 > 79 && pm25 <= 130) return "Muy Mala";
    if (pm25 > 130) return "Extremadamente Mala";
    return "No Disponible";
  }, [state.airQuality]);

  // Población general recommendation based on the air quality text
  const recommendationText = useMemo(() => {
    const { pm25 } = state.airQuality;
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
    return textMap[getQualityText()] || "No Disponible";
  }, [state.airQuality, getQualityText]);

  // Población sensible recommendations based on the air quality text
  const getAdditionalRecommendation = (type: string): string => {
    const { pm25 } = state.airQuality;
    const recommendationMap: {
      [key: string]: { [key in QualityText]: string };
    } = {
      menores: {
        Buena: "Disfruta las actividades al aire libre.",
        Aceptable: "Disfruta las actividades al aire libre.",
        Mala: "Reduce las actividades físicas vigorosas al aire libre. Es posible hacer actividades moderadas en el exterior.",
        "Muy Mala":
          "Evita la actividad física vigorosa o prolongada al aire libre. Si presentas algún síntoma, busca el consejo de tu médico.",
        "Extremadamente Mala":
          "Permanece en interiores. Acude al médico si presentas síntomas respiratorios o cardiacos.",
        "No Disponible": "No Disponible",
      },
      adultosMayores: {
        Buena: "Disfruta las actividades al aire libre.",
        Aceptable:
          "Reduce las actividades físicas vigorosas al aire libre. Es posible hacer actividades moderadas en el exterior.",
        Mala: "Reduce las actividades físicas vigorosas al aire libre.",
        "Muy Mala":
          "Evita las actividades físicas y el tiempo de estancia al aire libre. Acude al médico si presentas síntomas respiratorios o cardiacos.",
        "Extremadamente Mala":
          "Permanece en interiores. Acude al médico si presentas síntomas respiratorios o cardiacos.",
        "No Disponible": "No Disponible",
      },
      embarazadas: {
        Buena: "Disfruta las actividades al aire libre.",
        Aceptable: "Disfruta las actividades al aire libre.",
        Mala: "Reduce las actividades físicas vigorosas al aire libre. Es posible hacer actividades moderadas en el exterior.",
        "Muy Mala":
          "Evita la actividad física vigorosa o prolongada al aire libre. Si presentas algún síntoma, busca el consejo de tu médico.",
        "Extremadamente Mala":
          "Permanece en interiores. Acude al médico si presentas síntomas respiratorios o cardiacos.",
        "No Disponible": "No Disponible",
      },
      enfermedades: {
        Buena: "Disfruta las actividades al aire libre.",
        Aceptable:
          "Reduce las actividades físicas vigorosas al aire libre. Es posible hacer actividades moderadas en el exterior.",
        Mala: "Reduce las actividades físicas vigorosas al aire libre.",
        "Muy Mala":
          "Evita las actividades físicas y el tiempo de estancia al aire libre. Acude al médico si presentas síntomas respiratorios o cardiacos.",
        "Extremadamente Mala":
          "Permanece en interiores. Acude al médico si presentas síntomas respiratorios o cardiacos.",
        "No Disponible": "No Disponible",
      },
    };
    return recommendationMap[type][getQualityText()];
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

  // Marker position for the air quality bar
  const getMarkerPosition = () => {
    const { pm25 } = state.airQuality;
    if (pm25 === null) return 0; // return a default value when pm25 is null
    if (pm25 <= 15) return (pm25 / 15) * 10 + 6;
    if (pm25 <= 25) return 16 + ((pm25 - 16) / 10) * 10 + 6;
    if (pm25 <= 79) return 32 + ((pm25 - 26) / 54) * 20 + 6;
    if (pm25 <= 130) return 58 + ((pm25 - 80) / 51) * 20 + 6;
    return 84 + 6;
  };

  return (
    <>
      {state.error ? (
        <p>{state.error}</p>
      ) : state.loading ? (
        <>
          {showMenoresRecommendation ||
          showAdultosMayoresRecommendation ||
          showEmbarazadasRecommendation ||
          showEnfermedadesRecommendation ? (
            <SkeletonSensible />
          ) : (
            <SkeletonGeneral />
          )}
        </>
      ) : (
        <>
          {showAddress &&
            state.location.latitude !== null &&
            state.location.longitude !== null && (
              <div className="flex items-center">
                {state.address ? (
                  <div>{state.address}</div>
                ) : (
                  <div>Loading...</div>
                )}
              </div>
            )}
          {showTime &&
            state.airQuality.timestamp &&
            format(
              new Date(state.airQuality.timestamp.replace(" ", "T")),
              "h:mm a",
            ).replace(/:\d{2}/, ":00")}
          {showMenoresRecommendation && (
            <div className="flex flex-col pb-1">
              <div
                className={`mb-2 rounded-lg border-b-4 lg:mb-4 ${getBorderColor(state.airQuality.pm25)}`}
              />
              {getAdditionalRecommendation("menores")}
            </div>
          )}
          {showAdultosMayoresRecommendation && (
            <div className="flex flex-col pb-1">
              <div
                className={`mb-2 rounded-lg border-b-4 lg:mb-4 ${getBorderColor(state.airQuality.pm25)}`}
              />
              {getAdditionalRecommendation("adultosMayores")}
            </div>
          )}
          {showEmbarazadasRecommendation && (
            <div className="flex flex-col pb-1">
              <div
                className={`mb-2 rounded-lg border-b-4 lg:mb-4 ${getBorderColor(state.airQuality.pm25)}`}
              />
              {getAdditionalRecommendation("embarazadas")}
            </div>
          )}
          {showEnfermedadesRecommendation && (
            <div className="flex flex-col pb-1">
              <div
                className={`mb-2 rounded-lg border-b-4 lg:mb-4 ${getBorderColor(state.airQuality.pm25)}`}
              />
              {getAdditionalRecommendation("enfermedades")}
            </div>
          )}
          {!showAddress &&
            !showTime &&
            !showMenoresRecommendation &&
            !showAdultosMayoresRecommendation &&
            !showEmbarazadasRecommendation &&
            !showEnfermedadesRecommendation && (
              <div className="flex flex-col space-y-2 lg:space-y-4">
                {/* Air Quality Title */}
                <div className="text-4xl font-semibold lg:text-5xl">
                  {getQualityText()}
                </div>
                {/* Air Quality Text */}
                <div className="lg:text-lg">{recommendationText}</div>
                {/* Air Quality Bar */}
                <div className="pt-2 lg:pt-3">
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
