import Link from "next/link";

const faqData = [
  {
    question: "¿Cuál es la diferencia con otras aplicaciones de iPhone o Android?",
    answer: (
      <p>
        Aire Claro se enfoca exclusivamente en la Zona Metropolitana de
        Monterrey, combinando datos de estaciones oficiales y sensores
        ciudadanos para brindar la cobertura más completa de la región.
      </p>
    ),
  },
  {
    question: "¿Cuál es el principal contaminante que mide Aire Claro?",
    answer: (
      <p>
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
        Es importante mencionar que en condiciones de alta humedad o viento
        fuerte, los sensores de Purple Air sobreestiman o subestiman las
        concentraciones de partículas finas, respectivamente.
      </p>
    ),
  },
  {
    question: "¿Cómo agrego un ícono de enlace a Aire Claro en mi celular?",
    answer: (
      <iframe
        src="https://www.youtube-nocookie.com/embed/dx0NLeoR3cs"
        title="YouTube Short"
        allowFullScreen
        className="mt-2 h-64 w-full rounded-xl"
      />
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
];

export default function Questions() {
  return (
    <div className="flex flex-col divide-y divide-gray-100">
      {faqData.map((item) => (
        <div key={item.question} className="py-5">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">{item.question}</h3>
          <div className="text-sm leading-relaxed text-gray-500">{item.answer}</div>
        </div>
      ))}
    </div>
  );
}
