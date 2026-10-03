import { cachedMapData } from "@/components/data/cache";
import { cachedDatos } from "@/lib/datos-cache";
import { createPublicClient } from "@/utils/supabase/public";
import { getPM25Color } from "@/lib/air-quality";
import { monterreyNaiveHoursAgo, monterreyNaiveNow, parseMonterreyNaive } from "@/lib/monterrey-time";

// Data for the homepage's live ticker (components/home/ticker.tsx).

// Older than this, a reading isn't "en vivo" anymore.
const LIVE_MAX_AGE_MS = 3 * 60 * 60 * 1000;

export interface LiveStation {
  sensorId: string;
  pm25: number;
  timeStamp: string;
}

// The last few hours of the map's hourly SIMA feed, cached like the map's own
// reads.
const fetchRecientes = cachedMapData(async () => {
  const { data, error } = await createPublicClient()
    .from("sima_mediciones")
    .select("sensor_id, pm25, time_stamp")
    .gte("time_stamp", monterreyNaiveHoursAgo(4))
    .order("time_stamp", { ascending: false });
  if (error) throw new Error(`Failed to load lecturas recientes: ${error.message}`);
  return data ?? [];
}, "home-recientes");

// Each metro station's latest real reading (FIN is Saltillo; the map's own
// no-data rule), kept only if it's from the last 3 hours.
export async function getLiveStations(): Promise<LiveStation[]> {
  const rows = await fetchRecientes();
  const now = parseMonterreyNaive(monterreyNaiveNow()).getTime();
  const latest = new Map<string, LiveStation>();
  for (const r of rows) {
    if (r.sensor_id === "FIN" || getPM25Color(r.pm25) === null || latest.has(r.sensor_id)) continue;
    latest.set(r.sensor_id, { sensorId: r.sensor_id, pm25: r.pm25, timeStamp: r.time_stamp });
  }
  return [...latest.values()].filter(
    (s) => now - parseMonterreyNaive(s.timeStamp).getTime() < LIVE_MAX_AGE_MS,
  );
}

// "3:00 PM": the hour the latest of these readings belongs to, the map's own
// label for it.
export function horaDeLectura(stations: LiveStation[]): string {
  const latest = stations.reduce((a, b) => (a.timeStamp > b.timeStamp ? a : b)).timeStamp;
  const h = parseMonterreyNaive(latest).getUTCHours();
  return `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;
}

// The latest year in the "días sobre la norma" chart's table, on the current
// limit (the chart's own comparison column), PM2.5.
export const fetchDiasSobreNorma = cachedDatos(async () => {
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
  return { ano, dias: meses.reduce((sum, r) => sum + r.dias_insalubres_limite_actual, 0) };
}, "home-dias-sobre-norma");
