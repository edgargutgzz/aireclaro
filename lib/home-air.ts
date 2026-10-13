import { cachedMapData } from "@/components/data/cache";
import fetchPurpleAirData from "@/components/data/purple-air-data";
import fetchPurpleAirSensors from "@/components/data/purple-air-sensors";
import { estadoKey, municipioKey } from "@/components/mapa/lib";
import { createPublicClient } from "@/utils/supabase/public";
import { getPM25Color } from "@/lib/air-quality";
import { monterreyNaiveHoursAgo, monterreyNaiveNow, parseMonterreyNaive } from "@/lib/monterrey-time";

// Data for the homepage's live ticker (components/home/ticker.tsx): the
// official stations, and the citizen sensors it switches to when they're out.

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

export interface LiveMunicipio {
  key: string;
  nombre: string;
  // The median of its sensors' latest readings, rounded like the map's.
  pm25: number;
  // The sensor whose reading is the median (or closest to it), the one the
  // ticker opens on the map.
  sensorId: number;
  timeStamp: string;
}

// The ticker's short names, the ones the official stations already use
// ("San Pedro", "San Nicolás"); a municipality not listed keeps its own name.
const NOMBRE_CORTO: Record<string, string> = {
  "san pedro garza garcia": "San Pedro",
  "san nicolas de los garza": "San Nicolás",
  "cadereyta jimenez": "Cadereyta",
  garcia: "García",
  escobedo: "Escobedo",
};

function median(values: number[]): number {
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

// The ticker's fallback when the official network is out: citizen sensors in
// Nuevo León, one entry per municipality, the median of its sensors' latest
// readings (the map's PurpleAir feed, already limited to the last 3 hours and
// the map's hidden sensors). A median, so one faulty sensor can't lead the
// strip; every sensor is still on the map.
export async function getLiveMunicipios(): Promise<LiveMunicipio[]> {
  const [sensores, lecturas] = await Promise.all([fetchPurpleAirSensors(), fetchPurpleAirData()]);
  const porSensor = new Map(lecturas.map((r) => [r.sensor_id, r]));
  const grupos = new Map<string, { lecturas: { sensorId: number; pm25: number }[]; timeStamp: string; nombre: string }>();
  for (const s of sensores) {
    const r = porSensor.get(s.sensor_id);
    const key = municipioKey(s.municipio);
    if (!r || !key || estadoKey(s.estado) !== "nuevo leon" || getPM25Color(r.pm25) === null) continue;
    const g = grupos.get(key) ?? { lecturas: [] as { sensorId: number; pm25: number }[], timeStamp: r.time_stamp, nombre: NOMBRE_CORTO[key] ?? s.municipio.trim() };
    g.lecturas.push({ sensorId: s.sensor_id, pm25: r.pm25 });
    if (r.time_stamp > g.timeStamp) g.timeStamp = r.time_stamp;
    grupos.set(key, g);
  }
  return [...grupos].map(([key, g]) => {
    const m = median(g.lecturas.map((l) => l.pm25));
    const centro = g.lecturas.reduce((a, b) => (Math.abs(b.pm25 - m) < Math.abs(a.pm25 - m) ? b : a));
    return { key, nombre: g.nombre, pm25: Math.round(m), sensorId: centro.sensorId, timeStamp: g.timeStamp };
  });
}

// "3:00 PM": the hour the latest of these readings belongs to, the map's own
// label for it.
export function horaDeLectura(stations: { timeStamp: string }[]): string {
  const latest = stations.reduce((a, b) => (a.timeStamp > b.timeStamp ? a : b)).timeStamp;
  const h = parseMonterreyNaive(latest).getUTCHours();
  return `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;
}
