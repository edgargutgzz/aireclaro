import Link from "next/link";
import fetchSimaData from "@/components/data/sima-data";
import { cachedDatos } from "@/lib/datos-cache";
import { createPublicClient } from "@/utils/supabase/public";
import { getLevel, getPM25Color, IMECA_LEVELS } from "@/lib/air-quality";
import { monterreyNaiveNow, parseMonterreyNaive } from "@/lib/monterrey-time";

// The homepage's slim strip under the navbar: right now (one dot per official
// metro station, in its NOM-172 color, linking to the map) and this year
// (days over the PM2.5 norm, linking to /datos). One line on desktop, two on
// mobile. Each line hides itself
// when its data can't back it up, rather than showing something stale.

// Older than this, the readings aren't "en vivo" anymore.
const LIVE_MAX_AGE_MS = 3 * 60 * 60 * 1000;

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// The latest year in the "días sobre la norma" chart's table, on the current
// limit (the chart's own comparison column), PM2.5.
const fetchDiasSobreNorma = cachedDatos(async () => {
  const { data, error } = await createPublicClient()
    .from("sima_insalubres_mensual")
    .select("ano, mes, dias_insalubres_limite_actual")
    .eq("parametro", "PM2.5")
    .order("ano", { ascending: false })
    .order("mes", { ascending: true });
  if (error) throw new Error(`Failed to load días sobre la norma: ${error.message}`);
  if (!data?.length) return null;
  const ano = data[0].ano;
  const meses = data.filter((r) => r.ano === ano);
  return {
    ano,
    dias: meses.reduce((sum, r) => sum + r.dias_insalubres_limite_actual, 0),
    primerMes: meses[0].mes,
    ultimoMes: meses[meses.length - 1].mes,
  };
}, "home-dias-sobre-norma");

// Each line is one link (a whole tappable row on mobile); its "Ver …" label
// shrinks to just the arrow below sm so the row stays on one line.
const rowClass =
  "group flex w-fit flex-wrap items-center gap-x-3 gap-y-1 rounded-xl py-1 lg:py-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15";
const ctaClass = "font-medium text-[#226caf] group-hover:underline";

export default async function AireAhora() {
  const [lecturas, anual] = await Promise.all([
    fetchSimaData().catch(() => []),
    fetchDiasSobreNorma().catch(() => null),
  ]);

  // Metro stations only (FIN is Saltillo), with a real reading (the map's own
  // no-data rule), from the last few hours.
  const now = parseMonterreyNaive(monterreyNaiveNow()).getTime();
  const vivas = lecturas
    .filter((l) => l.sensor_id !== "FIN" && getPM25Color(l.pm25) !== null)
    .filter((l) => now - parseMonterreyNaive(l.time_stamp).getTime() < LIVE_MAX_AGE_MS)
    .sort((a, b) => a.pm25 - b.pm25);

  let resumen: string | null = null;
  let hora: string | null = null;
  if (vivas.length > 0) {
    const porNivel = IMECA_LEVELS.map((nivel) => ({
      label: nivel.label.toLowerCase(),
      n: vivas.filter((l) => getLevel(l.pm25) === nivel).length,
    })).filter((g) => g.n > 0);
    resumen =
      porNivel.length === 1
        ? `Calidad ${porNivel[0].label} en las ${vivas.length} estaciones oficiales`
        : `${vivas.length} estaciones oficiales: ${porNivel
            .map((g, i) => (i === 0 ? `${g.n} con calidad ${g.label}` : `${g.n} ${g.label}`))
            .join(", ")
            .replace(/, ([^,]*)$/, " y $1")}`;
    const latest = vivas.reduce((a, b) => (a.time_stamp > b.time_stamp ? a : b)).time_stamp;
    const h = parseMonterreyNaive(latest).getUTCHours();
    hora = `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;
  }

  if (!resumen && !anual) return null;

  return (
    <div className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col px-6 py-1.5 text-[13px] text-gray-600 sm:text-sm lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:px-8 lg:py-2.5">
        {resumen && (
          <Link href="/mapa" className={rowClass}>
            <span className="flex items-center gap-2 font-medium text-gray-700">
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#00e400] opacity-60 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00a400]" />
              </span>
              En vivo · {hora}
            </span>
            {/* The sentence is the dots' text equivalent: always read out,
                only shown where there's room for it. */}
            <span className="sr-only lg:not-sr-only">{resumen}</span>
            <span className="flex gap-0.5" aria-hidden>
              {vivas.map((l) => (
                <span
                  key={l.sensor_id}
                  className="h-2 w-2 rounded-full ring-1 ring-inset ring-black/10"
                  style={{ backgroundColor: getLevel(l.pm25).color }}
                />
              ))}
            </span>
            <span className={ctaClass}>
              <span className="hidden sm:inline">Ver mapa </span>→
            </span>
          </Link>
        )}
        {anual && (
          <Link href="/datos" className={rowClass}>
            <span>
              <span className="font-semibold text-gray-900">{anual.dias} días</span> sobre la norma de PM2.5
              en {anual.ano}
              <span className="hidden sm:inline">
                {" "}
                ({MESES[anual.primerMes - 1]} a {MESES[anual.ultimoMes - 1]})
              </span>
            </span>
            <span className={ctaClass}>
              <span className="hidden sm:inline">Ver datos </span>→
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
