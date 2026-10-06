import type { SupabaseClient } from "@supabase/supabase-js";

// One read of the sima_promedios_diarios view for the monthly cron, shared by
// all three /datos precomputes (días insalubres, cobertura, promedio anual).
// The view recomputes every daily average on each call, so it used to be read
// three times per run; on 2026-10-06 the first of those reads failed
// (September never reached días insalubres) while the other two got through.
// Reading it once cuts the load to a third and means the three tables always
// come from the same rows.
//
// One row per (sensor_id, fecha, parametro) for PM2.5 and PM10, metro area
// only (FIN is Saltillo). `promedio` is null when the day missed the
// >=18-valid-hour rule: a real row, which cobertura needs ("not covered");
// the other two drop those rows themselves.

export interface PromedioDiario {
  sensor_id: string;
  fecha: string;
  promedio: number | null;
  parametro: "PM2.5" | "PM10";
}

const PAGE_SIZE = 1000;
// Pages in flight at once: all at once overloaded Postgres, one at a time
// was slow enough to trip a gateway timeout (2026-09-12).
const BATCH_SIZE = 4;
// A page that fails (a statement timeout under load) is retried after these
// pauses before the whole read gives up.
const RETRY_DELAYS_MS = [2_000, 5_000];

function pageQuery(supabase: SupabaseClient, from: number) {
  return supabase
    .from("sima_promedios_diarios")
    .select("sensor_id, fecha, promedio, parametro", { count: "exact" })
    .in("parametro", ["PM2.5", "PM10"])
    .neq("sensor_id", "FIN")
    .order("fecha", { ascending: true })
    .order("sensor_id", { ascending: true })
    .order("parametro", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);
}

async function fetchPage(supabase: SupabaseClient, from: number) {
  for (let attempt = 0; ; attempt++) {
    const page = await pageQuery(supabase, from);
    if (!page.error) return page;
    if (attempt >= RETRY_DELAYS_MS.length) {
      throw new Error(`Failed to load sima_promedios_diarios (rows ${from}+): ${page.error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
  }
}

export async function fetchPromediosDiarios(supabase: SupabaseClient): Promise<PromedioDiario[]> {
  const first = await fetchPage(supabase, 0);
  const total = first.count ?? first.data?.length ?? 0;
  const rows = [...((first.data ?? []) as PromedioDiario[])];

  const remainingPages = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  for (let batchStart = 0; batchStart < remainingPages; batchStart += BATCH_SIZE) {
    const pages = await Promise.all(
      Array.from({ length: Math.min(BATCH_SIZE, remainingPages - batchStart) }, (_, j) =>
        fetchPage(supabase, (batchStart + j + 1) * PAGE_SIZE),
      ),
    );
    for (const page of pages) rows.push(...((page.data ?? []) as PromedioDiario[]));
  }
  return rows;
}
