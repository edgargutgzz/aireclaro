"use client";

import React, { useState, JSX } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

// FAQ content
const faqData = [
  {
    question: "¿Qué es Aire Claro?",
    answer: (
      <div>
        <p className="mb-4">
          Aire Claro es una plataforma que brinda información sobre la calidad
          del aire que respiramos en la Zona Metropolitana de Monterrey.
        </p>
        <div className="mt-6 flex justify-center">
          <iframe
            width="560"
            height="315"
            src="https://www.youtube.com/embed/zUt6HwlZB08?si=z6mAQ8bkuVx25QsP"
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className="h-64 w-full rounded-lg md:h-96"
          />
        </div>
      </div>
    ),
  },
  {
    question:
      "¿Cuál es la diferencia con otras aplicaciones de iPhone o Android?",
    answer: (
      <p>
        Aire Claro se enfoca exclusivamente en la Zona Metropolitana de
        Monterrey, combinando datos de estaciones oficiales y sensores
        ciudadanos para brindar la cobertura más completa de la región.
      </p>
    ),
  },
  {
    question: "¿Qué información utiliza para medir la calidad del aire?",
    answer: (
      <div className="flex flex-col space-y-4">
        <p>
          1. Las estaciones de monitoreo
          <span>
            {" "}
            <a
              href="http://aire.nl.gob.mx/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              SIMA
            </a>{" "}
            de la Secretaría de Medio Ambiente de Nuevo León.
          </span>
        </p>
        <p>
          2. La red de sensores ciudadanos de
          <span>
            {" "}
            <a
              href="https://map.purpleair.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Purple Air
            </a>
            {"."}
          </span>
        </p>
      </div>
    ),
  },
  {
    question: "¿Cuál es el tipo de contaminante que mide?",
    answer: (
      <span>
        Aire Claro mide las concentraciones promedio de la última hora de las
        partículas respirables más dañinas para tu salud (PM2.5) y el riesgo a
        la salud asociado por respirarlas, con base en el{" "}
        <a
          href="https://dof.gob.mx/nota_detalle.php?codigo=5715154&fecha=25/01/2024#gsc.tab=0"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          Índice de Aire y Salud
        </a>{" "}
        mexicano.
        <br />
        <br />
        Adicionalmente, utiliza los rangos de color de los valores más
        protectores para PM2.5 del nuevo Índice Mexicano de Calidad del Aire y
        Riesgos a la Salud (NOM-172-SEMARNAT-2023) que entrarán en vigor a
        partir de enero de 2026.
        <br />
        <br />
        Es importante mencionar, que en condiciones de alta humedad o viento
        fuerte, los sensores de Purple Air sobreestiman o subestiman las
        concentraciones de partículas finas, respectivamente.
      </span>
    ),
  },
  {
    question: "¿Recolecta información sobre mí al utilizar la plataforma?",
    answer: (
      <p>
        Aire Claro utiliza tu ubicación al inicio para recomendarte el sensor
        más cercano a ti y proporcionarte información precisa sobre la calidad
        del aire en tu área.
        <br />
        <br />
        También puedes leer el{" "}
        <Link
          href="/aviso-privacidad"
          className="text-blue-500 hover:underline"
        >
          Aviso de Privacidad
        </Link>{" "}
        para conocer más.
      </p>
    ),
  },
  {
    question: "¿Cómo agrego un ícono de enlace directo en mi celular?",
    answer: (
      <span>
        <div>
          <iframe
            src="https://www.youtube.com/embed/dx0NLeoR3cs"
            title="YouTube Short"
            allowFullScreen
            className="h-96 w-full rounded-xl shadow-lg"
          ></iframe>
        </div>
      </span>
    ),
  },
  {
    question: "¿Puedo descargar los datos de calidad del aire?",
    answer: (
      <p>
        ¡Claro! Como organización de la sociedad civil, parte fundamental de
        nuestro trabajo es transparentar los datos que utilizamos para el
        beneficio de todos. Puedes descargar el historial completo en el
        siguiente{" "}
        <a
          href="https://datamx.io/dataset/calidad-del-aire-en-nuevo-leon"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          enlace
        </a>
        .
      </p>
    ),
  },
  {
    question: "Tengo más preguntas, ¿cómo los contacto?",
    answer: <span>Envíanos un correo a contacto@observatoriodelaire.com</span>,
  },
];

// FAQ component
const FAQItem = ({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}) => (
  <div
    className="cursor-pointer rounded-lg bg-white p-4 text-sm shadow-lg md:text-base"
    onClick={onToggle}
  >
    <div className="flex items-center justify-between">
      <h3 className="pr-2 font-bold">{question}</h3>
      {isOpen ? (
        <ChevronUp size={24} className="flex-shrink-0" />
      ) : (
        <ChevronDown size={24} className="flex-shrink-0" />
      )}
    </div>
    {isOpen && <div className="mt-4 w-full">{answer}</div>}
  </div>
);

// FAQ
export default function Questions() {
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  const toggleQuestion = (question: string) => {
    setOpenQuestion(openQuestion === question ? null : question);
  };

  return (
    <>
      {faqData.map((item) => (
        <FAQItem
          key={item.question}
          question={item.question}
          answer={item.answer}
          isOpen={openQuestion === item.question}
          onToggle={() => toggleQuestion(item.question)}
        />
      ))}
    </>
  );
}
