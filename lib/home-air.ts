import { cachedMapData } from "@/components/data/cache";
import { cachedDatos } from "@/lib/datos-cache";
import { createPublicClient } from "@/utils/supabase/public";
import { getPM25Color } from "@/lib/air-quality";
import { monterreyNaiveHoursAgo, monterreyNaiveNow, parseMonterreyNaive } from "@/lib/monterrey-time";

// Data for the homepage's live pieces (the ticker above the navbar and the
// two cards under the hero).

// Older than this, a reading isn't "en vivo" anymore.
const LIVE_MAX_AGE_MS = 3 * 60 * 60 * 1000;

export interface LiveStation {
  sensorId: string;
  pm25: number;
  // The station's reading from the hour before, when there is one.
  prev: number | null;
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

// One entry per metro station (FIN is Saltillo) with a real reading (the
// map's no-data rule) from the last 3 hours, plus its previous hour's value.
// Rows are bucketed by hour, so a duplicate write within an hour can't pose
// as the "previous" reading.
export async function getLiveStations(): Promise<LiveStation[]> {
  const rows = await fetchRecientes();
  const now = parseMonterreyNaive(monterreyNaiveNow()).getTime();
  const porEstacion = new Map<string, { hour: string; pm25: number; ts: string }[]>();
  for (const r of rows) {
    if (r.sensor_id === "FIN" || getPM25Color(r.pm25) === null) continue;
    const hours = porEstacion.get(r.sensor_id) ?? [];
    const hour = r.time_stamp.slice(0, 13);
    if (hours.length === 0 || hours[hours.length - 1].hour !== hour) {
      hours.push({ hour, pm25: r.pm25, ts: r.time_stamp });
    }
    porEstacion.set(r.sensor_id, hours);
  }
  return [...porEstacion.entries()]
    .filter(([, h]) => now - parseMonterreyNaive(h[0].ts).getTime() < LIVE_MAX_AGE_MS)
    .map(([sensorId, h]) => ({ sensorId, pm25: h[0].pm25, prev: h[1]?.pm25 ?? null, timeStamp: h[0].ts }));
}

// "3:00 PM": the hour the latest of these readings belongs to, the map's own
// label for it.
export function horaDeLectura(stations: LiveStation[]): string {
  const latest = stations.reduce((a, b) => (a.timeStamp > b.timeStamp ? a : b)).timeStamp;
  const h = parseMonterreyNaive(latest).getUTCHours();
  return `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;
}

export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

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
  return {
    ano,
    dias: meses.reduce((sum, r) => sum + r.dias_insalubres_limite_actual, 0),
    primerMes: meses[0].mes,
    ultimoMes: meses[meses.length - 1].mes,
  };
}, "home-dias-sobre-norma");
