import Questions from "@/components/acerca/questions";
import Footer from "@/components/footer/footer";
import Image from "next/image";
import Link from "next/link";

export default function Acerca() {
  return (
    <div>
      <div className="container mx-auto max-w-6xl px-4 pb-16 pt-16 md:pt-28">
      <h1 className="mb-16 text-5xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
        Preguntas Frecuentes
      </h1>
      <Questions />

      {/* Observatorio Section */}
      <div className="mt-20 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:gap-12">
          <div className="flex-shrink-0">
            <Link href="https://observatoriodelaire.com" target="_blank" className="inline-block transition-opacity hover:opacity-75">
              <Image
                src="/occamm-logo.png"
                alt="Observatorio del Aire Logo"
                width={180}
                height={70}
                className="h-auto"
              />
            </Link>
          </div>
          <div className="h-px w-full bg-gray-200 md:h-12 md:w-px" />
          <div className="flex flex-col gap-4">
            <p className="text-base leading-relaxed text-gray-500">
              Aire Claro es una plataforma del Observatorio Ciudadano de la
              Calidad del Aire, una organización de la sociedad civil dedicada a
              generar esfuerzos colaborativos y fundamento técnico para mejorar
              la calidad del aire en Nuevo León.
            </p>
            <Link
              href="https://observatoriodelaire.com"
              target="_blank"
              className="w-fit text-sm text-gray-400 underline underline-offset-4 hover:text-gray-600"
            >
              observatoriodelaire.com
            </Link>
          </div>
        </div>
      </div>

      </div>
      <Footer />
    </div>
  );
}
