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
