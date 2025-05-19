import Questions from "@/components/acerca/questions";
import Image from "next/image";

export default function Acerca() {
  return (
    <div className="mx-4 flex flex-col py-8 pb-0 md:mx-16 md:py-12 md:pb-10 lg:mx-52">
      {/* Header */}
      <h1 className="mb-6 text-3xl font-bold md:mb-10">Preguntas Frecuentes</h1>

      {/* Questions */}
      <Questions />

      {/* Footer */}
      <div className="mt-12 flex flex-row items-center justify-start md:mt-16">
        <div className="ml-2 text-sm text-gray-400 md:ml-0 md:text-base">
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
            className="w-[200px] md:w-[260px]"
          />
        </a>
      </div>
    </div>
  );
}
