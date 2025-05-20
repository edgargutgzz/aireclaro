// Privacy Notice content
const privacySections = [
  {
    title: "1. Responsable del Tratamiento de Datos",
    content:
      "Observatorio Ciudadano de la Calidad del Aire del Área Metropolitana de Monterrey (OCCAMM) con dirección en Business Hub, Blvd. Antonio L. Rodríguez 2100-Piso 12, Santa María, 64650 Monterrey, N.L.",
  },
  {
    title: "2. Datos Recopilados",
    content:
      "- Ubicación Geográfica: Utilizamos los datos de tu ubicación para ofrecer información relevante sobre la calidad del aire en tu zona.",
  },
  {
    title: "3. Uso de los Datos",
    content:
      "- Proporcionar información precisa sobre la calidad del aire en tu área.\n- Mejorar la precisión y funcionalidad de Aire Claro.",
  },
  {
    title: "4. Compartición de Datos",
    content:
      "- Terceros: No compartimos tu ubicación con terceros, excepto cuando sea necesario para cumplir con obligaciones legales o con tu consentimiento expreso.",
  },
  {
    title: "5. Seguridad de los Datos",
    content:
      "Implementamos medidas de seguridad razonables para proteger tu información durante su uso en la aplicación. Dado que no almacenamos tu ubicación, el riesgo de acceso no autorizado es mínimo.",
  },
  {
    title: "6. Consentimiento",
    content:
      "Al utilizar Aire Claro, consientes el uso de tu ubicación en tiempo real según lo descrito en este aviso de privacidad.",
  },
  {
    title: "7. Derechos del Usuario",
    content:
      "Dado que no almacenamos tu ubicación ni otros datos personales, no es necesario solicitar acceso, rectificación o eliminación de datos. Si tienes preguntas sobre cómo manejamos tu información, por favor envíanos un correo a: contacto@observatoriodelaire.com",
  },
  {
    title: "8. Cambios en el Aviso de Privacidad",
    content:
      "Nos reservamos el derecho de actualizar este aviso de privacidad. Última actualización: 01 de mayo del 2025.",
  },
  {
    title: "9. Contacto",
    content:
      "Si tienes preguntas o inquietudes sobre este aviso de privacidad, por favor envíanos un correo a: contacto@observatoriodelaire.com",
  },
];

// Privacy Notice component
const PrivacySection = ({
  title,
  content,
}: {
  title: string;
  content: string;
}) => (
  <div>
    <h2 className="mt-10 font-semibold">{title}</h2>
    <p className="mt-2 whitespace-pre-line">{content}</p>
  </div>
);

// Privacy Notice
export default function Aviso() {
  return (
    <div className="mx-4 flex flex-col pb-32 pt-8 md:mx-16 md:py-12 md:pb-10 lg:mx-52">
      <div className="flex flex-col">
        {/* Header */}
        <h1 className="text-3xl font-bold md:mb-10">Aviso de Privacidad</h1>

        {/* Aviso de Privacidad */}
        <div className="text-sm md:text-base">
          {privacySections.map((section, index) => (
            <PrivacySection
              key={index}
              title={section.title}
              content={section.content}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
