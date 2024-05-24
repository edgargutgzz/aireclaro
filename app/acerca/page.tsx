import Questions from "@/components/acerca/questions";
import Equipo from "@/components/acerca/equipo";
import Image from "next/image";

export default function Acerca() {
  return (
    <div className="mx-4 flex flex-col space-y-10 py-16 lg:mx-40 lg:space-y-20">
      {/* Video */}
      <div className="pb-4">
        <iframe
          src="https://www.youtube.com/embed/B7fKs4dTeu0?si=4Mw_dG18vhEHvijY"
          title="Aire Claro"
          allowFullScreen
          className="h-96 w-full rounded-xl shadow-lg"
        ></iframe>
      </div>
      {/* Preguntas Frecuentes */}
      <div className="space-y-5 lg:space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">
            Preguntas Frecuentes
          </h1>
        </div>
        {/* Questions */}
        <div>
          <Questions />
        </div>
      </div>
      {/* Equipo */}
      <div className="space-y-5 lg:space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">Equipo</h1>
        </div>
        {/* Integrantes */}
        <div>
          <Equipo />
        </div>
      </div>
      {/* Footer */}
      <div className="flex items-center justify-center pt-10 text-center text-sm lg:pt-20">
        <div className="text-gray-400">Un proyecto del</div>
        <div>
          <Image
            src="/logo-occamm.png"
            alt="Observatorio del Aire"
            width={200}
            height={37}
            className="ml-4"
          />
        </div>
      </div>
    </div>
  );
}
