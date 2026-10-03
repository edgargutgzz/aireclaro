import Link from "next/link";
import { createPublicClient } from "@/utils/supabase/public";
import { cachedDatos, fetchEstaciones } from "@/lib/datos-cache";

// The homepage's proof row under the hero: checkable facts about the data
// instead of a claim about it. The figures come from the same tables /datos
// reads, cached with them (lib/datos-cache.ts), so they move when the monthly
// cron loads a new month.

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const fetchCifras = cachedDatos(async () => {
  const supabase = createPublicClient();
  const [mediciones, desde, sensores] = await Promise.all([
    // Every row with a value is an hour SINAICA validated (the cron requests
    // soloVal=1); empty rows are the grid's no-data hours and don't count.
    supabase
      .from("sima_mediciones_finales")
      .select("fecha", { count: "exact", head: true })
      .not("valor", "is", null),
    supabase
      .from("sima_mediciones_finales")
      .select("fecha")
      .order("fecha", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("purpleair_sensores")
      .select("id", { count: "exact", head: true })
      .eq("estatus", "activo"),
  ]);
  const error = mediciones.error ?? desde.error ?? sensores.error;
  if (error) throw new Error(`Failed to load cifras: ${error.message}`);
  return {
    mediciones: mediciones.count ?? 0,
    desde: desde.data?.fecha ?? null,
    sensores: sensores.count ?? 0,
  };
}, "home-cifras");

export default async function DatosEnCifras() {
  const [estaciones, cifras] = await Promise.all([
    fetchEstaciones().catch(() => null),
    fetchCifras().catch(() => null),
  ]);
  // Proof that can't be checked against the data isn't shown at all.
  if (!estaciones || !cifras?.desde || cifras.mediciones === 0) return null;

  const [ano, mes] = cifras.desde.split("-").map(Number);
  // Rounded down to a ten: the active count moves hour to hour.
  const sensores = Math.floor(cifras.sensores / 10) * 10;

  const items = [
    {
      value: String(estaciones.length),
      label: "estaciones oficiales de la red estatal, validadas contra SINAICA",
    },
    { value: `${sensores}+`, label: "sensores ciudadanos en la zona metropolitana" },
    {
      value: cifras.mediciones.toLocaleString("es-MX"),
      label: `mediciones horarias validadas de PM2.5 y PM10 desde ${MESES[mes - 1]} de ${ano}`,
    },
    { value: "NOM-025", label: "cálculos conforme a la norma oficial de salud" },
  ];

  return (
    <section aria-labelledby="datos-en-cifras" className="mx-auto w-full max-w-7xl px-6 pb-24 lg:px-8">
      <h2 id="datos-en-cifras" className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
        Datos abiertos, validados y con metodología oficial
      </h2>
      <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.value} className="flex flex-col gap-2 border-t border-gray-200 pt-6">
            <dt className="order-last text-sm leading-relaxed text-gray-600 md:text-base">{item.label}</dt>
            <dd className="text-3xl font-extrabold tracking-tight tabular-nums text-gray-900 md:text-5xl">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600 md:text-base">
        Descarga libre bajo licencia CC BY 4.0.
        <Link
          href="/datos"
          className="rounded-xl font-medium text-[#226caf] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
        >
          Explorar los datos →
        </Link>
      </p>
    </section>
  );
}
