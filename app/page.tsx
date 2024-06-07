import PurpleAirSensors from "@/components/purple-air-sensors";
import ClosestSensor from "@/components/inicio/inicio";
import PurpleAirData from "@/components/purple-air-data";
import Image from "next/image";
import { Navigation, Clock, TriangleAlert } from "lucide-react";

export default async function Inicio() {
  const sensors = await PurpleAirSensors();
  const data = await PurpleAirData();

  return (
    <div className="mx-4 flex flex-col space-y-20 pb-20 pt-4 lg:mx-36 lg:pt-10">
      {/* Población general */}
      <div className="flex flex-col">
        {/* Title */}
        <div className="flex justify-center pb-3 text-sm text-gray-400">
          POBLACIÓN GENERAL
        </div>
        {/* Air Quality text, recommendation and quality bar */}
        <div className="flex flex-col rounded-lg bg-white p-4 text-left shadow-lg lg:space-y-4">
          <div className="pt-1 text-sm text-gray-400">CALIDAD DEL AIRE</div>
          <ClosestSensor sensors={sensors} data={data} />
        </div>
      </div>
      {/* Población sensible */}
      <div className="flex flex-col">
        {/* Title */}
        <div className="flex justify-center pb-3 text-sm text-gray-400">
          POBLACIÓN SENSIBLE
        </div>
        {/* Menores y Adultos Mayores recommendation */}
        <div className="flex flex-col space-y-8 pb-6">
          {/* Menores de 12 */}
          <div className="flex flex-col rounded-lg bg-white p-4 text-left shadow-lg lg:space-y-3">
            <Image
              src="/menores.png"
              width={32}
              height={32}
              alt="Menores Icon"
              className="pb-4 pt-1"
            />
            <div className="pb-4 font-semibold">Menores de 12 años</div>
            <ClosestSensor
              sensors={sensors}
              data={data}
              showMenoresRecommendation
            />
          </div>
          {/* Mayores de 60 años */}
          <div className="flex flex-col rounded-lg bg-white p-4 text-left shadow-lg lg:space-y-3">
            <Image
              src="/adultos-mayores.png"
              width={32}
              height={32}
              alt="Adultos mayores Icon"
              className="pb-4 pt-1"
            />
            <div className="pb-4 font-semibold">Mayores de 60 años</div>
            <ClosestSensor
              sensors={sensors}
              data={data}
              showAdultosMayoresRecommendation
            />
          </div>
        </div>
        {/* Embarazadas y Enfermedades recommendation */}
        <div className="flex flex-col space-y-8">
          {/* Embarazadas */}
          <div className="flex flex-col rounded-lg bg-white p-5 text-left shadow-lg lg:space-y-3">
            <Image
              src="/embarazadas.png"
              width={26}
              height={26}
              alt="Personas Embarazadas Icon"
              className="pb-4 pt-1"
            />
            <div className="pb-4 font-semibold">Personas embarazadas</div>
            <ClosestSensor
              sensors={sensors}
              data={data}
              showEmbarazadasRecommendation
            />
          </div>
          {/* Enfermedades */}
          <div className="flex flex-col rounded-lg bg-white p-5 text-left shadow-lg lg:space-y-3">
            <div className="flex flex-row space-x-2 pb-4 pt-1">
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
            <div className="pb-4 font-semibold">
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
      <div className="flex flex-col">
        {/* Title */}
        <div className="flex justify-center pb-3 text-sm text-gray-400">
          UBICACIÓN Y HORA
        </div>
        {/* Cards */}
        <div className="flex flex-col space-y-8">
          {/* Ubicación */}
          <div className="flex flex-col space-y-4 rounded-lg bg-white p-4 text-sm shadow-lg">
            <Navigation />
            <ClosestSensor sensors={sensors} data={data} showAddress />
          </div>
          {/* Hora */}
          <div className="flex flex-col space-y-4 rounded-lg bg-white p-4 text-sm shadow-lg">
            <Clock />
            <div className="flex">
              <div className="pr-1">Última actualización a las</div>
              <ClosestSensor sensors={sensors} data={data} showTime />
            </div>
          </div>
          {/* Nota aclaratoria */}
          <div className="flex flex-col space-y-4 rounded-lg bg-white p-4 text-sm shadow-lg">
            <TriangleAlert />
            <div>
              En condiciones de alta humedad o viento fuerte, los sensores
              sobreestiman o subestiman las concentraciones de partículas finas,
              respectivamente.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
