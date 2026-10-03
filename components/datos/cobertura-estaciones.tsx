import { createPublicClient } from "@/utils/supabase/public";
import CoberturaEstacionesChart, { type CoberturaCompacta } from "@/components/datos/cobertura-estaciones-chart";

// Reads the precomputed sima_cobertura_diaria table (written by the monthly
// sync cron, see lib/cobertura-aggregate.ts) -- a plain indexed table, not
// the expensive recomputing sima_promedios_diarios view, so pagination here
// carries none of the statement-timeout risk that view has. Still paginated
// because the full history is already well past PostgREST's 1000-row cap.
async function fetchAllCobertura(supabase: ReturnType<typeof createPublicClient>) {
  const pageSize = 1000;
  type Row = {
    sensor_id: string;
    fecha: string;
    parametro: "PM2.5" | "PM10";
    cubierto: boolean;
  };
  const rows: Row[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("sima_cobertura_diaria")
      .select("sensor_id, fecha, parametro, cubierto")
      .order("fecha", { ascending: true })
      .order("sensor_id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) {
      throw new Error(`Failed to load cobertura de estaciones: ${error.message}`);
    }
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

type CoberturaRow = Awaited<ReturnType<typeof fetchAllCobertura>>[number];

// Packs the rows into the chart's compact form (see CoberturaCompacta).
function compactar(rows: CoberturaRow[]): CoberturaCompacta {
  const result = {} as CoberturaCompacta;
  for (const parametro of ["PM2.5", "PM10"] as const) {
    const delParametro = rows.filter((r) => r.parametro === parametro);
    const fechas = [...new Set(delParametro.map((r) => r.fecha))].sort();
    const indice = new Map(fechas.map((f, i) => [f, i]));
    const codigos = new Map<string, string[]>();
    for (const r of delParametro) {
      if (!codigos.has(r.sensor_id)) codigos.set(r.sensor_id, Array(fechas.length).fill("-"));
      codigos.get(r.sensor_id)![indice.get(r.fecha)!] = r.cubierto ? "1" : "0";
    }
    result[parametro] = {
      fechas,
      porEstacion: Object.fromEntries([...codigos].map(([id, c]) => [id, c.join("")])),
    };
  }
  return result;
}

export default async function CoberturaEstaciones() {
  const supabase = createPublicClient();

  const [{ data: estaciones, error: estacionesError }, cobertura] = await Promise.all([
    supabase
      .from("sima_sensores")
      .select("sensor_id, nombre_display")
      .neq("sensor_id", "FIN")
      .order("nombre_display"),
    fetchAllCobertura(supabase),
  ]);

  if (estacionesError) {
    throw new Error(`Failed to load cobertura de estaciones: ${estacionesError.message}`);
  }

  return (
    <CoberturaEstacionesChart
      estaciones={(estaciones ?? []).map((e) => ({ sensorId: e.sensor_id, nombre: e.nombre_display }))}
      cobertura={compactar(cobertura)}
    />
  );
}
