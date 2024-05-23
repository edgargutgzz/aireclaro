export default function Questions() {
  const questions = [
    {
      question: "¿Qué es Aire Claro?",
      answer: (
        <p>
          Aire Claro muestra la calidad del aire de la Zona Metropolitana de
          Monterrey y brinda recomendaciones oportunas para cuidar tu salud.
        </p>
      ),
    },
    {
      question: "¿Cómo garantizan la precisión de las recomendaciones?",
      answer: (
        <span>
          Compartimos de forma oportuna las concentraciones de las partículas
          respirables más dañinas para tu salud (PM2.5) y el riesgo a la salud
          asociado por respirarlas, con base en el{" "}
          <a
            href="https://www.gob.mx/cms/uploads/attachment/file/554425/comunicado_indice_calidad_aire_05_2020_FINAL_v3.pdf"
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
        </span>
      ),
    },
    {
      question: "¿Qué información utilizan para medir la calidad del aire?",
      answer: (
        <span>
          1. Las estaciones de monitoreo{" "}
          <a
            href="http://aire.nl.gob.mx/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            SIMA
          </a>{" "}
          de la Secretaría de Medio Ambiente de Nuevo León.
          <br />
          <br />
          2. Los sensores de bajo costo de{" "}
          <a
            href="https://www2.purpleair.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            Purple Air.
          </a>
        </span>
      ),
    },
    {
      question: "¿Quién es el Observatorio Ciudadano de la Calidad del Aire?",
      answer: (
        <span>
          El{" "}
          <a
            href="https://www.gob.mx/cms/uploads/attachment/file/554425/comunicado_indice_calidad_aire_05_2020_FINAL_v3.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            OCCAMM
          </a>{" "}
          es un organización de la sociedad civil que promueve información sobre
          el estado, causas y efectos de la contaminación del aire en la Zona
          Metropolitana de Monterrey.
          <br />
          <br />
          El Observatorio es también quién evalúa la información que utiliza
          Aire Claro para brindar mejores recomendaciones.
        </span>
      ),
    },
    {
      question: "¿Cómo agrego un ícono de enlace directo en mi celular?",
      answer: (
        <span>
          <div className="pb-10">
            <div className="pb-5">iPhone </div>
            <div className="pb-4">
              <iframe
                src="https://www.youtube.com/watch?v=B7fKs4dTeu0&t=64s"
                title="Aire Claro - iPhone"
                allowFullScreen
                className="h-96 w-full rounded-xl shadow-lg"
              ></iframe>
            </div>
          </div>
          <div>
            <div className="pb-5">Android </div>
            <div className="pb-4">
              <iframe
                src="https://www.youtube.com/watch?v=O1xEXKB6tNg"
                title="Aire Claro - Android"
                allowFullScreen
                className="h-96 w-full rounded-xl shadow-lg"
              ></iframe>
            </div>
          </div>
        </span>
      ),
    },
  ];

  return (
    <div>
      {questions.map((q) => (
        <div
          key={q.question}
          className="mb-8 rounded-lg bg-white p-4 shadow-lg"
        >
          <h3 className="font-bold">{q.question}</h3>
          <div className="mt-6">{q.answer}</div>
        </div>
      ))}
    </div>
  );
}
