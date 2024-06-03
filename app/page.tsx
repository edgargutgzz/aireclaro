import PurpleAirSensors from "@/components/purple-air-sensors";
import ClosestSensor from "@/components/closest-sensor";

export default async function Inicio() {
  const sensors = await PurpleAirSensors();
  return (
    <div className="mx-4 flex flex-col space-y-10 pb-20 pt-6 lg:mx-36">
      {/* Main Recommendation */}
      <div className="flex flex-col space-y-2 rounded-lg bg-white p-4 text-left shadow-lg lg:space-y-4">
        <div className="text-xs text-gray-400 lg:text-sm">CALIDAD DEL AIRE</div>
        <div className="text-4xl font-semibold lg:text-5xl">Buena</div>
        <div className="lg:text-lg">
          Es posible realizar actividades al aire libre. Si presentas síntomas
          como tos o falta de aire, toma más descansos y realiza actividades
          menos vigorosas.
        </div>
      </div>
      {/* User Location */}
      <div className="rounded-lg bg-white p-4 text-sm shadow-lg lg:text-base">
        <ClosestSensor sensors={sensors} />
      </div>
    </div>
  );
}
