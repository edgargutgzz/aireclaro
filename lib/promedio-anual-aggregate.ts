import type { SupabaseClient } from "@supabase/supabase-js";

// Shared by the monthly sync cron, same pattern as lib/dias-insalubres-aggregate.ts
// and lib/cobertura-aggregate.ts. Reads sima_promedios_diarios (already applies
// the >=18-valid-hour / 75% completeness rule per station/day) and rolls valid
// days up into months, then trimesters, following the client's own published
// methodology for this exact chart (observatoriodelaire.com/datos, Metodología
// tab, NOM-025-SSA1-2021): a trimester is valid when the station reported
// measurements on >=75% of THAT TRIMESTER'S OWN calendar days -- a direct
// day-count check on the trimester, not built from month validity.
//
// The monthly step exists for the VALUE, not the validity gate: `promedio` is
// the mean of only the trimester's individually-valid months' own averages
// (each month needs >=75% of that month's days on its own), so one bad month
// inside an otherwise-valid trimester doesn't drag the average down with data
// that didn't clear the same bar everything else has to. A trimester that
// clears its own 75% can never have zero individually-valid months among its
// 3 (the weighted average of three ratios all below 0.75 can't reach 0.75
// itself), so `promedio` is always defined whenever `valido` is true.
//
// Saltillo (FIN) excluded, per project convention -- it isn't part of this
// metro area. PM2.5 only for now, per explicit scope.

export interface TrimestreRow {
  sensor_id: string;
  ano: number;
  trimestre: number; // 1-4
  dias_validos: number;
  dias_totales: number;
  valido: boolean;
  promedio: number | null;
}

const TRIMESTRE_MESES: Record<number, number[]> = {
  1: [1, 2, 3],
  2: [4, 5, 6],
  3: [7, 8, 9],
  4: [10, 11, 12],
};

// Day 0 of next month == the last day of this month, in UTC (no timezone
// drift from local calendars, matching every other date handling in this
// pipeline which works off SINAICA's fecha strings directly).
function daysInMonth(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

function baseQuery(supabase: SupabaseClient) {
  return supabase
    .from("sima_promedios_diarios")
    .select("sensor_id, fecha, promedio", { count: "exact" })
    .eq("parametro", "PM2.5")
    .neq("sensor_id", "FIN")
    .not("promedio", "is", null)
    .order("fecha", { ascending: true })
    .order("sensor_id", { ascending: true });
}

// Same paginate-in-small-concurrent-batches shape as
// cobertura-aggregate.ts/dias-insalubres-aggregate.ts -- only valid days are
// fetched (the "not null" filter above), since invalid days contribute
// nothing to a sum and the day-count denominators below are pure calendar
// arithmetic, not row counts.
const BATCH_SIZE = 4;

async function fetchAllValidDays(supabase: SupabaseClient) {
  const pageSize = 1000;
  type Row = { sensor_id: string; fecha: string; promedio: number };

  const first = await baseQuery(supabase).range(0, pageSize - 1);
  if (first.error) {
    throw new Error(`Failed to load promedio anual: ${first.error.message}`);
  }
  const total = first.count ?? first.data?.length ?? 0;

  const rows: Row[] = [...((first.data ?? []) as Row[])];
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
        throw new Error(`Failed to load promedio anual: ${page.error.message}`);
      }
      rows.push(...((page.data ?? []) as Row[]));
    }
  }
  return rows;
}

export async function computePromedioTrimestral(supabase: SupabaseClient): Promise<TrimestreRow[]> {
  const rows = await fetchAllValidDays(supabase);

  // (sensor_id, ano, mes) -> that month's valid daily averages.
  const porMes = new Map<string, number[]>();
  for (const row of rows) {
    const ano = Number(row.fecha.slice(0, 4));
    const mes = Number(row.fecha.slice(5, 7));
    const key = `${row.sensor_id}|${ano}|${mes}`;
    const lista = porMes.get(key) ?? [];
    lista.push(row.promedio);
    porMes.set(key, lista);
  }

  // Every (sensor, year) that shows up anywhere in the data -- a sensor with
  // zero valid days all year simply won't appear here, and the chart treats
  // "no trimester rows at all" the same as "0/4 válidos" (falta de
  // información), so there's no need to enumerate every known sensor here.
  const sensorYears = new Set<string>();
  for (const key of porMes.keys()) {
    const [sensorId, ano] = key.split("|");
    sensorYears.add(`${sensorId}|${ano}`);
  }

  const out: TrimestreRow[] = [];
  for (const sensorYear of sensorYears) {
    const [sensorId, anoStr] = sensorYear.split("|");
    const ano = Number(anoStr);

    for (const trimestre of [1, 2, 3, 4]) {
      let diasValidos = 0;
      let diasTotales = 0;
      const promediosMensualesValidos: number[] = [];

      for (const mes of TRIMESTRE_MESES[trimestre]) {
        const totalMes = daysInMonth(ano, mes);
        diasTotales += totalMes;
        const valores = porMes.get(`${sensorId}|${ano}|${mes}`) ?? [];
        diasValidos += valores.length;
        if (valores.length / totalMes >= 0.75) {
          promediosMensualesValidos.push(valores.reduce((a, b) => a + b, 0) / valores.length);
        }
      }

      const valido = diasValidos / diasTotales >= 0.75;
      const promedio = valido
        ? promediosMensualesValidos.reduce((a, b) => a + b, 0) / promediosMensualesValidos.length
        : null;

      out.push({
        sensor_id: sensorId,
        ano,
        trimestre,
        dias_validos: diasValidos,
        dias_totales: diasTotales,
        valido,
        promedio,
      });
    }
  }

  return out;
}
