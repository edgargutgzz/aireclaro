import Questions from "@/components/acerca/questions";
import Equipo from "@/components/acerca/equipo";
import Image from "next/image";

export default function Acerca() {
  return (
    <div className="mx-4 flex flex-col pb-20 pt-6 md:mx-20 md:pb-28 md:pt-8 lg:mx-36 lg:pb-8 lg:pt-6">
      {/* Preguntas Frecuentes */}
      <div className="mb-10 flex flex-col md:mb-16 lg:mb-20">
        {/* Header */}
        <h1 className="py-4 text-2xl font-bold md:text-3xl lg:py-6">
          Preguntas Frecuentes
        </h1>
        {/* Questions */}
        <Questions />
      </div>
      {/* Equipo */}
      <div className="mb-20 flex flex-col md:mb-32">
        {/* Header */}
        <h1 className="py-4 text-2xl font-bold md:text-3xl lg:py-6">Equipo</h1>
        {/* Integrantes */}
        <Equipo />
      </div>
      {/* Un proyecto del OCCAMM */}
      <div className="flex items-center justify-center py-4 text-sm md:text-base lg:py-6">
        <div className="text-gray-400">Un proyecto del</div>
        <Image
          src="/logo-occamm.png"
          alt="Observatorio del Aire Logo"
          width={150}
          height={28}
          className="ml-5 md:ml-7 md:h-[38px] lg:w-[200px]"
        />
      </div>
    </div>
  );
}
