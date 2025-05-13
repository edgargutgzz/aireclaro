import Questions from "@/components/acerca/questions";
import Image from "next/image";

export default function Acerca() {
  return (
    <div className="mx-4 flex min-h-screen flex-col py-8 pb-24 md:mx-16 md:py-12 md:pb-10 lg:mx-36">
      {/* Header */}
      <h1 className="mb-8 text-3xl font-bold md:mb-10">Preguntas Frecuentes</h1>

      {/* Questions */}
      <Questions />

      {/* Footer */}
      <div className="mt-12 flex justify-center md:mt-16">
        <div className="flex flex-row items-center whitespace-nowrap">
          <div className="mr-2 text-sm text-gray-400 sm:mr-3 sm:text-base">
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
              className="-ml-2 w-[180px] sm:-ml-4 sm:w-[240px] md:w-[290px]"
            />
          </a>
        </div>
      </div>
    </div>
  );
}
