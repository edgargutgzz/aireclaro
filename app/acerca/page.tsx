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
      <div className="mt-12 flex justify-center md:mt-16">
        <div className="flex flex-col items-center sm:flex-row sm:items-center sm:whitespace-nowrap">
          <div className="mb-2 text-center text-gray-400 sm:mb-0 sm:mr-3">
            Un proyecto del
          </div>
          <a
            href="https://observatoriodelaire.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex justify-center"
          >
            <Image
              src="/logo-occamm.png"
              alt="Observatorio del Aire Logo"
              width={240}
              height={80}
              className="w-[220px] sm:-ml-4 sm:w-[290px]"
            />
          </a>
        </div>
      </div>
    </div>
  );
}
