import { createClient } from "@/utils/supabase/server";
import { getLimitForDate, getLimitForDatePM10 } from "@/lib/pm25-limits";
import DiasInsalubresChart, { type MonthData, type Pollutant } from "@/components/datos/dias-insalubres-chart";

// Reads sima_promedios_diarios (already applies the >=18-valid-hour / 75%
// completeness rule per station/day) and aggregates by month: a day counts
// as insalubre if ANY station's rounded daily average exceeds that date's
// NOM-025-SSA1-2021 limit. A day counts toward the month's total only if
// >=1 station reported. Saltillo (FIN) excluded, per project convention,
// it isn't part of this metro area.
const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// TEMPORARY: July 2026's finalized PM10 pull landed with an off-by-one day
// offset (a variant of the drifting SINAICA lag). Hide it from the PM10
// series until the ingestion is corrected and re-synced, then delete this.
// PM2.5 was re-verified as correct, so it's no longer hidden.
const HIDDEN_MONTHS: Record<"PM2.5" | "PM10", Set<string>> = {
  "PM2.5": new Set(),
  PM10: new Set(["2026-07"]),
};

function aggregateByMonth(
  rows: { fecha: string; promedio: number | null }[],
  getLimit: (fecha: string) => number,
): MonthData[] {
  const porDia = new Map<string, number[]>();
  for (const row of rows) {
    const lista = porDia.get(row.fecha) ?? [];
    lista.push(row.promedio as number);
    porDia.set(row.fecha, lista);
  }

  const porMes = new Map<string, MonthData>();
  for (const [fecha, valores] of porDia) {
    const [anoStr, mesStr] = fecha.split("-");
    const ano = Number(anoStr);
    const mesNumero = Number(mesStr);
    const key = `${anoStr}-${mesStr}`;
    const limite = getLimit(fecha);
    const excedido = valores.some((v) => Math.round(v) > limite);

    const actual = porMes.get(key) ?? {
      ano,
      mesNumero,
      mes: MONTHS_ES[mesNumero - 1],
      diasInsalubres: 0,
      diasTotales: 0,
    };
    actual.diasTotales += 1;
    if (excedido) actual.diasInsalubres += 1;
    porMes.set(key, actual);
  }

  return Array.from(porMes.values()).sort((a, b) => a.ano - b.ano || a.mesNumero - b.mesNumero);
}

// PostgREST caps an unpaginated select at 1000 rows. This table already
// exceeds that combined across both pollutants, so an unpaginated fetch
// silently drops rows (undercounting días insalubres) -- page through with
// .range(). sima_promedios_diarios is a view that recomputes its aggregation
// on every call, so pages are fetched in small concurrent batches (order is
// only needed for stable pagination, not for the aggregation below) --
// fetching all ~19 at once blew past Postgres's statement timeout under
// contention (2026-09-12 outage), and fetching them one at a time blew past
// the gateway timeout instead. Batching trades off between the two.
function baseQuery(supabase: Awaited<ReturnType<typeof createClient>>) {
  return supabase
    .from("sima_promedios_diarios")
    .select("sensor_id, fecha, promedio, parametro", { count: "exact" })
    .in("parametro", ["PM2.5", "PM10"])
    .neq("sensor_id", "FIN")
    .not("promedio", "is", null)
    .order("fecha", { ascending: true })
    .order("sensor_id", { ascending: true })
    .order("parametro", { ascending: true });
}

const BATCH_SIZE = 4;

async function fetchAllPromediosDiarios(supabase: Awaited<ReturnType<typeof createClient>>) {
  const pageSize = 1000;
  type Row = { sensor_id: string; fecha: string; promedio: number | null; parametro: string };

  const first = await baseQuery(supabase).range(0, pageSize - 1);
  if (first.error) {
    throw new Error(`Failed to load días insalubres: ${first.error.message}`);
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
        throw new Error(`Failed to load días insalubres: ${page.error.message}`);
      }
      rows.push(...(page.data ?? []));
    }
  }
  return rows;
}

export default async function DiasInsalubres() {
  const supabase = await createClient();
  const rows = await fetchAllPromediosDiarios(supabase);

  const pm25Rows = (rows ?? []).filter(
    (r) => r.parametro === "PM2.5" && !HIDDEN_MONTHS["PM2.5"].has(r.fecha.slice(0, 7)),
  );
  const pm10Rows = (rows ?? []).filter(
    (r) => r.parametro === "PM10" && !HIDDEN_MONTHS.PM10.has(r.fecha.slice(0, 7)),
  );

  const data: Record<Pollutant, MonthData[]> = {
    pm25: aggregateByMonth(pm25Rows, getLimitForDate),
    pm10: aggregateByMonth(pm10Rows, getLimitForDatePM10),
  };

  return <DiasInsalubresChart data={data} />;
}
