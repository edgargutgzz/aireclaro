import type { Metadata } from "next";
import Questions from "@/components/acerca/questions";

export const metadata: Metadata = {
  title: "Preguntas Frecuentes",
  description:
    "Conoce cómo funciona Aire Claro, qué datos utiliza y quién está detrás del monitoreo de calidad del aire en Monterrey y Zona Metropolitana.",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Qué es Aire Claro?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Aire Claro es una plataforma que brinda información sobre la calidad del aire que respiramos en la Zona Metropolitana de Monterrey y Saltillo.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cuál es la diferencia con otras aplicaciones de iPhone o Android?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Aire Claro se enfoca exclusivamente en la Zona Metropolitana de Monterrey y Saltillo, combinando datos de estaciones oficiales y sensores ciudadanos para brindar la cobertura más completa de la región.",
      },
    },
    {
      "@type": "Question",
      name: "¿Quién mantiene la plataforma?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "El Observatorio Ciudadano de la Calidad del Aire (OCCAMM). Puedes conocer más en observatoriodelaire.com.",
      },
    },
    {
      "@type": "Question",
      name: "¿Qué información utiliza Aire Claro para medir la calidad del aire?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Utiliza las estaciones de monitoreo SIMA de la Secretaría de Medio Ambiente de Nuevo León y la red de sensores ciudadanos de PurpleAir.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cuál es el principal contaminante que mide Aire Claro?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Aire Claro mide las concentraciones promedio de la última hora de PM2.5 (partículas respirables finas) y el riesgo a la salud asociado, con base en el Índice de Aire y Salud mexicano (NOM-172-SEMARNAT-2023).",
      },
    },
    {
      "@type": "Question",
      name: "¿Recolecta Aire Claro información sobre mí al utilizar la plataforma?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Aire Claro utiliza tu ubicación al inicio para recomendarte el sensor más cercano y proporcionarte información precisa sobre la calidad del aire en tu área.",
      },
    },
    {
      "@type": "Question",
      name: "¿Puedo descargar los datos de calidad del aire?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. Puedes descargar el historial completo en datamx.io/dataset/calidad-del-aire-en-la-zona-metropolitana-de-monterrey.",
      },
    },
    {
      "@type": "Question",
      name: "Tengo más preguntas, ¿cómo los contacto?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Envíanos un correo a contacto@observatoriodelaire.com.",
      },
    },
  ],
};
import Footer from "@/components/footer/footer";
import Image from "next/image";
import Link from "next/link";

export default function Acerca() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="container mx-auto max-w-6xl px-4 pb-20 pt-16 md:pt-28">
      {/* Observatorio Section */}
      <div className="mb-16 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
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

      <h1 className="mb-16 text-5xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
        Preguntas Frecuentes
      </h1>
      <Questions />

      </div>
      <Footer />
    </div>
  );
}
