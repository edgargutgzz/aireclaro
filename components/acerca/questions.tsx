"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function Questions() {
  const questions = [
    {
      question: "¿Qué es Aire Claro?",
      answer: (
        <p>
          Aire Claro brinda información sobre la contaminación atmosférica en la
          Zona Metropolitana de Monterrey y Saltillo.
        </p>
      ),
    },
    {
      question: "¿Qué información utilizan para medir la calidad del aire?",
      answer: (
        <div className="flex flex-col space-y-4">
          <p>Aire Claro utiliza dos fuentes principales:</p>
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
              </a>
              {", "}de la Secretaría de Medio Ambiente de Nuevo León.
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
      question:
        "¿Cuál es la diferencia con otras aplicaciones de iPhone o Android?",
      answer: (
        <div className="flex flex-col space-y-4">
          <p>Aire Claro es la única que:</p>
          <p>
            1. Utiliza la red más completa de sensores terrestres del Área
            Metropolitana de Monterrey.
          </p>
          <p>
            2. La respalda el Observatorio Ciudadano de la Calidad del Aire
            <span>
              {" "}
              <a
                href="https://observatoriodelaire.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                OCCAMM
              </a>
              {", "}organización de la sociedad civil líder en promover
              información sobre el estado, causas y efectos de la contaminación
              del aire.
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
          fuerte, los sensores sobreestiman o subestiman las concentraciones de
          partículas finas, respectivamente.
        </span>
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
      question: "Tengo más preguntas, ¿cómo los contacto?",
      answer: (
        <span>Envíanos un correo a contacto@observatoriodelaire.com</span>
      ),
    },
  ];

  const [openQuestion, setOpenQuestion] = useState<string | null>(
    questions[0].question,
  );

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
