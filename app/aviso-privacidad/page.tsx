export default function Aviso() {
  return (
    <div className="mx-4 flex min-h-screen flex-col pb-20 pt-4 md:mx-16 md:pb-28 md:pt-8 lg:mx-36 lg:pb-20 lg:pt-6">
      <div className="flex flex-col">
        {/* Header */}
        <h1 className="pt-4 text-3xl font-bold md:pt-7">Aviso de Privacidad</h1>

        {/* Contenido del Aviso de Privacidad */}
        <div className="mt-6">
          <p>Última actualización: 1 de octubre del 2024</p>

          <p className="mt-4">
            Aire Claro recopila y utiliza únicamente tu ubicación para
            proporcionarte información precisa sobre la calidad del aire en tu
            área. No recopilamos ningún otro dato personal.
          </p>

          {/* Sección 1 */}
          <h2 className="mt-6 text-lg font-semibold">
            1. Responsable del Tratamiento de Datos
          </h2>
          <p className="mt-2">
            Observatorio Ciudadano de la Calidad del Aire del Área Metropolitana
            de Monterrey (OCCAMM)
            <br />
            <strong>Dirección:</strong> Business Hub, Blvd. Antonio L. Rodríguez
            2100-Piso 12, Santa María, 64650 Monterrey, N.L.
            <br />
            <strong>Correo electrónico:</strong>{" "}
            <a
              href="mailto:contacto@observatoriodelaire.com"
              className="text-blue-600"
            >
              contacto@observatoriodelaire.com
            </a>
          </p>

          {/* Sección 2 */}
          <h2 className="mt-6 text-xl font-semibold">2. Datos Recopilados</h2>
          <p className="mt-2">
            - <strong>Ubicación Geográfica:</strong> Utilizamos los datos de tu
            ubicación en tiempo real para ofrecer información relevante sobre la
            calidad del aire en tu zona.
            <br />- <strong>No recopilamos ningún otro dato personal.</strong>
          </p>

          {/* Sección 3 */}
          <h2 className="mt-6 text-xl font-semibold">3. Uso de los Datos</h2>
          <p className="mt-2">
            - Proporcionar información precisa sobre la calidad del aire en tu
            área.
            <br />- Mejorar la precisión y funcionalidad de{" "}
            <strong>Aire Claro</strong>.
          </p>

          {/* Sección 4 */}
          <h2 className="mt-6 text-xl font-semibold">
            4. Compartición de Datos
          </h2>
          <p className="mt-2">
            - <strong>Terceros:</strong> No compartimos tus datos de ubicación
            con terceros, excepto cuando sea necesario para cumplir con
            obligaciones legales o con tu consentimiento expreso.
          </p>

          {/* Sección 5 */}
          <h2 className="mt-6 text-xl font-semibold">
            5. Seguridad de los Datos
          </h2>
          <p className="mt-2">
            Implementamos medidas de seguridad razonables para proteger tu
            ubicación contra accesos no autorizados, alteraciones o destrucción.
          </p>

          {/* Sección 6 */}
          <h2 className="mt-6 text-xl font-semibold">6. Consentimiento</h2>
          <p className="mt-2">
            Al utilizar <strong>Aire Claro</strong>, consientes la recopilación
            y uso de tu ubicación según lo descrito en este aviso de privacidad.
          </p>

          {/* Sección 7 */}
          <h2 className="mt-6 text-xl font-semibold">
            7. Derechos del Usuario
          </h2>
          <p className="mt-2">
            Tienes derecho a acceder, rectificar o eliminar la información de tu
            ubicación almacenada. Para ejercer estos derechos, por favor
            contáctanos a través de{" "}
            <a
              href="mailto:contacto@observatoriodelaire.com"
              className="text-blue-600"
            >
              contacto@observatoriodelaire.com
            </a>
            .
          </p>

          {/* Sección 8 */}
          <h2 className="mt-6 text-xl font-semibold">
            8. Cambios en el Aviso de Privacidad
          </h2>
          <p className="mt-2">
            Nos reservamos el derecho de actualizar este aviso de privacidad.
            Cualquier cambio será notificado a través de{" "}
            <strong>Aire Claro</strong> o por otros medios apropiados.
          </p>

          {/* Sección 9 */}
          <h2 className="mt-6 text-xl font-semibold">9. Contacto</h2>
          <p className="mt-2">
            Si tienes preguntas o inquietudes sobre este aviso de privacidad,
            por favor contáctanos:
            <br />
            <strong>Nombre:</strong> Observatorio Ciudadano de la Calidad del
            Aire del Área Metropolitana de Monterrey (OCCAMM)
            <br />
            <strong>Correo electrónico:</strong>{" "}
            <a
              href="mailto:contacto@observatoriodelaire.com"
              className="text-blue-600"
            >
              contacto@observatoriodelaire.com
            </a>
            <br />
            <strong>Dirección:</strong> Business Hub, Blvd. Antonio L. Rodríguez
            2100-Piso 12, Santa María, 64650 Monterrey, N.L.
          </p>
        </div>
      </div>
    </div>
  );
}
