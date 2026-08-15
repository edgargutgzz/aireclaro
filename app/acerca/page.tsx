import type { Metadata } from "next";
import Questions from "@/components/acerca/questions";

export const metadata: Metadata = {
  title: "Acerca",
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
import Image from "next/image";
import Link from "next/link";

export default function Acerca() {
  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 3.5rem - env(safe-area-inset-bottom, 0px))' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="container mx-auto max-w-2xl flex-1 overflow-y-auto px-4 pb-10 pt-6 md:pt-14">

        {/* Observatorio card */}
        <div className="mb-10 rounded-xl bg-gray-50 px-4 py-4">
          <div className="flex flex-col gap-4">
            <Link href="https://observatoriodelaire.com" target="_blank" className="inline-block flex-shrink-0 transition-opacity hover:opacity-75">
              <Image
                src="/occamm-logo.png"
                alt="Observatorio del Aire Logo"
                width={140}
                height={55}
                className="h-auto"
              />
            </Link>
            <p className="text-sm leading-relaxed text-gray-500">
              Aire Claro es una plataforma del Observatorio Ciudadano de la Calidad
              del Aire, una organización de la sociedad civil dedicada a generar
              esfuerzos colaborativos y fundamento técnico para mejorar la calidad
              del aire en Nuevo León.
            </p>
            <Link
              href="https://observatoriodelaire.com"
              target="_blank"
              className="text-sm text-gray-400 underline underline-offset-4 hover:text-gray-600"
            >
              observatoriodelaire.com
            </Link>
          </div>
        </div>

        {/* FAQ section */}
        <Questions />


      </div>

      <div className="border-t border-gray-100 px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/aviso-privacidad" className="text-xs text-gray-400 underline underline-offset-4 hover:text-gray-600">
            Aviso de Privacidad
          </Link>
          <Link href="https://datacomun.com" target="_blank" className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
            <span className="text-gray-400">Desarrollado por</span>
            <span><span style={{ color: "#0f172a" }}>data</span><span className="datacomun-comun">comun</span></span>
          </Link>
        </div>
      </div>

    </div>
  );
}
