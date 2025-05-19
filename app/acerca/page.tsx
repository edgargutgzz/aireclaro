import Questions from "@/components/acerca/questions";
import Image from "next/image";

export default function Acerca() {
  return (
    <div className="mx-4 flex flex-col pb-4 pt-8 md:mx-16 md:py-12 md:pb-10 lg:mx-52">
      {/* Header */}
      <h1 className="pb-4 text-3xl font-bold md:mb-10">Preguntas Frecuentes</h1>

      {/* Questions */}
      <Questions />

      {/* Footer */}
      <div className="mt-10 flex flex-row items-center justify-start md:mt-16">
        <div className="ml-4 text-sm text-gray-400 md:ml-0 md:text-base">
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
            className="w-[240px] md:w-[320px]"
          />
        </a>
      </div>
    </div>
  );
}
