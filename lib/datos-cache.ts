import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/utils/supabase/public";

// Everything /datos reads changes only when the monthly sync cron runs
// (app/api/cron/sima-monthly-sync), so its reads are cached across requests
// and the cron clears them with revalidateTag(DATOS_CACHE_TAG) once it has
// written the new month. The daily revalidate is only a safety net in case a
// run doesn't clear it. A fetcher that throws isn't cached, so a failed
// query is retried on the next visit instead of being served for a day.
export const DATOS_CACHE_TAG = "datos";

export function cachedDatos<T>(fetcher: () => Promise<T>, key: string) {
  return unstable_cache(fetcher, ["datos", key], {
    tags: [DATOS_CACHE_TAG],
    revalidate: 86_400,
  });
}

export interface Estacion {
  sensorId: string;
  nombre: string;
}

// The station list three /datos sections share. FIN is Saltillo, outside the
// Monterrey metro network every /datos chart covers.
export const fetchEstaciones = cachedDatos(async (): Promise<Estacion[]> => {
  const { data, error } = await createPublicClient()
    .from("sima_sensores")
    .select("sensor_id, nombre_display")
    .neq("sensor_id", "FIN")
    .order("nombre_display");
  if (error) throw new Error(`Failed to load estaciones: ${error.message}`);
  return (data ?? []).map((e) => ({ sensorId: e.sensor_id, nombre: e.nombre_display }));
}, "estaciones");

// The latest month the /datos data runs through (PM2.5's, which every chart
// shares since one cron run writes them all). Read by the page header and by
// the /datos link card's image URL.
export const fetchUltimoMes = cachedDatos(async (): Promise<{ ano: number; mes: number } | null> => {
  const { data, error } = await createPublicClient()
    .from("sima_insalubres_mensual")
    .select("ano, mes")
    .eq("parametro", "PM2.5")
    .order("ano", { ascending: false })
    .order("mes", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to load último mes: ${error.message}`);
  return data;
}, "ultimo-mes");

// The first month the /datos data starts from (PM2.5's, like fetchUltimoMes):
// the start of the "Periodo" line in the page's "Sobre los datos" card.
export const fetchPrimerMes = cachedDatos(async (): Promise<{ ano: number; mes: number } | null> => {
  const { data, error } = await createPublicClient()
    .from("sima_insalubres_mensual")
    .select("ano, mes")
    .eq("parametro", "PM2.5")
    .order("ano", { ascending: true })
    .order("mes", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to load primer mes: ${error.message}`);
  return data;
}, "primer-mes");
