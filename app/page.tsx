import MapaSensors from "@/components/mapa/mapa-sensors";
import PurpleAirSensors from "@/components/data/purple-air-sensors";
import PurpleAirData from "@/components/data/purple-air-data";
import SimaSensors from "@/components/data/sima-sensors";
import SimaData from "@/components/data/sima-data";

async function fetchWithFallback<T>(
  fetchFn: () => Promise<T>,
  fallbackValue: T,
  retries = 2,
): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetchFn();
    } catch (error) {
      if (i === retries) {
        console.warn(`Failed after ${retries + 1} attempts:`, error);
        return fallbackValue;
      }
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return fallbackValue;
}

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
