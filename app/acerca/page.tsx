import Questions from "@/components/acerca/questions";
import Image from "next/image";

export default function Acerca() {
  return (
    <div className="mx-4 flex min-h-screen flex-col pb-20 pt-4 md:mx-16 md:pb-28 md:pt-8 lg:mx-36 lg:pb-0 lg:pt-6">
      {/* Preguntas Frecuentes */}
      <div className="mb-10 flex flex-col md:mb-16 lg:mb-20">
        {/* Header */}
        <h1 className="pt-4 text-3xl font-bold md:pt-7">
          Preguntas Frecuentes
        </h1>
        {/* Questions */}
        <Questions />
      </div>
      {/* Un proyecto del OCCAMM */}
      <div className="flex items-center justify-start text-xs md:text-base lg:pb-12">
        <div className="text-gray-400">Un proyecto del</div>
        <a
          href="https://observatoriodelaire.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src="/logo-occamm.png"
            alt="Observatorio del Aire Logo"
            width={290}
            height={100}
            className="md:-ml-5"
          />
        </a>
      </div>
    </div>
  );
}
