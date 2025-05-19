export default function Aviso() {
  return (
    <div className="mx-5 flex min-h-screen flex-col py-8 pb-20 md:mx-16 md:py-12 md:pb-10 lg:mx-52">
      <div className="flex flex-col">
        {/* Header */}
        <h1 className="mb-6 text-3xl font-bold md:mb-10">
          Aviso de Privacidad
        </h1>

        {/* Aviso de Privacidad */}
        <div className="text-sm md:text-base">
          {/* Sección 1 */}
          <h2 className="mt-12 font-semibold">
            1. Responsable del Tratamiento de Datos
          </h2>
          <p className="mt-2">
            Observatorio Ciudadano de la Calidad del Aire del Área Metropolitana
            de Monterrey (OCCAMM) con dirección en Business Hub, Blvd. Antonio
            L. Rodríguez 2100-Piso 12, Santa María, 64650 Monterrey, N.L.
          </p>

          {/* Sección 2 */}
          <h2 className="mt-10 font-semibold">2. Datos Recopilados</h2>
          <p className="mt-2">
            - Ubicación Geográfica: Utilizamos los datos de tu ubicación para
            ofrecer información relevante sobre la calidad del aire en tu zona.
          </p>

          {/* Sección 3 */}
          <h2 className="mt-10 font-semibold">3. Uso de los Datos</h2>
          <p className="mt-2">
            - Proporcionar información precisa sobre la calidad del aire en tu
            área.
            <br />- Mejorar la precisión y funcionalidad de Aire Claro.
          </p>

          {/* Sección 4 */}
          <h2 className="mt-10 font-semibold">4. Compartición de Datos</h2>
          <p className="mt-2">
            - Terceros: No compartimos tu ubicación con terceros, excepto cuando
            sea necesario para cumplir con obligaciones legales o con tu
            consentimiento expreso.
          </p>

          {/* Sección 5 */}
          <h2 className="mt-10 font-semibold">5. Seguridad de los Datos</h2>
          <p className="mt-2">
            Implementamos medidas de seguridad razonables para proteger tu
            información durante su uso en la aplicación. Dado que no almacenamos
            tu ubicación, el riesgo de acceso no autorizado es mínimo.
          </p>

          {/* Sección 6 */}
          <h2 className="mt-10 font-semibold">6. Consentimiento</h2>
          <p className="mt-2">
            Al utilizar Aire Claro, consientes el uso de tu ubicación en tiempo
            real según lo descrito en este aviso de privacidad.
          </p>

          {/* Sección 7 */}
          <h2 className="mt-10 font-semibold">7. Derechos del Usuario</h2>
          <p className="mt-2">
            Dado que no almacenamos tu ubicación ni otros datos personales, no
            es necesario solicitar acceso, rectificación o eliminación de datos.
            Si tienes preguntas sobre cómo manejamos tu información, por favor
            envíanos un correo a: contacto@observatoriodelaire.com
          </p>

          {/* Sección 8 */}
          <h2 className="mt-10 font-semibold">
            8. Cambios en el Aviso de Privacidad
          </h2>
          <p className="mt-2">
            Nos reservamos el derecho de actualizar este aviso de privacidad.
          </p>

          {/* Sección 9 */}
          <h2 className="mt-10 font-semibold">9. Contacto</h2>
          <p className="mt-2">
            Si tienes preguntas o inquietudes sobre este aviso de privacidad,
            por favor envíanos un correo a: contacto@observatoriodelaire.com
          </p>

          <p className="mt-10">Última actualización: 01 de mayo del 2025</p>
        </div>
      </div>
    </div>
  );
}
