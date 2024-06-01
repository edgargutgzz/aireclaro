import { fetchSensors } from "@/components/purpleair_sensores";
import GeolocationComponent from "@/components/location";
import PurpleAirSensores from "@/components/purpleair_sensores";
import PurpleAir from "@/components/purpleair";

export default async function Inicio() {
  const sensors = await fetchSensors();

  return (
    <div className="mx-4 flex flex-col pb-20 pt-6 lg:mx-36">
      {/* Main Recommendation */}
      <div className="flex flex-col space-y-2 rounded-lg bg-white p-4 text-left shadow-lg">
        <div className="text-xs text-gray-400 lg:text-sm">CALIDAD DEL AIRE</div>
        <div className="text-4xl font-semibold lg:text-5xl">Buena</div>
        <div className="text-left text-base lg:text-lg">
          Es posible realizar actividades al aire libre. Si presentas síntomas
          como tos o falta de aire, toma más descansos y realiza actividades
          menos vigorosas.
        </div>
      </div>
      {/* Location */}
      {/* <div className="rounded-lg bg-white p-4 text-sm shadow-lg lg:text-base">
        <GeolocationComponent sensors={sensors} />
      </div> */}
      {/* PurpleAir - Sensores */}
      {/* <div className="rounded-lg bg-white p-4 text-sm shadow-lg lg:text-base">
        <PurpleAirSensores />
      </div> */}
      {/* PurpleAir */}
      {/* <div className="rounded-lg bg-white p-4 text-sm shadow-lg lg:text-base">
        <PurpleAir />
      </div> */}
    </div>
  );
}
