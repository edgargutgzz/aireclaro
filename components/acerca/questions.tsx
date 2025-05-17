"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

export default function Questions() {
  // Questions and answers
  const questions = [
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
            ></iframe>
          </div>
        </div>
      ),
    },
    {
      question:
        "¿Cuál es la diferencia con otras aplicaciones de iPhone o Android?",
      answer: (
        <p>
          Aire Claro es única en su tipo al concentrarse exclusivamente en la
          Zona Metropolitana de Monterrey, combinando datos de estaciones
          oficiales y sensores ciudadanos para brindar la cobertura más completa
          de la región.
        </p>
      ),
    },
    {
      question: "¿Qué información utilizan para medir la calidad del aire?",
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
      question: "¿Cómo garantizan la precisión de sus recomendaciones?",
      answer: (
        <span>
          Compartimos las concentraciones promedio de la última hora de las
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
          Adicionalmente, utilizamos los rangos de color de los valores más
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
      question: "¿Puedo descargar los datos de calidad del aire?",
      answer: (
        <p>
          ¡Claro! Puedes descargar el historial completo de datos en el
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
      question: "¿Qué información recolectan sobre mí?",
      answer: (
        <p>
          Aire Claro recopila y utiliza tu ubicación para proporcionarte
          información precisa sobre la calidad del aire en tu área.
          <br />
          <br />
          También puedes leer nuestro{" "}
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
      question: "Tengo más preguntas, ¿cómo los contacto?",
      answer: (
        <span>Envíanos un correo a contacto@observatoriodelaire.com</span>
      ),
    },
  ];

  // State to manage the open question - initialize with null so no questions are open by default
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  // Function to toggle the open question
  const toggleQuestion = (question: string): void => {
    if (openQuestion === question) {
      setOpenQuestion(null); // If clicked again, close it
    } else {
      setOpenQuestion(question); // Otherwise, open the clicked question
    }
  };

  return (
    <>
      {questions.map((q) => (
        <div
          key={q.question}
          className="mt-8 cursor-pointer rounded-lg bg-white p-4 text-sm shadow-lg md:text-base"
          onClick={() => toggleQuestion(q.question)}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="pr-2 font-bold">{q.question}</h3>
            {openQuestion === q.question ? (
              <ChevronUp size={24} className="flex-shrink-0" />
            ) : (
              <ChevronDown size={24} className="flex-shrink-0" />
            )}
          </div>
          {/* Answer */}
          {openQuestion === q.question && (
            <div className="mt-4 w-full">{q.answer}</div>
          )}
        </div>
      ))}
    </>
  );
}
