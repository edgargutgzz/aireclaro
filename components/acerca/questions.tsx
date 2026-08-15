"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

// FAQ content
const faqData = [
  {
    question:
      "¿Cuál es la diferencia con otras aplicaciones de iPhone o Android?",
    answer: (
      <p>
        Aire Claro se enfoca exclusivamente en la Zona Metropolitana de
        Monterrey y Saltillo, combinando datos de estaciones oficiales y
        sensores ciudadanos para brindar la cobertura más completa de la región.
      </p>
    ),
  },
  {
    question: "¿Quién mantiene la plataforma?",
    answer: (
      <p>
        El Observatorio Ciudadano de la Calidad del Aire (OCCAMM). Puedes
        conocer más sobre el observatorio en el siguiente{" "}
        <a
          href="https://www.observatoriodelaire.com/"
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
    question:
      "¿Qué información utiliza Aire Claro para medir la calidad del aire?",
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
    question: "¿Cuál es el principal contaminante que mide Aire Claro?",
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
    question:
      "¿Recolecta Aire Claro información sobre mí al utilizar la plataforma?",
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
    question: "¿Cómo agrego un ícono de enlace a Aire Claro en mi celular?",
    answer: (
      <span>
        <div>
          <iframe
            src="https://www.youtube-nocookie.com/embed/dx0NLeoR3cs"
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
          href="https://datamx.io/dataset/calidad-del-aire-en-la-zona-metropolitana-de-monterrey"
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
    answer: <span>Envíanos un correo a <a href="mailto:contacto@observatoriodelaire.com" className="text-blue-500 hover:underline">contacto@observatoriodelaire.com</a></span>,
  },
];

// Styles
const styles = {
  card: "group cursor-pointer rounded-xl bg-gray-50 px-4 py-3 transition-all duration-200",
  cardOpen: "",
  cardClosed: "",
  chevronOpen: "text-gray-500",
  chevronClosed: "text-gray-400",
};

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
    className={`${styles.card} ${isOpen ? styles.cardOpen : styles.cardClosed}`}
    onClick={onToggle}
  >
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <h3 className="text-sm font-semibold text-gray-700">{question}</h3>
      </div>
      <div className="flex-shrink-0">
        {isOpen ? (
          <ChevronUp size={16} className={styles.chevronOpen} />
        ) : (
          <ChevronDown size={16} className={styles.chevronClosed} />
        )}
      </div>
    </div>
    {isOpen && (
      <div className="mt-3 text-sm leading-relaxed text-gray-500">
        {answer}
      </div>
    )}
  </div>
);

// FAQ
export default function Questions() {
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  const toggleQuestion = (question: string) => {
    setOpenQuestion(openQuestion === question ? null : question);
  };

  return (
    <div className="space-y-4">
      {faqData.map((item) => (
        <FAQItem
          key={item.question}
          question={item.question}
          answer={item.answer}
          isOpen={openQuestion === item.question}
          onToggle={() => toggleQuestion(item.question)}
        />
      ))}
    </div>
  );
}
