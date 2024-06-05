import PurpleAirSensors from "@/components/purple-air-sensors";
import ClosestSensor from "@/components/closest-sensor";
import PurpleAirData from "@/components/purple-air-data";
import Image from "next/image";

export default async function Inicio() {
  const sensors = await PurpleAirSensors();
  const data = await PurpleAirData();

  return (
    <div className="mx-4 flex flex-col space-y-10 pb-20 pt-6 lg:mx-36">
      {/* Main Recommendation Cards */}
      <div className="flex flex-col space-y-2 rounded-lg bg-white p-5 text-left shadow-lg lg:space-y-4">
        <div className="text-sm text-gray-400">CALIDAD DEL AIRE</div>
        <ClosestSensor sensors={sensors} data={data} />
      </div>
      <div className="flex justify-center text-sm text-gray-400">
        POBLACIÓN SENSIBLE
      </div>
      <div className="flex justify-between space-x-8">
        {/* Menores de 12 */}
        <div className="flex w-1/2 flex-col space-y-2 rounded-lg border-b-4 bg-white p-5 text-left shadow-lg lg:space-y-4">
          <Image src="/menores.png" width={32} height={32} alt="Menores Icon" />
          <div className="font-semibold">Menores de 12 años</div>
          <ClosestSensor
            sensors={sensors}
            data={data}
            showMenoresRecommendation
          />
        </div>
      </div>
    </div>
  );
}
