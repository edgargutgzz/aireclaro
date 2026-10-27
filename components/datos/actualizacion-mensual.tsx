import { fetchEstaciones, fetchUltimoMes } from "@/lib/datos-cache";

const FIRST_YEAR = 2025; // the first month /datos has, January 2025

const nombreMes = (ano: number, m: number) =>
  new Intl.DateTimeFormat("es-MX", { month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(ano, m - 1, 1)))
    .replace(".", "");

// The dashboard's header: title, what the data is, then the period and update
// cadence as chips (the chart header controls' tinted h-8 shape), one block
// over a hairline that anchors it above the charts. Station count and last
// month come from the data.
export default async function ActualizacionMensual() {
  const [estaciones, ultimo] = await Promise.all([
    fetchEstaciones().catch(() => null),
    fetchUltimoMes().catch(() => null),
  ]);

  const chips = [
    ultimo && {
      label: "Periodo",
      valor: `ene ${FIRST_YEAR} a ${nombreMes(ultimo.ano, ultimo.mes)} ${ultimo.ano}`,
    },
    { label: "Actualización", valor: "mensual" },
  ].filter(Boolean) as { label: string; valor: string }[];

  return (
    <header className="mb-8 border-b border-stone-200 pb-6">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-neutral-800">Datos de calidad del aire</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Mediciones horarias de PM2.5 y PM10 de {estaciones ? `las ${estaciones.length} estaciones` : "las estaciones"} del
          SIMA en la Zona Metropolitana de Monterrey.
        </p>
      </div>
      <dl className="mt-4 flex flex-wrap gap-2">
        {chips.map(({ label, valor }) => (
          <div key={label} className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-xl bg-stone-100 px-3 text-[13px]">
            <dt className="text-neutral-500">{label}</dt>
            <dd className="font-medium text-neutral-700">{valor}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
