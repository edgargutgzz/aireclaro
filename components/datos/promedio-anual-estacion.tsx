import { createPublicClient } from "@/utils/supabase/public";
import { cachedDatos, fetchEstaciones } from "@/lib/datos-cache";
import PromedioAnualChart from "@/components/datos/promedio-anual-chart";

// The monthly SINAICA sync cron (app/api/cron/sima-monthly-sync,
// lib/promedio-anual-aggregate.ts) computes this and writes the small
// precomputed result here -- this component just reads it, same division of
// labor as dias-insalubres.tsx / cobertura-estaciones.tsx. Row count is tiny
// (stations * years * 4 trimesters), no pagination needed.
const fetchTrimestres = cachedDatos(async () => {
  const { data, error } = await createPublicClient()
    .from("sima_promedio_trimestral")
    .select("sensor_id, ano, trimestre, parametro, dias_validos, dias_totales, valido, promedio");
  if (error) throw new Error(`Failed to load promedio anual: ${error.message}`);
  return data ?? [];
}, "promedio-trimestral");

export default async function PromedioAnualEstacion() {
  const [estaciones, trimestres] = await Promise.all([fetchEstaciones(), fetchTrimestres()]);
  return <PromedioAnualChart estaciones={estaciones} trimestres={trimestres} />;
}
