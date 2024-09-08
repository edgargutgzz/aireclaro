import Questions from "@/components/acerca/questions";
import Image from "next/image";

export default function Acerca() {
  return (
    <div className="mx-4 flex min-h-screen flex-col pb-14 pt-4 md:mx-16 md:pt-8 lg:mx-36 lg:pb-10 lg:pt-6">
      {/* Video */}
      <div className="mb-10 flex justify-center">
        <iframe
          width="560"
          height="315"
          src="https://www.youtube.com/embed/zUt6HwlZB08?si=z6mAQ8bkuVx25QsP"
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-64 w-full rounded-lg md:h-96"
        ></iframe>
      </div>
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
      <div className="flex flex-col items-center justify-start text-base md:flex-row">
        <div className="hidden text-gray-400 md:block">Un proyecto del</div>
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
