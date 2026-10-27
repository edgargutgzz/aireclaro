import { fetchUltimoMes } from "@/lib/datos-cache";
import { monterreyNaiveNow } from "@/lib/monterrey-time";

const FIRST_YEAR = 2025; // the first month /datos has, January 2025
const TZ = "America/Monterrey";
const INICIALES = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

const nombreMes = (ano: number, m: number) =>
  new Intl.DateTimeFormat("es-MX", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(ano, m - 1, 1)));

// Months as one running index (ano * 12 + mes - 1), so "the month after" is +1.
const idx = (ano: number, mes: number) => ano * 12 + mes - 1;
const desde = (i: number) => ({ ano: Math.floor(i / 12), mes: (i % 12) + 1 });

// The block that opens /datos: which month the last update added, when, and
// the run of published months (the new one dark, the
// next one dashed), so the monthly rhythm is visible. The publish date is the newest
// month's insert time (lib/datos-cache.ts). The next update is the month
// after publishing, or the current month once that one is late, so it never
// names a month already past.
export default async function ActualizacionMensual() {
  const ultimo = await fetchUltimoMes().catch(() => null);
  if (!ultimo?.updated_at) return null;

  const publicado = new Date(ultimo.updated_at);
  const [pubAno, pubMes] = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: TZ })
    .format(publicado)
    .split("-")
    .map(Number);
  const [hoyAno, hoyMes] = monterreyNaiveNow().slice(0, 7).split("-").map(Number);

  const iUltimo = idx(ultimo.ano, ultimo.mes);
  const siguiente = desde(Math.max(idx(pubAno, pubMes), idx(hoyAno, hoyMes) - 1) + 1);
  const proxima = nombreMes(siguiente.ano, siguiente.mes) + (siguiente.ano !== hoyAno ? ` de ${siguiente.ano}` : "");
  const mesesPublicados = iUltimo - idx(FIRST_YEAR, 1) + 1;
  const titulo = `Datos de ${nombreMes(ultimo.ano, ultimo.mes)} de ${ultimo.ano}`;

  const years = Array.from({ length: ultimo.ano + (ultimo.mes === 12 ? 1 : 0) - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);

  return (
    <section
      aria-labelledby="actualizacion-titulo"
      className="mb-16 flex flex-col gap-5 rounded-2xl border border-stone-200 bg-white px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-12"
    >
      <div className="min-w-0">
        <h2 id="actualizacion-titulo" className="text-lg font-medium text-neutral-700">
          {titulo}
        </h2>
        <div className="mt-1 text-xs text-neutral-500 md:text-sm">
          Próxima actualización: {proxima}.
        </div>
      </div>
      <div
        role="img"
        aria-label={`${mesesPublicados} meses publicados, de enero de ${FIRST_YEAR} a ${nombreMes(ultimo.ano, ultimo.mes)} de ${ultimo.ano}.`}
        className="shrink-0"
      >
        <div aria-hidden className="flex flex-col gap-1">
          <div className="flex items-center gap-1 pl-11">
            {INICIALES.map((l, i) => (
              <span key={i} className="w-4 text-center text-[10px] font-medium leading-none text-neutral-400 sm:w-5">
                {l}
              </span>
            ))}
          </div>
          {years.map((y) => (
            <div key={y} className="flex items-center gap-1">
              <span className="w-10 text-xs leading-none text-neutral-500">{y}</span>
              {INICIALES.map((_, m) => {
                const i = idx(y, m + 1);
                const cls =
                  i === iUltimo
                    ? "bg-stone-800"
                    : i < iUltimo
                      ? "bg-stone-300"
                      : i === iUltimo + 1
                        ? "border border-dashed border-stone-400"
                        : "bg-stone-100";
                return <span key={m} className={`h-4 w-4 rounded-[4px] sm:h-5 sm:w-5 ${cls}`} />;
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
