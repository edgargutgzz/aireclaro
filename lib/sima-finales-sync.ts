import type { SupabaseClient } from "@supabase/supabase-js";

// Pulls SINAICA's hourly readings for [fechaInit, fechaFin) for the 15
// Monterrey metro SIMA stations into sima_mediciones_finales, for the monthly
// sync (the closed month, then the /datos precomputes). Request shape mirrors
// the proven month-window fetch from the sibling `sinaica` project.

const SINAICA_URL = "https://sinaica.inecc.gob.mx/lib/libd/cnxn.php";
export const DEFAULT_PARAMS = ["PM2.5", "PM10"];

interface SinaicaRow {
  fecha: string;
  hora: string | number;
  valor: string | number;
  val: string | number;
  bandO?: string | null;
}

export function iso(d: Date) {
  return d.toISOString().slice(0, 10);
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

async function fetchStationRange(
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

export interface FinalesSyncResult {
  estaciones: number;
  rowsWritten: number;
  errors: string[];
}

export async function syncMedicionesFinales(
  supabase: SupabaseClient,
  fechaInit: string,
  fechaFin: string,
  params: string[],
): Promise<FinalesSyncResult> {
  const { data: estaciones, error: estacionesError } = await supabase
    .from("sima_sensores")
    .select("sensor_id, sinaica_id")
    .neq("sensor_id", "FIN");

  if (estacionesError || !estaciones) {
    throw new Error(estacionesError?.message ?? "no stations found");
  }

  const dates = datesInRange(fechaInit, fechaFin);
  let rowsWritten = 0;
  const errors: string[] = [];

  for (const estacion of estaciones) {
    const rows = [];

    for (const param of params) {
      try {
        const registros = await fetchStationRange(estacion.sinaica_id, fechaInit, fechaFin, param);

        // Full grid: one row per hour of every date in the range, even when
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

  return { estaciones: estaciones.length, rowsWritten, errors };
}
