import type { SupabaseClient } from "@supabase/supabase-js";

// Shared by the monthly sync cron, same as lib/dias-insalubres-aggregate.ts.
// Reads sima_promedios_diarios for both pollutants -- that view emits one row
// per (sensor_id, fecha, parametro) for the *entire* ingested range, with
// promedio NULL when the >=18-valid-hour / 75% completeness rule wasn't met
// (a real row, not a missing one -- see project memory). So "cubierto" is
// simply "promedio is not null", no separate threshold logic needed here.
// Saltillo (FIN) excluded, per project convention, it isn't part of this
// metro area.

export interface CoberturaDia {
  sensor_id: string;
  fecha: string;
  parametro: "PM2.5" | "PM10";
  cubierto: boolean;
}

function baseQuery(supabase: SupabaseClient) {
  return supabase
    .from("sima_promedios_diarios")
    .select("sensor_id, fecha, promedio, parametro", { count: "exact" })
    .in("parametro", ["PM2.5", "PM10"])
    .neq("sensor_id", "FIN")
    .order("fecha", { ascending: true })
    .order("sensor_id", { ascending: true })
    .order("parametro", { ascending: true });
}

const BATCH_SIZE = 4;

export async function computeCoberturaDiaria(supabase: SupabaseClient): Promise<CoberturaDia[]> {
  const pageSize = 1000;
  type Row = {
    sensor_id: string;
    fecha: string;
    promedio: number | null;
    parametro: "PM2.5" | "PM10";
  };

  const first = await baseQuery(supabase).range(0, pageSize - 1);
  if (first.error) {
    throw new Error(`Failed to load cobertura de estaciones: ${first.error.message}`);
  }
  const total = first.count ?? first.data?.length ?? 0;

  const rows: Row[] = [...(first.data ?? [])];
  const remainingPages = Math.max(0, Math.ceil(total / pageSize) - 1);
  for (let batchStart = 0; batchStart < remainingPages; batchStart += BATCH_SIZE) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(BATCH_SIZE, remainingPages - batchStart) }, (_, j) => {
        const i = batchStart + j;
        const from = (i + 1) * pageSize;
        return baseQuery(supabase).range(from, from + pageSize - 1);
      }),
    );
    for (const page of batch) {
      if (page.error) {
        throw new Error(`Failed to load cobertura de estaciones: ${page.error.message}`);
      }
      rows.push(...(page.data ?? []));
    }
  }

  return rows.map((r) => ({
    sensor_id: r.sensor_id,
    fecha: r.fecha,
    parametro: r.parametro,
    cubierto: r.promedio !== null,
  }));
}
