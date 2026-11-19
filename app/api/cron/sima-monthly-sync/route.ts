import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { DATOS_CACHE_TAG } from "@/lib/datos-cache";
import { createServiceClient } from "@/utils/supabase/service";
import { computeDiasInsalubresMensual, type Pollutant } from "@/lib/dias-insalubres-aggregate";
import { computeCoberturaDiaria } from "@/lib/cobertura-aggregate";
import { computePromedioTrimestral } from "@/lib/promedio-anual-aggregate";
import { fetchPromediosDiarios, type PromedioDiario } from "@/lib/promedios-diarios";
import { DEFAULT_PARAMS, iso, syncMedicionesFinales } from "@/lib/sima-finales-sync";

// Pulls SINAICA's hourly readings for the month that just closed (PM2.5 and
// PM10 by default) into sima_mediciones_finales (lib/sima-finales-sync.ts),
// then recomputes the /datos tables from it.

export const maxDuration = 120;

function monthRange(year: number, month1indexed: number) {
  const start = new Date(Date.UTC(year, month1indexed - 1, 1));
  const end = new Date(Date.UTC(year, month1indexed, 1));
  return { fechaInit: iso(start), fechaFin: iso(end) };
}

// The month that closed most recently relative to `reference`.
function previousMonth(reference: Date) {
  const year = reference.getUTCFullYear();
  const currentMonth1indexed = reference.getUTCMonth() + 1;
  return currentMonth1indexed === 1
    ? { year: year - 1, month1indexed: 12 }
    : { year, month1indexed: currentMonth1indexed - 1 };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

  let sync;
  try {
    sync = await syncMedicionesFinales(supabase, fechaInit, fechaFin, params);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
  const { rowsWritten, errors } = sync;

  // /datos reads a precomputed month-level rollup (sima_insalubres_mensual)
  // instead of the ~15k-row sima_promedios_diarios view directly -- that
  // view recomputes its full aggregation on every call, which is fine for
  // one monthly cron run but was never meant to be hit on every page view
  // (2026-09-12 outage). Recompute the whole history (not just the target
  // month) so a re-sync or a threshold/HIDDEN_MONTHS change self-corrects
  // every month, not just going forward.
  //
  // All three precomputes below come from ONE read of the view (it used to be
  // read three times; on 2026-10-06 the first read failed and September never
  // reached días insalubres). The read retries failed pages itself.
  let promedios: PromedioDiario[] | null = null;
  let promediosError: string | undefined;
  if (rowsWritten > 0) {
    try {
      // Closed months only: the charts don't show a partial month.
      const inicioMesActual = iso(new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)));
      promedios = (await fetchPromediosDiarios(supabase)).filter((p) => p.fecha < inicioMesActual);
    } catch (err) {
      promediosError = err instanceof Error ? err.message : String(err);
    }
  }

  let diasInsalubresError: string | undefined;
  if (promedios) {
    try {
      const monthly = computeDiasInsalubresMensual(promedios);
      const upsertRows = (Object.entries(monthly) as [Pollutant, typeof monthly.pm25][]).flatMap(
        ([pollutant, months]) =>
          months.map((m) => ({
            ano: m.ano,
            mes: m.mesNumero,
            parametro: pollutant === "pm25" ? "PM2.5" : "PM10",
            dias_insalubres: m.diasInsalubres,
            dias_totales: m.diasTotales,
            dias_insalubres_limite_actual: m.diasInsalubresLimiteActual,
          })),
      );
      const { error } = await supabase
        .from("sima_insalubres_mensual")
        .upsert(upsertRows, { onConflict: "ano,mes,parametro" });
      if (error) diasInsalubresError = error.message;
    } catch (err) {
      diasInsalubresError = err instanceof Error ? err.message : String(err);
    }
  }

  // Same precompute pattern for the "Cobertura de estaciones" grid on
  // /datos -- one row per (sensor_id, fecha, parametro), chunked because the
  // full history is already well past a single upsert's comfortable row
  // count.
  let coberturaError: string | undefined;
  if (promedios) {
    try {
      const cobertura = computeCoberturaDiaria(promedios);
      const chunkSize = 1000;
      for (let i = 0; i < cobertura.length; i += chunkSize) {
        const chunk = cobertura.slice(i, i + chunkSize);
        const { error } = await supabase
          .from("sima_cobertura_diaria")
          .upsert(chunk, { onConflict: "sensor_id,fecha,parametro" });
        if (error) {
          coberturaError = error.message;
          break;
        }
      }
    } catch (err) {
      coberturaError = err instanceof Error ? err.message : String(err);
    }
  }

  // Same precompute pattern for "Promedio anual por estación" on /datos --
  // one row per (sensor_id, ano, trimestre, parametro), small enough
  // (stations * years * 4 * 2 pollutants) to upsert in one shot, no
  // chunking needed.
  let promedioTrimestralError: string | undefined;
  if (promedios) {
    try {
      const trimestres = computePromedioTrimestral(promedios);
      const { error } = await supabase
        .from("sima_promedio_trimestral")
        .upsert(trimestres, { onConflict: "sensor_id,ano,trimestre,parametro" });
      if (error) promedioTrimestralError = error.message;
    } catch (err) {
      promedioTrimestralError = err instanceof Error ? err.message : String(err);
    }
  }

  // /datos caches its reads until the data changes (lib/datos-cache.ts):
  // anything written this run expires them now, so the next visit reads the
  // new month instead of waiting out the daily safety-net revalidate.
  if (rowsWritten > 0) revalidateTag(DATOS_CACHE_TAG, { expire: 0 });

  // Failures go to the logs too, not only the response nobody sees (the
  // 2026-10-06 failure left no trace in Vercel).
  const failures = { promediosError, diasInsalubresError, coberturaError, promedioTrimestralError };
  if (errors.length > 0 || Object.values(failures).some(Boolean)) {
    console.error("sima-monthly-sync errors:", { errors, ...failures });
  }

  return NextResponse.json({
    fechaInit,
    fechaFin,
    params,
    estaciones: sync.estaciones,
    rowsWritten,
    errors,
    promediosError,
    diasInsalubresError,
    coberturaError,
    promedioTrimestralError,
  });
}
