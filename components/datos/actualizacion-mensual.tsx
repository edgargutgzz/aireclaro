import { fetchUltimoMes } from "@/lib/datos-cache";
import { monterreyNaiveNow } from "@/lib/monterrey-time";

const FIRST_YEAR = 2025; // the first month /datos has, January 2025
const TZ = "America/Monterrey";

const nombreMes = (ano: number, m: number) =>
  new Intl.DateTimeFormat("es-MX", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(ano, m - 1, 1)));

// Months as one running index (ano * 12 + mes - 1), so "the month after" is +1.
const idx = (ano: number, mes: number) => ano * 12 + mes - 1;
const desde = (i: number) => ({ ano: Math.floor(i / 12), mes: (i % 12) + 1 });

// What opens /datos: the period the data covers and how often it's updated. The next update is the month after the newest
// month was published (its insert time, lib/datos-cache.ts), or the current
// month once that one is late, so it never names a month already past.
export default async function ActualizacionMensual() {
  const ultimo = await fetchUltimoMes().catch(() => null);
  if (!ultimo?.updated_at) return null;

  const [pubAno, pubMes] = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: TZ })
    .format(new Date(ultimo.updated_at))
    .split("-")
    .map(Number);
  const [hoyAno, hoyMes] = monterreyNaiveNow().slice(0, 7).split("-").map(Number);
  const siguiente = desde(Math.max(idx(pubAno, pubMes), idx(hoyAno, hoyMes) - 1) + 1);
  const proxima = nombreMes(siguiente.ano, siguiente.mes) + (siguiente.ano !== hoyAno ? ` de ${siguiente.ano}` : "");

  const hechos = [
    { label: "Periodo", valor: `Enero de ${FIRST_YEAR} a ${nombreMes(ultimo.ano, ultimo.mes)} de ${ultimo.ano}` },
    { label: "Actualización", valor: `Mensual, la próxima en ${proxima}` },
  ];

  // Facts on the page itself, not a card: label over value, a hairline
  // between them from sm (stacked on a phone).
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
