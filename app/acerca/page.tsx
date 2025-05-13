import Questions from "@/components/acerca/questions";
import Image from "next/image";

export default function Acerca() {
  return (
    <div className="mx-4 flex min-h-screen flex-col py-8 md:mx-16 md:py-12 lg:mx-36">
      {/* Header */}
      <h1 className="mb-8 text-3xl font-bold md:mb-10">Preguntas Frecuentes</h1>

      {/* Questions */}
      <Questions />

      {/* Footer */}
      <div className="mt-12 flex flex-col items-center md:mt-16 md:flex-row md:items-center md:justify-center">
        <div className="mb-2 text-gray-400 md:mb-0 md:mr-2">
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
  );
}
