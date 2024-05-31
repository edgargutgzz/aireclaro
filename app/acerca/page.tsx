import Questions from "@/components/acerca/questions";
import Equipo from "@/components/acerca/equipo";
import Image from "next/image";

export default function Acerca() {
  return (
    <div className="mx-4 flex flex-col space-y-10 pb-16 pt-6 lg:mx-40 lg:space-y-20">
      {/* Preguntas Frecuentes */}
      <div className="flex flex-col bg-red-100">
        {/* Header */}
        <h1 className="bg-blue-100 py-4 text-2xl font-bold lg:text-3xl">
          Preguntas Frecuentes
        </h1>
        {/* Questions */}
        <Questions />
      </div>
      {/* Equipo */}
      <div className="flex flex-col bg-blue-100">
        {/* Header */}
        <h1 className="bg-red-100 py-4 text-2xl font-bold lg:text-3xl">
          Equipo
        </h1>
        {/* Integrantes */}
        <Equipo />
      </div>
      {/* Footer */}
      <div className="flex items-center justify-center bg-red-100 py-4 text-sm lg:pt-20">
        <div className="text-gray-400">Un proyecto del</div>
        <Image
          src="/logo-occamm.png"
          alt="Observatorio del Aire"
          width={180}
          height={33}
          className="ml-4"
        />
      </div>
    </div>
  );
}
