import MapaSensors from "@/components/mapa/mapa-sensors";
import PurpleAirSensors from "@/components/data/purple-air-sensors";
import PurpleAirData from "@/components/data/purple-air-data";

export default async function Mapa() {
  const sensors = await PurpleAirSensors();
  const data = await PurpleAirData();

  return (
    <>
      <MapaSensors sensors={sensors} data={data} />
    </>
  );
}
