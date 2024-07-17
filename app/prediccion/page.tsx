import PurpleAirSensors from "@/components/data/purple-air-sensors";
import PurpleAirData from "@/components/data/purple-air-data";
import SimaSensors from "@/components/data/sima-sensors";
import SimaData from "@/components/data/sima-data";
import AirQuality from "@/components/inicio/air-quality";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Chart } from "@/components/prediccion/chart";
import Image from "next/image";

export default async function Inicio() {
  const purpleAirSensors = await PurpleAirSensors();
  const purpleAirData = await PurpleAirData();
  const simaSensors = await SimaSensors();
  const simaData = await SimaData();

  // Combine sensors from both sources
  const sensors = [...purpleAirSensors, ...simaSensors];
  const data = [...purpleAirData, ...simaData];

  return (
    <div className="mx-4 flex flex-col pb-20 pt-10 md:mx-16 md:pb-28 lg:mx-36 lg:pb-20 lg:pt-10">
      {/* Calidad del Aire */}
      <div className="flex flex-col">
        {/* Air Quality text, recommendation and quality bar */}
        <div className="mb-28 flex flex-col space-y-4 rounded-lg bg-white px-4 py-4 text-left shadow-lg lg:space-y-4 lg:px-4 lg:py-6">
          <div className="text-sm text-gray-400">CALIDAD DEL AIRE</div>
          <AirQuality sensors={sensors} data={data} />
        </div>
      </div>
      {/* Pronostico por Hora */}
      <div className="flex flex-col">
        <div className="mb-10 flex flex-col space-y-4 rounded-lg bg-white px-4 pt-4 text-left shadow-lg lg:space-y-4 lg:px-4 lg:py-6">
          <div className="text-sm text-gray-400">PRONÓSTICO POR HORA</div>
          <Drawer>
            <DrawerTrigger>
              <div className="flex space-x-7 overflow-x-auto pb-4">
                <div className="flex flex-col items-center space-y-4">
                  <div>Ahora</div>
                  <div className="h-2 w-6 rounded-full bg-orange-400"></div>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <div>11</div>
                  <div className="h-2 w-6 rounded-full bg-orange-400"></div>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <div>12</div>
                  <div className="h-2 w-6 rounded-full bg-red-400"></div>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <div>13</div>
                  <div className="h-2 w-6 rounded-full bg-red-400"></div>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <div>14</div>
                  <div className="h-2 w-6 rounded-full bg-red-400"></div>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <div>15</div>
                  <div className="h-2 w-6 rounded-full bg-orange-400"></div>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <div>16</div>
                  <div className="h-2 w-6 rounded-full bg-orange-400"></div>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <div>17</div>
                  <div className="h-2 w-6 rounded-full bg-yellow-400"></div>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <div>18</div>
                  <div className="h-2 w-6 rounded-full bg-yellow-400"></div>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <div>19</div>
                  <div className="h-2 w-6 rounded-full bg-green-400"></div>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <div>20</div>
                  <div className="h-2 w-6 rounded-full bg-green-400"></div>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <div>21</div>
                  <div className="h-2 w-6 rounded-full bg-green-400"></div>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <div>22</div>
                  <div className="h-2 w-6 rounded-full bg-green-400"></div>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <div>23</div>
                  <div className="h-2 w-6 rounded-full bg-green-400"></div>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <div>0</div>
                  <div className="h-2 w-6 rounded-full bg-green-400"></div>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <div>1</div>
                  <div className="h-2 w-6 rounded-full bg-green-400"></div>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <div>2</div>
                  <div className="h-2 w-6 rounded-full bg-green-400"></div>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <div>3</div>
                  <div className="h-2 w-6 rounded-full bg-green-400"></div>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <div>4</div>
                  <div className="h-2 w-6 rounded-full bg-green-400"></div>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <div>5</div>
                  <div className="h-2 w-6 rounded-full bg-green-400"></div>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <div>6</div>
                  <div className="h-2 w-6 rounded-full bg-green-400"></div>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <div>7</div>
                  <div className="h-2 w-6 rounded-full bg-yellow-400"></div>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <div>8</div>
                  <div className="h-2 w-6 rounded-full bg-yellow-400"></div>
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <div>9</div>
                  <div className="h-2 w-6 rounded-full bg-yellow-400"></div>
                </div>
              </div>
            </DrawerTrigger>
            <DrawerContent className="flex h-[90%] flex-col bg-gray-50">
              <DrawerHeader>
                <DrawerDescription>
                  <div className="mb-28 flex flex-col space-y-2 rounded-lg bg-white px-4 py-4 text-left text-black shadow-lg lg:space-y-4 lg:px-4 lg:py-6">
                    <div className="text-xs text-gray-400">
                      CALIDAD DEL AIRE
                    </div>
                    <div className="text-3xl font-semibold lg:text-5xl">
                      Mala
                    </div>
                    <div className="lg:text-lg">
                      Es posible realizar actividades al aire libre. Si
                      presentas síntomas como tos o falta de aire, toma más
                      descansos y realiza actividades menos vigorosas.
                    </div>
                  </div>
                </DrawerDescription>
              </DrawerHeader>
              <DrawerFooter className="flex flex-grow overflow-y-auto px-4">
                <Chart />
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
      {/* Pronostico Diario */}
      <div className="flex flex-col">
        <div className="mb-10 flex flex-col space-y-4 rounded-lg bg-white px-4 py-4 text-left shadow-lg lg:space-y-4 lg:px-4 lg:py-6">
          <div className="text-sm text-gray-400">PRONÓSTICO DIARIO</div>
          <div className="flex flex-col space-y-5">
            {/* Hoy */}
            <Drawer>
              <DrawerTrigger>
                <div className="flex items-center space-x-10">
                  <div className="w-4/12 text-left text-base font-normal">
                    Hoy
                  </div>
                  <div className="h-2 w-8/12 rounded-full bg-green-400"></div>
                </div>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Are you absolutely sure?</DrawerTitle>
                  <DrawerDescription>
                    This action cannot be undone.
                  </DrawerDescription>
                </DrawerHeader>
                <DrawerFooter>
                  <Button>Submit</Button>
                  <DrawerClose>
                    <Button variant="outline">Cancel</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
            {/* Martes */}
            <Drawer>
              <DrawerTrigger>
                <div className="flex items-center space-x-10">
                  <div className="w-4/12 text-left text-base font-normal">
                    Martes
                  </div>
                  <div className="h-2 w-8/12 rounded-full bg-yellow-400"></div>
                </div>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Are you absolutely sure?</DrawerTitle>
                  <DrawerDescription>
                    This action cannot be undone.
                  </DrawerDescription>
                </DrawerHeader>
                <DrawerFooter>
                  <Button>Submit</Button>
                  <DrawerClose>
                    <Button variant="outline">Cancel</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
            {/* Miércoles */}
            <Drawer>
              <DrawerTrigger>
                <div className="flex items-center space-x-10">
                  <div className="w-4/12 text-left text-base font-normal">
                    Miércoles
                  </div>
                  <div className="h-2 w-8/12 rounded-full bg-orange-400"></div>
                </div>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Are you absolutely sure?</DrawerTitle>
                  <DrawerDescription>
                    This action cannot be undone.
                  </DrawerDescription>
                </DrawerHeader>
                <DrawerFooter>
                  <Button>Submit</Button>
                  <DrawerClose>
                    <Button variant="outline">Cancel</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
            {/* Jueves */}
            <Drawer>
              <DrawerTrigger>
                <div className="flex items-center space-x-10">
                  <div className="w-4/12 text-left text-base font-normal">
                    Jueves
                  </div>
                  <div className="h-2 w-8/12 rounded-full bg-orange-400"></div>
                </div>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Are you absolutely sure?</DrawerTitle>
                  <DrawerDescription>
                    This action cannot be undone.
                  </DrawerDescription>
                </DrawerHeader>
                <DrawerFooter>
                  <Button>Submit</Button>
                  <DrawerClose>
                    <Button variant="outline">Cancel</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
            {/* Viernes */}
            <Drawer>
              <DrawerTrigger>
                <div className="flex items-center space-x-10">
                  <div className="w-4/12 text-left text-base font-normal">
                    Viernes
                  </div>
                  <div className="h-2 w-8/12 rounded-full bg-red-400"></div>
                </div>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Are you absolutely sure?</DrawerTitle>
                  <DrawerDescription>
                    This action cannot be undone.
                  </DrawerDescription>
                </DrawerHeader>
                <DrawerFooter>
                  <Button>Submit</Button>
                  <DrawerClose>
                    <Button variant="outline">Cancel</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
            {/* Sábado */}
            <Drawer>
              <DrawerTrigger>
                <div className="flex items-center space-x-10">
                  <div className="w-4/12 text-left text-base font-normal">
                    Sábado
                  </div>
                  <div className="h-2 w-8/12 rounded-full bg-purple-400"></div>
                </div>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Are you absolutely sure?</DrawerTitle>
                  <DrawerDescription>
                    This action cannot be undone.
                  </DrawerDescription>
                </DrawerHeader>
                <DrawerFooter>
                  <Button>Submit</Button>
                  <DrawerClose>
                    <Button variant="outline">Cancel</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
            {/* Domingo */}
            <Drawer>
              <DrawerTrigger>
                <div className="flex items-center space-x-10">
                  <div className="w-4/12 text-left text-base font-normal">
                    Domingo
                  </div>
                  <div className="h-2 w-8/12 rounded-full bg-red-400"></div>
                </div>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Are you absolutely sure?</DrawerTitle>
                  <DrawerDescription>
                    This action cannot be undone.
                  </DrawerDescription>
                </DrawerHeader>
                <DrawerFooter>
                  <Button>Submit</Button>
                  <DrawerClose>
                    <Button variant="outline">Cancel</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
            {/* Lunes */}
            <Drawer>
              <DrawerTrigger>
                <div className="flex items-center space-x-10">
                  <div className="w-4/12 text-left text-base font-normal">
                    Lunes
                  </div>
                  <div className="h-2 w-8/12 rounded-full bg-orange-400"></div>
                </div>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Are you absolutely sure?</DrawerTitle>
                  <DrawerDescription>
                    This action cannot be undone.
                  </DrawerDescription>
                </DrawerHeader>
                <DrawerFooter>
                  <Button>Submit</Button>
                  <DrawerClose>
                    <Button variant="outline">Cancel</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
            {/* Martes */}
            <Drawer>
              <DrawerTrigger>
                <div className="flex items-center space-x-10">
                  <div className="w-4/12 text-left text-base font-normal">
                    Martes
                  </div>
                  <div className="h-2 w-8/12 rounded-full bg-green-400"></div>
                </div>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Are you absolutely sure?</DrawerTitle>
                  <DrawerDescription>
                    This action cannot be undone.
                  </DrawerDescription>
                </DrawerHeader>
                <DrawerFooter>
                  <Button>Submit</Button>
                  <DrawerClose>
                    <Button variant="outline">Cancel</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
      </div>
      {/* Ubicación y Hora */}
      <div className="flex flex-col">
        {/* Cards */}
        <div className="flex flex-col md:flex-row md:space-x-8 md:space-y-0">
          {/* Ubicación */}
          <div className="mb-10 flex flex-col space-y-2 rounded-lg bg-white p-4 text-sm shadow-lg md:w-2/3">
            <div className="text-sm text-gray-400">UBICACIÓN</div>
            <AirQuality sensors={sensors} data={data} showAddress />
          </div>
          {/* Hora */}
          <div className="flex flex-col space-y-2 rounded-lg bg-white p-4 text-sm shadow-lg md:w-1/3">
            <div className="text-sm text-gray-400">HORA</div>
            <div className="flex">
              <div className="pr-1">Actualizada a las</div>
              <AirQuality sensors={sensors} data={data} showTime />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
