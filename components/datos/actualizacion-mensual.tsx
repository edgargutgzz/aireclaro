import { CalendarRange, RefreshCw } from "lucide-react";
import { fetchUltimoMes } from "@/lib/datos-cache";
import { monterreyNaiveNow } from "@/lib/monterrey-time";

const FIRST_YEAR = 2025; // the first month /datos has, January 2025
const TZ = "America/Monterrey";

const nombreMes = (ano: number, m: number) =>
  new Intl.DateTimeFormat("es-MX", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(ano, m - 1, 1)));

// Months as one running index (ano * 12 + mes - 1), so "the month after" is +1.
const idx = (ano: number, mes: number) => ano * 12 + mes - 1;
const desde = (i: number) => ({ ano: Math.floor(i / 12), mes: (i % 12) + 1 });

// What opens /datos: the period the data covers and how often it's updated,
// as two labeled facts over a bar of the covered months (one segment per
// month, the next one dashed). The next update is the month after the newest
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

  const inicio = idx(FIRST_YEAR, 1);
  const meses = Array.from({ length: idx(ultimo.ano, ultimo.mes) - inicio + 1 }, (_, i) => desde(inicio + i));
  const periodo = `Enero de ${FIRST_YEAR} a ${nombreMes(ultimo.ano, ultimo.mes)} de ${ultimo.ano}`;

  const hechos = [
    { icon: CalendarRange, label: "Periodo", valor: periodo },
    { icon: RefreshCw, label: "Actualización", valor: `Cada mes, la próxima en ${proxima}` },
  ];

  return (
    <section aria-label="Periodo y actualización de los datos" className="mb-16 rounded-2xl border border-stone-200 bg-white px-5 py-5">
      <dl className="flex flex-col gap-4 sm:flex-row sm:gap-12">
        {hechos.map(({ icon: Icon, label, valor }) => (
          <div key={label} className="flex items-start gap-3 sm:items-center">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100">
              <Icon className="h-4 w-4 text-neutral-500" aria-hidden />
            </div>
            <div>
              <dt className="text-xs font-medium uppercase leading-none tracking-wide text-neutral-400">{label}</dt>
              <dd className="mt-1.5 text-base font-medium text-neutral-700">{valor}</dd>
            </div>
          </div>
        ))}
      </dl>
      {/* The covered months, one segment each, then the coming one dashed;
          years under their January. Decorative: the facts above say it. */}
      <div aria-hidden className="mt-5 flex gap-0.5">
        {meses.map((m) => (
          <div key={`${m.ano}-${m.mes}`} className="min-w-0 flex-1">
            <div className="h-2 rounded-[2px] bg-stone-300" />
            {m.mes === 1 && <div className="mt-2 text-xs leading-none text-neutral-500">{m.ano}</div>}
          </div>
        ))}
        <div className="min-w-0 flex-1">
          <div className="h-2 rounded-[2px] border border-dashed border-stone-400" />
        </div>
      </div>
    </section>
  );
}
