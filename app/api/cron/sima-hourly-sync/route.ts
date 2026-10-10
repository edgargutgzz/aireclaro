import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { monterreyNaiveHoursAgo, monterreyNaiveNow, parseMonterreyNaive } from "@/lib/monterrey-time";

// The map's live SIMA feed: the latest PM2.5 hour SINAICA has published for
// each station, appended to sima_mediciones. Separate from sima-monthly-sync,
// which writes the finalized month into sima_mediciones_finales.
//
// Runs every 10 minutes (vercel.json), because SINAICA publishes each hour at
// no fixed minute (SIMA sends it on, usually somewhere in :15-:50, sometimes an
// hour or more late): polling picks a new hour up within 10 minutes of it
// appearing. Each hour is written once, stamped with the hour it belongs to
// (time_stamp = SINAICA's `hora` as naive Monterrey wall-clock, "15:00:00"),
// so a run only writes a station whose SINAICA hour is newer than its latest
// row, and doesn't even ask SINAICA for one that already has the current hour.
//
// A station whose latest SINAICA hour is old is skipped, not written, so a
// network that stops reporting (Nuevo León on 2026-10-05 from 10:00) goes
// gray on the map instead of showing an old value as live.

// The newest hour SINAICA has for a station can be this far behind the run
// before it counts as stale (normal publishing lag is 0-1 h). Also how far
// back sima_mediciones is read for each station's latest written hour.
const MAX_LAG_MS = 3 * 60 * 60 * 1000;

export const maxDuration = 120;

const SINAICA_URL = "https://sinaica.inecc.gob.mx/lib/libd/cnxn.php";

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
  let consultadas = 0;

  for (const estacion of estaciones) {
    const latestWritten = written.get(estacion.sensor_id) ?? 0;
    if (latestWritten >= hourStartMs) continue;
    consultadas++;
    try {
      let latest: { ms: number; valor: SinaicaRow["valor"] } | null = null;
      for (const fecha of fechas) {
        for (const r of await fetchStationDay(estacion.sinaica_id, fecha)) {
          // The reading's hour, in the same naive Monterrey terms as `now`.
          const ms = Date.parse(`${fecha}T00:00:00Z`) + Number(r.hora) * 3_600_000;
          if (!latest || ms > latest.ms) latest = { ms, valor: r.valor };
        }
        // Be polite to SINAICA's server between requests.
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      const pm25 = latest?.valor != null && latest.valor !== "" ? Number(latest.valor) : NaN;
      if (!latest || !Number.isFinite(pm25) || latest.ms <= latestWritten) continue;
      if (nowMs - latest.ms > MAX_LAG_MS) {
        stale.push(`${estacion.sensor_id} (${new Date(latest.ms).toISOString().slice(0, 13)})`);
      } else {
        rows.push({
          sensor_id: estacion.sensor_id,
          pm25: Math.round(pm25),
          time_stamp: new Date(latest.ms).toISOString().slice(0, 19),
        });
      }
    } catch (err) {
      errors.push(`${estacion.sensor_id}: ${err instanceof Error ? err.message : String(err)}`);
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
    // Stations not yet holding the current hour, so asked of SINAICA.
    consultadas,
    rowsWritten: rows.length,
    // Stations skipped because SINAICA's newest hour for them is too old.
    stale,
    errors,
  });
}
