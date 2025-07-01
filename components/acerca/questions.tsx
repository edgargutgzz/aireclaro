"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Users,
  Shield,
  BarChart3,
  Download,
  Smartphone,
  MessageCircle,
  CircleGauge,
} from "lucide-react";
import Link from "next/link";

// FAQ content
const faqData = [
  {
    icon: HelpCircle,
    question: "¿Qué es Aire Claro?",
    answer: (
      <div>
        <p className="mb-4">
          Aire Claro es una plataforma que brinda información sobre la calidad
          del aire que respiramos en la Zona Metropolitana de Monterrey y
          Saltillo.
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
    icon: Smartphone,
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
    icon: Users,
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
    icon: BarChart3,
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
    icon: CircleGauge,
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
    icon: Shield,
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
    icon: Smartphone,
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
    icon: Download,
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
    icon: MessageCircle,
    question: "Tengo más preguntas, ¿cómo los contacto?",
    answer: <span>Envíanos un correo a contacto@observatoriodelaire.com</span>,
  },
];

// FAQ component
const FAQItem = ({
  icon: Icon,
  question,
  answer,
  isOpen,
  onToggle,
}: {
  icon?: any;
  question: string;
  answer: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}) => (
  <div
    className={`group cursor-pointer rounded-xl border p-6 shadow-sm transition-all duration-200 hover:shadow-md ${
      isOpen
        ? "border-blue-200 bg-blue-50"
        : "border-gray-200 bg-white hover:border-blue-100"
    }`}
    onClick={onToggle}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        {Icon ? (
          <div
            className={`flex-shrink-0 rounded-full p-2 transition-colors ${
              isOpen ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
            }`}
          >
            <Icon size={18} />
          </div>
        ) : (
          <div
            className={`h-2 w-2 rounded-full transition-colors ${
              isOpen ? "bg-blue-600" : "bg-gray-300"
            }`}
          />
        )}
        <h3
          className={`pr-4 text-lg font-semibold transition-colors ${
            isOpen ? "text-blue-600" : "text-gray-900"
          }`}
        >
          {question}
        </h3>
      </div>
      <div className="flex-shrink-0 transition-transform duration-200">
        {isOpen ? (
          <ChevronUp size={24} className="text-blue-600" />
        ) : (
          <ChevronDown size={24} className="text-gray-400" />
        )}
      </div>
    </div>
    {isOpen && (
      <div
        className={`mt-4 leading-relaxed text-gray-700 ${Icon ? "ml-12" : "ml-5"}`}
      >
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
          icon={item.icon}
          question={item.question}
          answer={item.answer}
          isOpen={openQuestion === item.question}
          onToggle={() => toggleQuestion(item.question)}
        />
      ))}
    </div>
  );
}
