import MapaSensors from "@/components/mapa/mapa-sensors";
import PurpleAirSensors from "@/components/data/purple-air-sensors";
import PurpleAirData from "@/components/data/purple-air-data";
import SimaSensors from "@/components/data/sima-sensors";
import SimaData from "@/components/data/sima-data";

export default async function Mapa() {
  const purpleAirSensors = await PurpleAirSensors();
  const purpleAirData = await PurpleAirData();
  const simaSensors = await SimaSensors();
  const simaData = await SimaData();

  // Tag each sensor with its source
  const taggedPurpleAirSensors = purpleAirSensors.map((sensor) => ({
    ...sensor,
    source: "purpleAir",
  }));
  const taggedSimaSensors = simaSensors.map((sensor) => ({
    ...sensor,
    source: "sima",
  }));

  // Combine sensors from both sources
  const sensors = [...taggedPurpleAirSensors, ...taggedSimaSensors];
  const data = [...purpleAirData, ...simaData];

  return (
    <>
      <MapaSensors sensors={sensors} data={data} />
    </>
  );
}
