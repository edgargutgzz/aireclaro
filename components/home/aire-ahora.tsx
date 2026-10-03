import Link from "next/link";
import { getLevel, IMECA_LEVELS } from "@/lib/air-quality";
import { fetchDiasSobreNorma, getLiveStations, horaDeLectura, MESES } from "@/lib/home-air";

// Two cards under the homepage hero: right now (one dot per official metro
// station, in its NOM-172 color, linking to the map) and this year (days over
// the PM2.5 norm, linking to /datos). Side by side from md, stacked below.
// Each card hides itself when its data can't back it up, rather than showing
// something stale (the rules live in lib/home-air.ts).

// Each card is one link; the "Ver …" line at its foot is the visible cue.
const cardClass =
  "group flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15";
const kickerClass = "flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500";
const ctaClass = "mt-auto pt-2 text-sm font-medium text-[#226caf] group-hover:underline";

export default async function AireAhora() {
  const [estaciones, anual] = await Promise.all([
    getLiveStations().catch(() => []),
    fetchDiasSobreNorma().catch(() => null),
  ]);
  const vivas = [...estaciones].sort((a, b) => a.pm25 - b.pm25);

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
    hora = horaDeLectura(vivas);
  }

  if (!resumen && !anual) return null;

  return (
    <section aria-label="Calidad del aire hoy y en el año" className="mx-auto w-full max-w-7xl px-6 pb-20 lg:px-8">
      <div className="grid gap-6 md:grid-cols-2">
        {resumen && (
          <Link href="/mapa" className={cardClass}>
            <span className={kickerClass}>
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#00e400] opacity-60 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00a400]" />
              </span>
              En vivo · {hora}
            </span>
            <span className="text-xl font-semibold text-gray-900">{resumen}</span>
            <span className="flex gap-1 sm:gap-1.5" aria-hidden>
              {vivas.map((l) => (
                <span
                  key={l.sensorId}
                  className="h-3 w-3 rounded-full ring-1 sm:h-3.5 sm:w-3.5 ring-inset ring-black/10"
                  style={{ backgroundColor: getLevel(l.pm25).color }}
                />
              ))}
            </span>
            <span className={ctaClass}>Ver mapa →</span>
          </Link>
        )}
        {anual && (
          <Link href="/datos" className={cardClass}>
            <span className={kickerClass}>
              {anual.ano} · {MESES[anual.primerMes - 1]} a {MESES[anual.ultimoMes - 1]}
            </span>
            <span className="text-xl text-gray-600">
              <span className="font-semibold text-gray-900">{anual.dias} días</span> sobre la norma de PM2.5
            </span>
            <span className={ctaClass}>Ver datos →</span>
          </Link>
        )}
      </div>
    </section>
  );
}
