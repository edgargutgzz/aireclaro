import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

// Pulls SINAICA's finalized (post-month-close) hourly readings (PM2.5 and
// PM10 by default) for the 15 Monterrey metro SIMA stations into
// sima_mediciones_finales. Separate from sima_mediciones (the live hourly
// mirror the map reads) and from sima_sensores (only read here, never
// written). Request shape mirrors the proven month-window fetch from the
// sibling `sinaica` project.

export const maxDuration = 120;

const SINAICA_URL = "https://sinaica.inecc.gob.mx/lib/libd/cnxn.php";
const DEFAULT_PARAMS = ["PM2.5", "PM10"];

interface SinaicaRow {
  fecha: string;
  hora: string | number;
  valor: string | number;
  val: string | number;
  bandO?: string | null;
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthRange(year: number, month1indexed: number) {
  const start = new Date(Date.UTC(year, month1indexed - 1, 1));
  const end = new Date(Date.UTC(year, month1indexed, 1));
  return { fechaInit: iso(start), fechaFin: iso(end) };
}

// Every calendar date in [fechaInit, fechaFin), matching SINAICA's
// inclusive-start/exclusive-end convention.
function datesInRange(fechaInit: string, fechaFin: string): string[] {
  const dates: string[] = [];
  let current = new Date(`${fechaInit}T00:00:00Z`);
  const end = new Date(`${fechaFin}T00:00:00Z`);
  while (current < end) {
    dates.push(iso(current));
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
  }
  return dates;
}

// The month that closed most recently relative to `reference`.
function previousMonth(reference: Date) {
  const year = reference.getUTCFullYear();
  const currentMonth1indexed = reference.getUTCMonth() + 1;
  return currentMonth1indexed === 1
    ? { year: year - 1, month1indexed: 12 }
    : { year, month1indexed: currentMonth1indexed - 1 };
}

async function fetchStationMonth(
  sinaicaId: number,
  fechaInit: string,
  fechaFin: string,
  param: string,
): Promise<SinaicaRow[]> {
  const body = new URLSearchParams({
    metodo: "getDatos",
    estacionesId: String(sinaicaId),
    fechaInit,
    fechaFin,
    paramId: param,
    nivel: "1000",
    campos: "2",
    limit: "1",
    inc: "1",
    soloVal: "1",
  });

  const res = await fetch(SINAICA_URL, {
    method: "POST",
    body,
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const text = (await res.text()).trim();
  if (!text || text === "null" || text === "[]") return [];

  try {
    return JSON.parse(text) as SinaicaRow[];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Optional "YYYY-MM" override for manual backfill; defaults to the month
  // that just closed.
  const monthParam = request.nextUrl.searchParams.get("month");
  const target = monthParam
    ? {
        year: Number(monthParam.slice(0, 4)),
        month1indexed: Number(monthParam.slice(5, 7)),
      }
    : previousMonth(new Date());
  const { fechaInit, fechaFin } = monthRange(target.year, target.month1indexed);

  // Optional "PM2.5,O3" override so a future backfill (a past month, a
  // pollutant not in the default list) doesn't need a code change.
  const paramsOverride = request.nextUrl.searchParams.get("params");
  const params = paramsOverride ? paramsOverride.split(",").map((p) => p.trim()) : DEFAULT_PARAMS;

  const supabase = createServiceClient();

  const { data: estaciones, error: estacionesError } = await supabase
    .from("sima_sensores")
    .select("sensor_id, sinaica_id")
    .neq("sensor_id", "FIN");

  if (estacionesError || !estaciones) {
    return NextResponse.json(
      { error: estacionesError?.message ?? "no stations found" },
      { status: 500 },
    );
  }

  const dates = datesInRange(fechaInit, fechaFin);
  let rowsWritten = 0;
  const errors: string[] = [];

  for (const estacion of estaciones) {
    const rows = [];

    for (const param of params) {
      try {
        const registros = await fetchStationMonth(estacion.sinaica_id, fechaInit, fechaFin, param);

        // Full grid: one row per hour of every date in the month, even when
        // SINAICA returned nothing for it. NULL means "no data at all" so
        // it stays distinguishable from val=0 ("SINAICA has it, flagged
        // invalid").
        const byHour = new Map<string, SinaicaRow>();
        for (const r of registros) {
          byHour.set(`${r.fecha}|${Number(r.hora)}`, r);
        }

        for (const fecha of dates) {
          for (let hora = 0; hora < 24; hora++) {
            const r = byHour.get(`${fecha}|${hora}`);
            rows.push({
              sensor_id: estacion.sensor_id,
              sinaica_id: estacion.sinaica_id,
              parametro: param,
              fecha,
              hora,
              valor: r && r.valor !== "" && r.valor != null ? Number(r.valor) : null,
              val: r ? Number(r.val) : null,
              banda_o: r?.bandO || null,
            });
          }
        }
      } catch (err) {
        errors.push(
          `${estacion.sensor_id}/${param}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // Be polite to SINAICA's server between requests.
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    if (rows.length === 0) continue;

    const { error: upsertError } = await supabase
      .from("sima_mediciones_finales")
      .upsert(rows, { onConflict: "sensor_id,parametro,fecha,hora" });

    if (upsertError) {
      errors.push(`${estacion.sensor_id}: ${upsertError.message}`);
    } else {
      rowsWritten += rows.length;
    }
  }

  return NextResponse.json({
    fechaInit,
    fechaFin,
    params,
    estaciones: estaciones.length,
    rowsWritten,
    errors,
  });
}
