import PurpleAirSensors from "@/components/purple-air-sensors";
import ClosestSensor from "@/components/closest-sensor";
import PurpleAirData from "@/components/purple-air-data";

export default async function Inicio() {
  const sensors = await PurpleAirSensors();
  const data = await PurpleAirData();
  return (
    <div className="mx-4 flex flex-col space-y-10 pb-20 pt-6 lg:mx-36">
      {/* Main Recommendation Card */}
      <div className="flex flex-col space-y-2 rounded-lg bg-white p-5 text-left shadow-lg lg:space-y-4">
        {/* Title */}
        <div className="pt-1 text-xs text-gray-400 lg:text-sm">
          CALIDAD DEL AIRE
        </div>
        {/* Air Quality Title, Text and Bar */}
        <ClosestSensor sensors={sensors} data={data} />
      </div>
    </div>
  );
}
