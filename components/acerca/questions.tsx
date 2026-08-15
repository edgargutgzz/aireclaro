const features = [
  {
    title: "Enfocado en Monterrey",
    description:
      "Cobertura local completa combinando estaciones oficiales SIMA y sensores ciudadanos PurpleAir.",
  },
  {
    title: "PM2.5 en tiempo real",
    description:
      "Medimos el contaminante más dañino para tu salud con base en el Índice de Aire y Salud mexicano (NOM-172-SEMARNAT-2023).",
  },
  {
    title: "Datos abiertos",
    description: (
      <>
        Descarga el historial completo de mediciones en{" "}
        <a
          href="https://datamx.io/dataset/calidad-del-aire-en-la-zona-metropolitana-de-monterrey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          datamx.io
        </a>
        .
      </>
    ),
  },
  {
    title: "Acceso rápido desde tu celular",
    description: (
      <>
        Agrega un ícono a tu pantalla de inicio para consultarlo como una app.{" "}
        <a
          href="https://www.youtube.com/shorts/dx0NLeoR3cs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          Ver cómo hacerlo
        </a>
        .
      </>
    ),
  },
];

export default function Questions() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {features.map((feature) => (
        <div key={feature.title} className="rounded-xl bg-gray-50 px-4 py-4">
          <p className="mb-1 text-sm font-semibold text-gray-800">{feature.title}</p>
          <p className="text-sm leading-relaxed text-gray-500">{feature.description}</p>
        </div>
      ))}
    </div>
  );
}
