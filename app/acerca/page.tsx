import Questions from "@/components/acerca/questions";
import Image from "next/image";
import Link from "next/link";

export default function Acerca() {
  return (
    <div className="mx-4 flex min-h-screen flex-col pb-14 pt-4 md:mx-16 md:pt-8 lg:mx-36 lg:pb-10 lg:pt-6">
      {/* Preguntas Frecuentes */}
      <div className="mb-10 flex flex-col md:mb-16 lg:mb-20">
        {/* Header */}
        <h1 className="pt-4 text-3xl font-bold md:pt-7">
          Preguntas Frecuentes
        </h1>
        {/* Questions */}
        <Questions />
      </div>
      {/* Footer */}
      <div className="flex flex-col items-center justify-center text-base md:flex-row md:items-center md:justify-between">
        {/* Un proyecto del OCCAMM */}
        <div className="flex flex-col items-center md:flex-row md:items-center">
          <div className="hidden text-gray-400 md:mr-2 md:block">
            Un proyecto del
          </div>
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
              className="md:-ml-4"
            />
          </a>
        </div>
      </div>
    </div>
  );
}
