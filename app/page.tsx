import PurpleAirSensors from "@/components/purple-air-sensors";
import ClosestSensor from "@/components/closest-sensor";
import PurpleAirData from "@/components/purple-air-data";
import Image from "next/image";
import { Navigation, Clock } from "lucide-react";

export default async function Inicio() {
  const sensors = await PurpleAirSensors();
  const data = await PurpleAirData();

  return (
    <div className="mx-4 flex flex-col space-y-16 pb-20 pt-10 lg:mx-36">
      {/* Población general recommendation */}
      <div className="flex flex-col space-y-5">
        {/* Title */}
        <div className="flex justify-center text-sm text-gray-400">
          POBLACIÓN GENERAL
        </div>
        {/* Air Quality text, recommendation and quality bar */}
        <div className="flex flex-col space-y-2 rounded-lg bg-white p-5 text-left shadow-lg lg:space-y-4">
          <div className="text-sm text-gray-400">CALIDAD DEL AIRE</div>
          <ClosestSensor sensors={sensors} data={data} />
        </div>
      </div>
      {/* Población sensible recommendations */}
      <div className="flex flex-col space-y-5">
        {/* Title */}
        <div className="flex justify-center text-sm text-gray-400">
          POBLACIÓN SENSIBLE
        </div>
        {/* Menores y Adultos Mayores recommendation */}
        <div className="flex justify-between space-x-8">
          {/* Menores de 12 */}
          <div className="flex w-1/2 flex-col space-y-2 rounded-lg bg-white p-5 text-left shadow-lg lg:space-y-3">
            <Image
              src="/menores.png"
              width={32}
              height={32}
              alt="Menores Icon"
            />
            <div className="font-semibold">Menores de 12 años</div>
            <ClosestSensor
              sensors={sensors}
              data={data}
              showMenoresRecommendation
            />
          </div>
          {/* Mayores de 60 años */}
          <div className="flex w-1/2 flex-col space-y-2 rounded-lg bg-white p-5 text-left shadow-lg lg:space-y-3">
            <Image
              src="/adultos-mayores.png"
              width={32}
              height={32}
              alt="Adultos mayores Icon"
            />
            <div className="font-semibold">Mayores de 60 años</div>
            <ClosestSensor
              sensors={sensors}
              data={data}
              showAdultosMayoresRecommendation
            />
          </div>
        </div>
        {/* Embarazadas y Enfermedades recommendation */}
        <div className="flex justify-between space-x-8">
          {/* Embarazadas */}
          <div className="flex w-1/2 flex-col space-y-2 rounded-lg bg-white p-5 text-left shadow-lg lg:space-y-3">
            <Image
              src="/embarazadas.png"
              width={26}
              height={26}
              alt="Personas Embarazadas Icon"
            />
            <div className="font-semibold">Personas embarazadas</div>
            <ClosestSensor
              sensors={sensors}
              data={data}
              showEmbarazadasRecommendation
            />
          </div>
          {/* Enfermedades */}
          <div className="flex w-1/2 flex-col space-y-2 rounded-lg bg-white p-5 text-left shadow-lg lg:space-y-3">
            <div className="flex flex-row space-x-2">
              <Image
                src="/enfermedades-corazon.png"
                width={32}
                height={32}
                alt="Adultos mayores Icon"
              />
              <Image
                src="/enfermedades-pulmon.png"
                width={32}
                height={32}
                alt="Adultos mayores Icon"
              />
            </div>
            <div className="font-semibold">
              Enfermedades cardiovasculares y respiratorias
            </div>
            <ClosestSensor
              sensors={sensors}
              data={data}
              showEnfermedadesRecommendation
            />
          </div>
        </div>
      </div>
      {/* Ubicación y Hora */}
      <div className="flex flex-col space-y-5">
        {/* Title */}
        <div className="flex justify-center text-sm text-gray-400">
          UBICACIÓN Y HORA
        </div>
        {/* Ubicación */}
        <div className="flex items-center rounded-lg bg-white p-5 text-sm shadow-lg">
          <Navigation width={20} height={20} />
          <div className="pl-4 pr-1">Calidad de aire en</div>
          <ClosestSensor sensors={sensors} data={data} showAddress />
        </div>
        {/* Hora */}
        <div className="flex items-center rounded-lg bg-white p-5 text-sm shadow-lg">
          <Clock width={20} height={20} />
          <div className="pl-4 pr-1">Última actualización a las</div>
          <ClosestSensor sensors={sensors} data={data} showTime />
        </div>
      </div>
    </div>
  );
}
