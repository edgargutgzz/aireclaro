import { fetchEstaciones, fetchUltimoMes } from "@/lib/datos-cache";

const FIRST_YEAR = 2025; // the first month /datos has, January 2025

const nombreMes = (ano: number, m: number) =>
  new Intl.DateTimeFormat("es-MX", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(ano, m - 1, 1)));

// The page header under the title: what the data is, then the period it
// covers and how often it's updated. The facts sit on the page, not in a
// card: label over value, a hairline between them from sm (stacked on a
// phone). Station count and last month are read from the data.
export default async function ActualizacionMensual() {
  const [estaciones, ultimo] = await Promise.all([
    fetchEstaciones().catch(() => null),
    fetchUltimoMes().catch(() => null),
  ]);
  if (!ultimo) return null;

  const hechos = [
    { label: "Periodo", valor: `Enero de ${FIRST_YEAR} a ${nombreMes(ultimo.ano, ultimo.mes)} de ${ultimo.ano}` },
    { label: "Actualización", valor: "Mensual" },
  ];

  return (
    <>
      <p className="mt-3 max-w-3xl text-base leading-relaxed text-neutral-600 md:text-lg">
        Mediciones horarias de PM2.5 y PM10 de {estaciones ? `las ${estaciones.length} estaciones` : "las estaciones"} del SIMA
        en la Zona Metropolitana de Monterrey.
      </p>
      <dl className="mt-6 flex flex-col gap-4 sm:flex-row sm:gap-0 sm:divide-x sm:divide-stone-200">
        {hechos.map(({ label, valor }) => (
          <div key={label} className="sm:px-8 sm:first:pl-0">
            <dt className="text-xs font-medium uppercase leading-none tracking-wide text-neutral-400">{label}</dt>
            <dd className="mt-2 text-base font-medium text-neutral-700">{valor}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
