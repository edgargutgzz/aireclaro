import { fetchUltimoMes } from "@/lib/datos-cache";

const FIRST_YEAR = 2025; // the first month /datos has, January 2025

const nombreMes = (ano: number, m: number) =>
  new Intl.DateTimeFormat("es-MX", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(ano, m - 1, 1)));

// What opens /datos: the period the data covers and how often it's updated.
// Facts on the page itself, not a card: label over value, a hairline between
// them from sm (stacked on a phone).
export default async function ActualizacionMensual() {
  const ultimo = await fetchUltimoMes().catch(() => null);
  if (!ultimo) return null;

  const hechos = [
    { label: "Periodo", valor: `Enero de ${FIRST_YEAR} a ${nombreMes(ultimo.ano, ultimo.mes)} de ${ultimo.ano}` },
    { label: "Actualización", valor: "Mensual" },
  ];

  return (
    <dl className="mb-8 flex flex-col gap-4 sm:flex-row sm:gap-0 sm:divide-x sm:divide-stone-200">
      {hechos.map(({ label, valor }) => (
        <div key={label} className="sm:px-8 sm:first:pl-0">
          <dt className="text-xs font-medium uppercase leading-none tracking-wide text-neutral-400">{label}</dt>
          <dd className="mt-2 text-base font-medium text-neutral-700">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}
