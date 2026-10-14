import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { monterreyNaiveHoursAgo, monterreyNaiveNow, parseMonterreyNaive } from "@/lib/monterrey-time";
import { LIVE_HOURS } from "@/lib/live-readings";

// The map's live SIMA feed: each station's latest hourly PM2.5, appended to
// sima_mediciones. Separate from sima-monthly-sync, which writes the
// finalized month from SINAICA into sima_mediciones_finales.
//
// The 15 Nuevo León stations are read straight from SIMA's own map
// (aire.nl.gob.mx), which has each hour well before SINAICA does and keeps
// updating when SIMA's link to SINAICA breaks. That page has no API: the map
// frame embeds its data as JS arrays, and `arrayIMKTodo6` is the hourly PM2.5
// concentration per station (the same number as SIMA's station report,
// "Datos horarios de Concentraciones"), not the index the map's bubbles show.
// Saltillo (FIN) isn't in SIMA's network, so it still comes from SINAICA.
//
// Runs every 10 minutes (vercel.json), because a new hour appears at no fixed
// minute: polling picks it up within 10 minutes. Each hour is written once,
// stamped with the hour it belongs to (time_stamp = the reading's hour as
// naive Monterrey wall-clock, "15:00:00"), so a run only writes a station
// whose source hour is newer than its latest row.
//
// A station whose latest hour is old is skipped, not written, so a station
// (or a whole network) that stops reporting goes gray on the map instead of
// showing an old value as live.

// The newest hour SINAICA has for a station can be this far behind the run
// before it counts as stale (normal publishing lag is 0-1 h). Also how far
// back sima_mediciones is read for each station's latest written hour.
const MAX_LAG_MS = LIVE_HOURS * 60 * 60 * 1000;

export const maxDuration = 120;

const SIMA_MAP_URL = "https://aire.nl.gob.mx/airemapbing/airebing_icars_alt_ns_newNL_4.php";
const SINAICA_URL = "https://sinaica.inecc.gob.mx/lib/libd/cnxn.php";

// SIMA's station names on its map, to our sensor_id codes (the map's own
// `locations` array pairs them the same way, except it calls SUR "S").
const SIMA_MAP_STATIONS: Record<string, string> = {
  centro: "CE",
  este: "NE3",
  noreste: "NE",
  noreste2: "NE2",
  noroeste: "NO",
  noroeste2: "NO2",
  noroeste3: "NO3",
  norte: "N",
  norte2: "N2",
  sur: "SUR",
  sureste: "SE",
  sureste2: "SE2",
  sureste3: "SE3",
  suroeste: "SO",
  suroeste2: "SO2",
};
const SIMA_MAP_SENSORS = new Set(Object.values(SIMA_MAP_STATIONS));

interface Reading {
  // The reading's hour, naive Monterrey wall-clock parsed as UTC (like `now`).
  ms: number;
  pm25: number;
}

function toPm25(valor: unknown): number {
  const n = valor != null && valor !== "" ? Number(valor) : NaN;
  // -9999 and other negatives mean no data.
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

// Every station's current hour from SIMA's map, by sensor_id.
async function fetchSimaMap(): Promise<Map<string, Reading>> {
  const res = await fetch(SIMA_MAP_URL, {
    // Say who we are, so SIMA can reach us instead of blocking an anonymous client.
    headers: { "User-Agent": "ObservatorioDelAire/1.0 (+https://observatoriodelaire.com)" },
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  // The array is written on a single line, so the match stops at its end.
  const match = html.match(/var\s+arrayIMKTodo6\s*=\s*(\[.*\])/);
  if (!match) throw new Error("arrayIMKTodo6 not found");
  const rows = JSON.parse(match[1]) as {
    Estacion: string;
    Parameter: string;
    HrAveData: string | number | null;
    Date: string;
  }[];

  const readings = new Map<string, Reading>();
  for (const r of rows) {
    const sensorId = SIMA_MAP_STATIONS[r.Estacion];
    const pm25 = toPm25(r.HrAveData);
    if (!sensorId || r.Parameter.trim() !== "PM2.5" || Number.isNaN(pm25)) continue;
    readings.set(sensorId, { ms: parseMonterreyNaive(`${r.Date.slice(0, 13)}:00:00`).getTime(), pm25 });
  }
  return readings;
}

interface SinaicaRow {
  hora: string | number;
  valor: string | number | null;
}

async function fetchStationDay(sinaicaId: number, fecha: string): Promise<SinaicaRow[]> {
  const body = new URLSearchParams({
    metodo: "getDatos",
    estacionesId: String(sinaicaId),
    fechaInit: fecha,
    fechaFin: fecha,
    paramId: "PM2.5",
    nivel: "1000",
    campos: "2",
    limit: "1",
    inc: "1",
    soloVal: "1",
  });

  const res = await fetch(SINAICA_URL, {
    method: "POST",
    body,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const text = (await res.text()).trim();
  if (!text || text === "null" || text === "[]") return [];
  return JSON.parse(text) as SinaicaRow[];
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = monterreyNaiveNow();
  const nowMs = parseMonterreyNaive(now).getTime();
  const hourStartMs = nowMs - (nowMs % 3_600_000);
  // In the first hours of the day, yesterday's last hours can still be the
  // newest SINAICA has (the 23:00 reading lands after midnight).
  const fechas = [now.slice(0, 10)];
  if (nowMs - Date.parse(`${fechas[0]}T00:00:00Z`) < MAX_LAG_MS) {
    fechas.unshift(new Date(nowMs - 86_400_000).toISOString().slice(0, 10));
  }

  const supabase = createServiceClient();

  const [{ data: estaciones, error: estacionesError }, { data: recientes, error: recientesError }] =
    await Promise.all([
      supabase.from("sima_sensores").select("sensor_id, sinaica_id").not("sinaica_id", "is", null),
      supabase
        .from("sima_mediciones")
        .select("sensor_id, time_stamp")
        .gte("time_stamp", monterreyNaiveHoursAgo(MAX_LAG_MS / 3_600_000)),
    ]);

  if (estacionesError || !estaciones || recientesError) {
    return NextResponse.json(
      { error: estacionesError?.message ?? recientesError?.message ?? "no stations found" },
      { status: 500 },
    );
  }

  // Each station's latest written hour.
  const written = new Map<string, number>();
  for (const r of recientes ?? []) {
    const ms = parseMonterreyNaive(r.time_stamp).getTime();
    if (ms > (written.get(r.sensor_id) ?? 0)) written.set(r.sensor_id, ms);
  }

  const rows: { sensor_id: string; pm25: number; time_stamp: string }[] = [];
  const errors: string[] = [];
  const stale: string[] = [];

  // Stations not yet holding the current hour.
  const pendientes = estaciones.filter((e) => (written.get(e.sensor_id) ?? 0) < hourStartMs);
  const latest = new Map<string, Reading>();

  // SIMA's page updates every station at once, so once any of them holds the
  // current hour this hour's page has been read: no more requests until the
  // next hour (a station missing from it, like NO3 with no PM2.5 monitor,
  // would otherwise keep every run fetching). About 2-3 requests an hour.
  const simaMapDone = [...SIMA_MAP_SENSORS].some((id) => (written.get(id) ?? 0) >= hourStartMs);
  if (!simaMapDone) {
    try {
      for (const [sensorId, reading] of await fetchSimaMap()) latest.set(sensorId, reading);
    } catch (err) {
      errors.push(`aire.nl.gob.mx: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  for (const estacion of pendientes) {
    if (SIMA_MAP_SENSORS.has(estacion.sensor_id)) continue;
    try {
      for (const fecha of fechas) {
        for (const r of await fetchStationDay(estacion.sinaica_id, fecha)) {
          const ms = Date.parse(`${fecha}T00:00:00Z`) + Number(r.hora) * 3_600_000;
          const pm25 = toPm25(r.valor);
          const prev = latest.get(estacion.sensor_id);
          if (!Number.isNaN(pm25) && (!prev || ms > prev.ms)) latest.set(estacion.sensor_id, { ms, pm25 });
        }
        // Be polite to SINAICA's server between requests.
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } catch (err) {
      errors.push(`${estacion.sensor_id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  for (const estacion of pendientes) {
    const reading = latest.get(estacion.sensor_id);
    if (!reading || reading.ms <= (written.get(estacion.sensor_id) ?? 0)) continue;
    if (nowMs - reading.ms > MAX_LAG_MS) {
      stale.push(`${estacion.sensor_id} (${new Date(reading.ms).toISOString().slice(0, 13)})`);
    } else {
      rows.push({
        sensor_id: estacion.sensor_id,
        pm25: Math.round(reading.pm25),
        time_stamp: new Date(reading.ms).toISOString().slice(0, 19),
      });
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("sima_mediciones").insert(rows);
    if (error) errors.push(`insert: ${error.message}`);
  }

  if (errors.length > 0) console.error("sima-hourly-sync errors:", errors);

  return NextResponse.json({
    now,
    estaciones: estaciones.length,
    // Stations not yet holding the current hour, so looked up.
    pendientes: pendientes.length,
    rowsWritten: rows.length,
    // Stations skipped because their source's newest hour is too old.
    stale,
    errors,
  });
}
