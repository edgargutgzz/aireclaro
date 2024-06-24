import { Button } from "@/components/ui/button";
import { ArrowDownToLine } from "lucide-react";

export default function Datos() {
  return (
    <div className="mx-4 flex flex-col pb-20 pt-4 md:mx-16 md:pb-28 md:pt-8 lg:mx-36 lg:pb-8 lg:pt-6">
      {/* Datos */}
      <div className="mb-10 flex flex-col md:mb-16 lg:mb-20">
        {/* Header */}
        <h1 className="py-4 text-2xl font-bold md:text-3xl lg:py-6">
          Apertura de Información
        </h1>
        {/* Header */}
        <p className="py-4 text-justify">
          Buscamos impulsar la transparencia y la participación ciudadana en la
          toma de decisiones sobre la calidad del aire que respiramos. Por esa
          razon es que publicamos todos los datos que se recolectan cada hora a
          través de los sensores ubicados en Monterrey y Saltillo.
        </p>
        {/* Button */}
        <div className="flex justify-end py-6">
          <Button>
            <ArrowDownToLine className="mr-2 h-4 w-4" /> Descargar
          </Button>
        </div>
      </div>
    </div>
  );
}
