import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { monterreyNaiveNow } from "@/lib/monterrey-time";

// The map's live SIMA feed: every hour, the latest PM2.5 hour SINAICA has
// published today for each station, appended to sima_mediciones. Separate
// from sima-monthly-sync, which writes the finalized month into
// sima_mediciones_finales. Ported from the standalone `aireclaro-sima` Render
// job; same request, same row shape.
//
// time_stamp is when this job ran (naive Monterrey wall-clock), not the hour
// the reading belongs to -- the convention the old job settled on after
// trying both, and what the map's "latest per station" read expects.

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
  const fecha = now.slice(0, 10);
  const timeStamp = now.slice(0, 19);

  const supabase = createServiceClient();

  const { data: estaciones, error: estacionesError } = await supabase
    .from("sima_sensores")
    .select("sensor_id, sinaica_id")
    .not("sinaica_id", "is", null);

  if (estacionesError || !estaciones) {
    return NextResponse.json(
      { error: estacionesError?.message ?? "no stations found" },
      { status: 500 },
    );
  }

  const rows: { sensor_id: string; pm25: number; time_stamp: string }[] = [];
  const errors: string[] = [];

  for (const estacion of estaciones) {
    try {
      const registros = await fetchStationDay(estacion.sinaica_id, fecha);
      const latest = registros.reduce<SinaicaRow | null>(
        (best, r) => (best === null || Number(r.hora) > Number(best.hora) ? r : best),
        null,
      );
      const pm25 = latest?.valor != null && latest.valor !== "" ? Number(latest.valor) : NaN;
      if (Number.isFinite(pm25)) {
        rows.push({ sensor_id: estacion.sensor_id, pm25: Math.round(pm25), time_stamp: timeStamp });
      }
    } catch (err) {
      errors.push(`${estacion.sensor_id}: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Be polite to SINAICA's server between requests.
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("sima_mediciones").insert(rows);
    if (error) errors.push(`insert: ${error.message}`);
  }

  if (errors.length > 0) console.error("sima-hourly-sync errors:", errors);

  return NextResponse.json({
    fecha,
    timeStamp,
    estaciones: estaciones.length,
    rowsWritten: rows.length,
    errors,
  });
}
