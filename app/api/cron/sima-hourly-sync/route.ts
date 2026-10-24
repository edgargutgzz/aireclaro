import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { monterreyNaiveHoursAgo, monterreyNaiveNow, parseMonterreyNaive } from "@/lib/monterrey-time";
import { isValidPM25 } from "@/lib/air-quality";
import { LIVE_MINUTES } from "@/lib/live-readings";

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
// Noroeste 3 (NO3) is missing from that list, so it's read from its own SIMA
// station chart instead. Saltillo (FIN) isn't in SIMA's network, so it
// still comes from SINAICA.
//
// Runs every 5 minutes from :05 to :30 (vercel.json), because a new hour
// appears at no fixed minute: polling picks it up within 5 minutes. An hour
// posted after :30 waits for the next :05 run. Every run asks every
// station, even one already holding the current hour, because SIMA can
// change an hour's number after posting it. Each hour is one row, stamped
// with the hour it belongs to (time_stamp = the reading's hour as naive
// Monterrey wall-clock, "15:00:00"): a source hour newer than the station's
// latest row is inserted, the same hour with a different number updates
// that row (created_at keeps when the hour first arrived).
//
// A station whose latest hour is old is skipped, not written, so an old value
// is never stamped as a new hour.

// The map's live window: an hour older than this would show gray anyway, so
// it isn't written. Also how far back sima_mediciones is read for each
// station's latest written hour.
const MAX_LAG_MS = LIVE_MINUTES * 60 * 1000;

export const maxDuration = 120;

const SIMA_MAP_URL = "https://aire.nl.gob.mx/airemapbing/airebing_icars_alt_ns_newNL_4.php";
const SINAICA_URL = "https://sinaica.inecc.gob.mx/lib/libd/cnxn.php";

// SIMA's station names on its map, to our sensor_id codes (the map's own
// `locations` array pairs them the same way, except it calls SUR "S").
// `noroeste3` (NO3) is left out: the page has no hourly PM2.5 for it.
const SIMA_MAP_STATIONS: Record<string, string> = {
  centro: "CE",
  este: "NE3",
  noreste: "NE",
  noreste2: "NE2",
  noroeste: "NO",
  noroeste2: "NO2",
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

// Stations read from their SIMA station chart ("Datos" on SIMA's map), by
// the chart's own station name.
const SIMA_REPORT_URL = "https://aire.nl.gob.mx/SIMA2017reportes/";
const SIMA_REPORT_STATIONS: Record<string, string> = { NO3: "NOROESTE3" };
const USER_AGENT = "ObservatorioDelAire/1.0 (+https://observatoriodelaire.com)";

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
    headers: { "User-Agent": USER_AGENT },
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

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// One station's latest hour from its SIMA station chart ("Datos" on SIMA's
// map, then PM2.5): the page names the station in its URL and embeds the
// day's hourly series (`arrayParamsTodo`, hours only) under a written date
// ("14 de octubre de 2026"). An hour without data shows -9999 or 0, so the
// latest valid hour is taken. SIMA can revise or blank out earlier hours of
// the day; only the latest one is used.
async function fetchSimaReport(estacion: string): Promise<Reading | null> {
  const res = await fetch(`${SIMA_REPORT_URL}ReporteDiarioSimaC.php?estacion1=${estacion}&parametro1=PM2.5`, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const fecha = html.match(/Fecha del Reporte de Calidad del Aire:\s*<b>\s*[^,<]+,\s*(\d{1,2}) de (\w+) de (\d{4})/);
  const mes = fecha ? MESES.indexOf(fecha[2].toLowerCase()) : -1;
  if (!fecha || mes < 0) throw new Error("report date not found");
  const dia = `${fecha[3]}-${String(mes + 1).padStart(2, "0")}-${fecha[1].padStart(2, "0")}`;
  const match = html.match(/var\s+arrayParamsTodo\s*=\s*(\[.*\]);/);
  if (!match) throw new Error("arrayParamsTodo not found");
  const rows = JSON.parse(match[1]) as { Parameter: string; Date: string; HrAveData: number | string | null }[];

  let latest: Reading | null = null;
  for (const r of rows) {
    const pm25 = toPm25(r.HrAveData);
    if (r.Parameter.trim() !== "PM2.5" || !isValidPM25(pm25)) continue;
    const ms = parseMonterreyNaive(`${dia} ${r.Date.slice(0, 2)}:00:00`).getTime();
    if (!latest || ms > latest.ms) latest = { ms, pm25 };
  }
  return latest;
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
        .select("sensor_id, time_stamp, pm25")
        .gte("time_stamp", monterreyNaiveHoursAgo(MAX_LAG_MS / 3_600_000)),
    ]);

  if (estacionesError || !estaciones || recientesError) {
    return NextResponse.json(
      { error: estacionesError?.message ?? recientesError?.message ?? "no stations found" },
      { status: 500 },
    );
  }

  // Each station's latest written hour and its number.
  const written = new Map<string, Reading>();
  for (const r of recientes ?? []) {
    const ms = parseMonterreyNaive(r.time_stamp).getTime();
    if (ms > (written.get(r.sensor_id)?.ms ?? 0)) written.set(r.sensor_id, { ms, pm25: Number(r.pm25) });
  }

  const rows: { sensor_id: string; pm25: number; time_stamp: string }[] = [];
  const updates: { sensor_id: string; pm25: number; time_stamp: string }[] = [];
  const errors: string[] = [];
  const stale: string[] = [];
  const latest = new Map<string, Reading>();

  // SIMA's page updates every station at once: one request for all of them.
  try {
    for (const [sensorId, reading] of await fetchSimaMap()) latest.set(sensorId, reading);
  } catch (err) {
    errors.push(`aire.nl.gob.mx: ${err instanceof Error ? err.message : String(err)}`);
  }

  for (const estacion of estaciones) {
    if (SIMA_MAP_SENSORS.has(estacion.sensor_id)) continue;
    const reporte = SIMA_REPORT_STATIONS[estacion.sensor_id];
    if (reporte) {
      try {
        const reading = await fetchSimaReport(reporte);
        if (reading) latest.set(estacion.sensor_id, reading);
      } catch (err) {
        errors.push(`${estacion.sensor_id} (aire.nl.gob.mx): ${err instanceof Error ? err.message : String(err)}`);
      }
      continue;
    }
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

  for (const estacion of estaciones) {
    const reading = latest.get(estacion.sensor_id);
    if (!reading) continue;
    const prev = written.get(estacion.sensor_id);
    const row = {
      sensor_id: estacion.sensor_id,
      pm25: Math.round(reading.pm25),
      time_stamp: new Date(reading.ms).toISOString().slice(0, 19),
    };
    if (prev && reading.ms === prev.ms) {
      // The same hour, revised by the source.
      if (row.pm25 !== prev.pm25) updates.push(row);
    } else if (!prev || reading.ms > prev.ms) {
      if (nowMs - reading.ms > MAX_LAG_MS) {
        stale.push(`${estacion.sensor_id} (${new Date(reading.ms).toISOString().slice(0, 13)})`);
      } else {
        rows.push(row);
      }
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("sima_mediciones").insert(rows);
    if (error) errors.push(`insert: ${error.message}`);
  }
  for (const u of updates) {
    const { error } = await supabase
      .from("sima_mediciones")
      .update({ pm25: u.pm25 })
      .eq("sensor_id", u.sensor_id)
      .eq("time_stamp", u.time_stamp);
    if (error) errors.push(`update ${u.sensor_id}: ${error.message}`);
  }

  if (errors.length > 0) console.error("sima-hourly-sync errors:", errors);

  return NextResponse.json({
    now,
    estaciones: estaciones.length,
    rowsWritten: rows.length,
    // Stations whose stored hour the source has since changed.
    rowsUpdated: updates.map((u) => `${u.sensor_id} ${u.time_stamp.slice(11, 16)} → ${u.pm25}`),
    // Stations skipped because their source's newest hour is too old.
    stale,
    errors,
  });
}
