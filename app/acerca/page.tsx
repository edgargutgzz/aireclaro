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
      <div className="mt-12 flex flex-col items-center md:mt-16">
        <div className="flex items-center justify-center">
          <div className="mr-2 text-gray-400">Un proyecto del</div>
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
              className="-ml-4"
            />
          </a>
        </div>
      </div>
    </div>
  );
}
