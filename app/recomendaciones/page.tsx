import PurpleAirSensors from "@/components/data/purple-air-sensors";
import PurpleAirData from "@/components/data/purple-air-data";
import SimaSensors from "@/components/data/sima-sensors";
import SimaData from "@/components/data/sima-data";
import Image from "next/image";
import { Navigation, Clock } from "lucide-react";
import LazyAirQualityWrapper from "@/components/recomendaciones/lazy-air-quality";

export default async function Inicio() {
  const [purpleAirSensors, purpleAirData, simaSensors, simaData] =
    await Promise.all([
      PurpleAirSensors(),
      PurpleAirData(),
      SimaSensors(),
      SimaData(),
    ]);

  // Combine sensors from both sources
  const sensors = [...purpleAirSensors, ...simaSensors];
  const data = [...purpleAirData, ...simaData];

  return (
    <div className="mx-4 flex flex-col space-y-20 pb-32 pt-4 md:mx-16 md:pb-28 md:pt-32 lg:mx-52 lg:pb-20">
      {/* Población general */}
      <div className="flex flex-col">
        {/* Title */}
        <div className="flex justify-center pb-3 text-sm text-gray-400 lg:pb-6">
          POBLACIÓN GENERAL
        </div>
        {/* Air Quality text, recommendation and quality bar */}
        <div className="flex flex-col space-y-2 rounded-lg bg-white px-4 py-5 text-left shadow-lg lg:space-y-4 lg:px-4 lg:py-6">
          <div className="text-sm text-gray-400">
            CALIDAD DEL AIRE AL MOMENTO
          </div>
          <LazyAirQualityWrapper sensors={sensors} data={data} />
        </div>
      </div>
      {/* Población sensible */}
      <div className="flex flex-col">
        {/* Title */}
        <div className="flex justify-center pb-3 text-sm text-gray-400 lg:pb-6">
          POBLACIÓN SENSIBLE
        </div>
        {/* Menores y Adultos Mayores recommendation */}
        <div className="flex flex-col space-y-8 pb-6 lg:flex-row lg:space-x-8 lg:space-y-0 lg:pb-10">
          {/* Menores de 12 */}
          <div className="flex w-full flex-col space-y-2 rounded-lg bg-white p-4 text-left shadow-lg lg:w-1/2 lg:space-y-4 lg:px-4 lg:py-5">
            <Image
              src="/menores.png"
              width={32}
              height={32}
              alt="Menores Icon"
            />
            <div className="font-semibold">Niños menores de 12</div>
            <LazyAirQualityWrapper
              sensors={sensors}
              data={data}
              showMenoresRecommendation
            />
          </div>
          {/* Mayores de 60 años */}
          <div className="flex w-full flex-col space-y-2 rounded-lg bg-white p-4 text-left shadow-lg lg:w-1/2 lg:space-y-4 lg:px-4 lg:py-5">
            <Image
              src="/adultos-mayores.png"
              width={32}
              height={32}
              alt="Adultos mayores Icon"
            />
            <div className="font-semibold">Adultos mayores</div>
            <LazyAirQualityWrapper
              sensors={sensors}
              data={data}
              showAdultosMayoresRecommendation
            />
          </div>
        </div>
        {/* Embarazadas y Enfermedades recommendation */}
        <div className="flex flex-col space-y-8 pb-6 lg:flex-row lg:space-x-8 lg:space-y-0">
          {/* Embarazadas */}
          <div className="flex w-full flex-col space-y-2 rounded-lg bg-white p-4 text-left shadow-lg lg:w-1/2 lg:space-y-4 lg:px-4 lg:py-5">
            <Image
              src="/embarazadas.png"
              width={26}
              height={26}
              alt="Personas Embarazadas Icon"
            />
            <div className="font-semibold">Mujeres embarazadas</div>
            <LazyAirQualityWrapper
              sensors={sensors}
              data={data}
              showEmbarazadasRecommendation
            />
          </div>
          {/* Enfermedades */}
          <div className="flex w-full flex-col space-y-2 rounded-lg bg-white p-4 text-left shadow-lg lg:w-1/2 lg:space-y-4 lg:px-4 lg:py-5">
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
              Si tienes condiciones cardiovasculares o respiratorias
            </div>
            <LazyAirQualityWrapper
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
        <div className="flex justify-center pb-3 text-sm text-gray-400 lg:pb-6">
          TU UBICACIÓN Y HORA
        </div>
        {/* Cards */}
        <div className="flex flex-col space-y-8 md:flex-row md:space-x-8 md:space-y-0">
          {/* Ubicación */}
          <div className="flex flex-col space-y-4 rounded-lg bg-white p-4 text-sm shadow-lg md:w-2/3">
            <div className="flex items-center">
              <Navigation className="mr-2" />
              <span>Tu ubicación</span>
            </div>
            <LazyAirQualityWrapper sensors={sensors} data={data} showAddress />
          </div>
          {/* Hora */}
          <div className="flex flex-col space-y-4 rounded-lg bg-white p-4 text-sm shadow-lg md:w-1/3">
            <div className="flex items-center">
              <Clock className="mr-2" />
              <span>Última medición</span>
            </div>
            <div className="flex">
              <LazyAirQualityWrapper sensors={sensors} data={data} showTime />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
