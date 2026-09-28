import { createPublicClient } from "@/utils/supabase/public";
import CoberturaEstacionesChart from "@/components/datos/cobertura-estaciones-chart";

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
      cobertura={cobertura}
    />
  );
}
