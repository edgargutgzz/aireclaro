import { createPublicClient } from "@/utils/supabase/public";
import PromedioAnualChart from "@/components/datos/promedio-anual-chart";

// The monthly SINAICA sync cron (app/api/cron/sima-monthly-sync,
// lib/promedio-anual-aggregate.ts) computes this and writes the small
// precomputed result here -- this component just reads it, same division of
// labor as dias-insalubres.tsx / cobertura-estaciones.tsx. Row count is tiny
// (stations * years * 4 trimesters), no pagination needed.
export default async function PromedioAnualEstacion() {
  const supabase = createPublicClient();

  const [{ data: estaciones, error: estacionesError }, { data: trimestres, error: trimestresError }] =
    await Promise.all([
      supabase
        .from("sima_sensores")
        .select("sensor_id, nombre_display")
        .neq("sensor_id", "FIN")
        .order("nombre_display"),
      supabase
        .from("sima_promedio_trimestral")
        .select("sensor_id, ano, trimestre, parametro, dias_validos, dias_totales, valido, promedio"),
    ]);

  if (estacionesError) {
    throw new Error(`Failed to load promedio anual: ${estacionesError.message}`);
  }
  if (trimestresError) {
    throw new Error(`Failed to load promedio anual: ${trimestresError.message}`);
  }

  return (
    <PromedioAnualChart
      estaciones={(estaciones ?? []).map((e) => ({ sensorId: e.sensor_id, nombre: e.nombre_display }))}
      trimestres={trimestres ?? []}
    />
  );
}
