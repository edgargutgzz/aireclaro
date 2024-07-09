import PurpleAirSensors from "@/components/data/purple-air-sensors";
import PurpleAirData from "@/components/data/purple-air-data";
import SimaSensors from "@/components/data/sima-sensors";
import SimaData from "@/components/data/sima-data";
import AirQuality from "@/components/inicio/air-quality";
import { Navigation, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function Inicio() {
  const purpleAirSensors = await PurpleAirSensors();
  const purpleAirData = await PurpleAirData();
  const simaSensors = await SimaSensors();
  const simaData = await SimaData();

  // Combine sensors from both sources
  const sensors = [...purpleAirSensors, ...simaSensors];
  const data = [...purpleAirData, ...simaData];

  return (
    <div className="mx-4 flex flex-col space-y-10 pb-20 pt-4 md:mx-16 md:pb-28 lg:mx-36 lg:pb-20 lg:pt-10">
      {/* Calidad del Aire */}
      <div className="flex flex-col">
        {/* Title */}
        <div className="flex justify-center pb-3 text-sm text-gray-400 lg:pb-6">
          POBLACIÓN GENERAL
        </div>
        {/* Air Quality text, recommendation and quality bar */}
        <div className="flex flex-col space-y-2 rounded-lg bg-white px-4 py-5 text-left shadow-lg lg:space-y-4 lg:px-4 lg:py-6">
          <div className="text-sm text-gray-400">CALIDAD DEL AIRE</div>
          <AirQuality sensors={sensors} data={data} />
        </div>
      </div>
      {/* Pronostico por Hora */}
      <div className="flex flex-col">
        <div className="flex flex-col space-y-4 rounded-lg bg-white px-4 pb-2 pt-5 text-left shadow-lg lg:space-y-4 lg:px-4 lg:py-6">
          <div className="text-sm text-gray-400">PRONÓSTICO POR HORA</div>
          <div className="flex space-x-8 overflow-x-auto pb-5">
            <div className="flex flex-col items-center space-y-4">
              <div>Ahora</div>
              <div className="h-3 w-10 rounded-full bg-yellow-400"></div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div>11</div>
              <div className="h-3 w-10 rounded-full bg-orange-400"></div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div>12</div>
              <div className="h-3 w-10 rounded-full bg-red-400"></div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div>13</div>
              <div className="h-3 w-10 rounded-full bg-red-400"></div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div>14</div>
              <div className="h-3 w-10 rounded-full bg-red-400"></div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div>15</div>
              <div className="h-3 w-10 rounded-full bg-orange-400"></div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div>16</div>
              <div className="h-3 w-10 rounded-full bg-orange-400"></div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div>17</div>
              <div className="h-3 w-10 rounded-full bg-yellow-400"></div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div>18</div>
              <div className="h-3 w-10 rounded-full bg-yellow-400"></div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div>19</div>
              <div className="h-3 w-10 rounded-full bg-green-400"></div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div>20</div>
              <div className="h-3 w-10 rounded-full bg-green-400"></div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div>21</div>
              <div className="h-3 w-10 rounded-full bg-green-400"></div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div>22</div>
              <div className="h-3 w-10 rounded-full bg-green-400"></div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div>23</div>
              <div className="h-3 w-10 rounded-full bg-green-400"></div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div>0</div>
              <div className="h-3 w-10 rounded-full bg-green-400"></div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div>1</div>
              <div className="h-3 w-10 rounded-full bg-green-400"></div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div>2</div>
              <div className="h-3 w-10 rounded-full bg-green-400"></div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div>3</div>
              <div className="h-3 w-10 rounded-full bg-green-400"></div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div>4</div>
              <div className="h-3 w-10 rounded-full bg-green-400"></div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div>5</div>
              <div className="h-3 w-10 rounded-full bg-green-400"></div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div>6</div>
              <div className="h-3 w-10 rounded-full bg-green-400"></div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div>7</div>
              <div className="h-3 w-10 rounded-full bg-yellow-400"></div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div>8</div>
              <div className="h-3 w-10 rounded-full bg-yellow-400"></div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div>9</div>
              <div className="h-3 w-10 rounded-full bg-yellow-400"></div>
            </div>
          </div>
        </div>
      </div>
      {/* Pronostico Diario */}
      <div className="flex flex-col">
        <div className="flex flex-col space-y-4 rounded-lg bg-white px-4 pb-2 pt-5 text-left shadow-lg lg:space-y-4 lg:px-4 lg:py-6">
          <div className="text-sm text-gray-400">PRONÓSTICO DIARIO</div>
          <div className="flex flex-col space-y-8 pb-5">
            <Button variant="ghost" className="flex items-center space-x-10">
              <div className="w-4/12">Hoy</div>
              <div className="h-3 w-8/12 rounded-full bg-yellow-400"></div>
            </Button>
            <Button variant="ghost" className="flex items-center space-x-10">
              <div className="w-4/12">Martes</div>
              <div className="h-3 w-8/12 rounded-full bg-yellow-400"></div>
            </Button>
            <Button variant="ghost" className="flex items-center space-x-10">
              <div className="w-4/12">Miércoles</div>
              <div className="h-3 w-8/12 rounded-full bg-green-400"></div>
            </Button>
            <Button variant="ghost" className="flex items-center space-x-10">
              <div className="w-4/12">Jueves</div>
              <div className="h-3 w-8/12 rounded-full bg-orange-400"></div>
            </Button>
            <Button variant="ghost" className="flex items-center space-x-10">
              <div className="w-4/12">Viernes</div>
              <div className="h-3 w-8/12 rounded-full bg-green-400"></div>
            </Button>
            <Button variant="ghost" className="flex items-center space-x-10">
              <div className="w-4/12">Sábado</div>
              <div className="h-3 w-8/12 rounded-full bg-green-400"></div>
            </Button>
            <Button variant="ghost" className="flex items-center space-x-10">
              <div className="w-4/12">Domingo</div>
              <div className="h-3 w-8/12 rounded-full bg-green-400"></div>
            </Button>
            <Button variant="ghost" className="flex items-center space-x-10">
              <div className="w-4/12">Lunes</div>
              <div className="h-3 w-8/12 rounded-full bg-orange-400"></div>
            </Button>
            <Button variant="ghost" className="flex items-center space-x-10">
              <div className="w-4/12">Martes</div>
              <div className="h-3 w-8/12 rounded-full bg-red-400"></div>
            </Button>
          </div>
        </div>
      </div>
      {/* Ubicación y Hora */}
      <div className="flex flex-col">
        {/* Title */}
        <div className="flex justify-center pb-3 text-sm text-gray-400 lg:pb-6">
          UBICACIÓN Y HORA
        </div>
        {/* Cards */}
        <div className="flex flex-col space-y-8 md:flex-row md:space-x-8 md:space-y-0">
          {/* Ubicación */}
          <div className="flex flex-col space-y-4 rounded-lg bg-white p-4 text-sm shadow-lg md:w-2/3">
            <Navigation />
            <AirQuality sensors={sensors} data={data} showAddress />
          </div>
          {/* Hora */}
          <div className="flex flex-col space-y-4 rounded-lg bg-white p-4 text-sm shadow-lg md:w-1/3">
            <Clock />
            <div className="flex">
              <div className="pr-1">Actualizado a las</div>
              <AirQuality sensors={sensors} data={data} showTime />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
