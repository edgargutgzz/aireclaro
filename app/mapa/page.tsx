import MapaSensors from "@/components/mapa/mapa-sensors";
import PurpleAirSensors from "@/components/purple-air-sensors";

export default async function Mapa() {
  const sensors = await PurpleAirSensors();

  return (
    <>
      <MapaSensors sensors={sensors} />
    </>
  );
}
