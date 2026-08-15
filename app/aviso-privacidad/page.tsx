import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Aviso de Privacidad" };

const privacySections = [
  {
    title: "1. Responsable del Tratamiento de Datos",
    content:
      "Observatorio Ciudadano de la Calidad del Aire del Área Metropolitana de Monterrey (OCCAMM) con dirección en Business Hub, Blvd. Antonio L. Rodríguez 2100-Piso 12, Santa María, 64650 Monterrey, N.L.",
  },
  {
    title: "2. Datos Recopilados",
    content:
      "Ubicación Geográfica: Utilizamos los datos de tu ubicación para ofrecer información relevante sobre la calidad del aire en tu zona.",
  },
  {
    title: "3. Uso de los Datos",
    content:
      "Proporcionar información precisa sobre la calidad del aire en tu área y mejorar la precisión y funcionalidad de Aire Claro.",
  },
  {
    title: "4. Compartición de Datos",
    content:
      "No compartimos tu ubicación con terceros, excepto cuando sea necesario para cumplir con obligaciones legales o con tu consentimiento expreso.",
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
      "Dado que no almacenamos tu ubicación ni otros datos personales, no es necesario solicitar acceso, rectificación o eliminación de datos. Si tienes preguntas sobre cómo manejamos tu información, escríbenos a contacto@observatoriodelaire.com.",
  },
  {
    title: "8. Cambios en el Aviso de Privacidad",
    content:
      "Nos reservamos el derecho de actualizar este aviso de privacidad. Última actualización: 03 de agosto del 2026.",
  },
  {
    title: "9. Contacto",
    content:
      "Si tienes preguntas o inquietudes, escríbenos a contacto@observatoriodelaire.com.",
  },
];

export default function Aviso() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="container mx-auto max-w-2xl flex-1 px-4 pb-10 pt-6 md:pt-14">

        <h1 className="mb-8 text-lg font-semibold text-gray-800">Aviso de Privacidad</h1>

        <div className="flex flex-col divide-y divide-gray-100">
          {privacySections.map((section) => (
            <div key={section.title} className="py-4">
              <p className="mb-1.5 text-sm font-semibold text-gray-700">{section.title}</p>
              <p className="text-sm leading-relaxed text-gray-500">{section.content}</p>
            </div>
          ))}
        </div>

      </div>

      <div className="border-t border-gray-100 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom)+4rem)] md:pb-4">
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
