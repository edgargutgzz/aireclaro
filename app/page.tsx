import type { Metadata } from "next";
import MapaSensors from "@/components/mapa/mapa-sensors-loader";
import PurpleAirSensors from "@/components/data/purple-air-sensors";
import PurpleAirData from "@/components/data/purple-air-data";
import SimaSensors from "@/components/data/sima-sensors";
import SimaData from "@/components/data/sima-data";
import { fetchWithFallback } from "@/utils/fetch";

export const revalidate = 120; // 2 minutes

export const metadata: Metadata = {
  title: "Mapa de Calidad del Aire en Monterrey en Tiempo Real",
  description:
    "Consulta el mapa interactivo de calidad del aire (PM2.5) en Monterrey y Zona Metropolitana. Datos en tiempo real de estaciones SIMA y sensores ciudadanos PurpleAir.",
};

export default async function Mapa() {
  // Critical data - retry on failure (both PurpleAir AND SIMA)
  const [purpleAirSensors, purpleAirData, simaSensors, simaData] =
    await Promise.all([
      fetchWithFallback(PurpleAirSensors, []),
      fetchWithFallback(PurpleAirData, []),
      fetchWithFallback(SimaSensors, []),
      fetchWithFallback(SimaData, []),
    ]);

  // Tag sensors
  const taggedPurpleAirSensors = purpleAirSensors.map((sensor) => ({
    ...sensor,
    source: "purpleAir",
  }));

  const taggedSimaSensors = simaSensors.map((sensor) => ({
    ...sensor,
    source: "sima",
  }));

  const sensors = [...taggedPurpleAirSensors, ...taggedSimaSensors];
  const data = [...purpleAirData, ...simaData];

  return <MapaSensors sensors={sensors} data={data} />;
}
