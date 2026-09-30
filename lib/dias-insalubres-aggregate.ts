import type { SupabaseClient } from "@supabase/supabase-js";
import { getLimitForDate, getLimitForDatePM10 } from "@/lib/pm25-limits";

// Shared by the monthly sync cron (which computes this and writes the small
// result into sima_insalubres_mensual) -- NOT by the /datos page, which just
// reads that table directly. See app/api/cron/sima-monthly-sync/route.ts.
//
// Reads sima_promedios_diarios (already applies the >=18-valid-hour / 75%
// completeness rule per station/day) and aggregates by month: a day counts
// as insalubre if ANY station's rounded daily average exceeds that date's
// NOM-025-SSA1-2021 limit. A day counts toward the month's total only if
// >=1 station reported. Saltillo (FIN) excluded, per project convention,
// it isn't part of this metro area.

export type Pollutant = "pm25" | "pm10";

export interface MonthData {
  ano: number;
  mesNumero: number;
  mes: string;
  diasInsalubres: number;
  diasTotales: number;
}

export const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
// Full names, capitalized (lowercase them mid-sentence). Shared by the chart,
// its month calendar, the /datos header stamp, and the download image.
export const MONTHS_ES_FULL = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

// Scaffolding for a targeted month/pollutant hide, kept even when empty --
// re-verified 2026-09-18 that July 2026 PM10's suspected off-by-one day
// offset isn't actually present (cross-checked PM10 vs the already-correct
// PM2.5 across 5 stations; same-day alignment fit clearly best, not a ±1
// day shift), so that hide was lifted.
const HIDDEN_MONTHS: Record<"PM2.5" | "PM10", Set<string>> = {
  "PM2.5": new Set(),
  PM10: new Set(),
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
// only needed for stable pagination, not for the aggregation below).
// Fetching all pages at once overloaded Postgres under contention and
// fetching one at a time was slow enough to trip a gateway timeout
// (2026-09-12 outage) -- but this now only ever runs from the monthly cron,
// not per page view, so both failure modes matter far less than they used to.
function baseQuery(supabase: SupabaseClient) {
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

async function fetchAllPromediosDiarios(supabase: SupabaseClient) {
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

export async function computeDiasInsalubresMensual(
  supabase: SupabaseClient,
): Promise<Record<Pollutant, MonthData[]>> {
  const rows = await fetchAllPromediosDiarios(supabase);

  const pm25Rows = rows.filter(
    (r) => r.parametro === "PM2.5" && !HIDDEN_MONTHS["PM2.5"].has(r.fecha.slice(0, 7)),
  );
  const pm10Rows = rows.filter(
    (r) => r.parametro === "PM10" && !HIDDEN_MONTHS.PM10.has(r.fecha.slice(0, 7)),
  );

  return {
    pm25: aggregateByMonth(pm25Rows, getLimitForDate),
    pm10: aggregateByMonth(pm10Rows, getLimitForDatePM10),
  };
}

// Reads the small precomputed table the monthly cron writes
// (computeDiasInsalubresMensual above, run there, not per page view) --
// shared by the /datos page's server component and the share-card image
// route (app/api/og/dias-insalubres) so neither can drift from the other's
// numbers.
export async function fetchDiasInsalubresMensual(
  supabase: SupabaseClient,
): Promise<Record<Pollutant, MonthData[]>> {
  const { data, error } = await supabase
    .from("sima_insalubres_mensual")
    .select("ano, mes, parametro, dias_insalubres, dias_totales")
    .order("ano", { ascending: true })
    .order("mes", { ascending: true });

  if (error) {
    throw new Error(`Failed to load días insalubres: ${error.message}`);
  }

  const toMonthData = (parametro: "PM2.5" | "PM10"): MonthData[] =>
    (data ?? [])
      .filter((r) => r.parametro === parametro)
      .map((r) => ({
        ano: r.ano,
        mesNumero: r.mes,
        mes: MONTHS_ES[r.mes - 1],
        diasInsalubres: r.dias_insalubres,
        diasTotales: r.dias_totales,
      }));

  return {
    pm25: toMonthData("PM2.5"),
    pm10: toMonthData("PM10"),
  };
}

export interface YearSummary {
  total: number;
  // How many of the year's 12 months are actually counted -- trailing
  // months with no data (in progress / not yet happened) are dropped, same
  // rule the bar chart itself uses, so a "same period" comparison against
  // the prior year lines up with what the chart visibly shows.
  monthsUsed: number;
  lastMonthLabel: string;
  // Year-over-year, same-period only: null when the prior year doesn't have
  // every one of those same months, since there'd be nothing fair to
  // compare (a partial year against a complete one always favors the
  // partial one).
  priorYearDelta: number | null;
}

export function summarizeYear(data: MonthData[], year: number): YearSummary {
  const byMonth = new Map(
    data.filter((d) => d.ano === year).map((d) => [d.mesNumero, d]),
  );
  const full: MonthData[] = Array.from({ length: 12 }, (_, i) => {
    const mesNumero = i + 1;
    return (
      byMonth.get(mesNumero) ?? {
        ano: year,
        mesNumero,
        mes: MONTHS_ES[i],
        diasInsalubres: 0,
        diasTotales: 0,
      }
    );
  });
  let lastIdx = full.length - 1;
  while (lastIdx > 0 && full[lastIdx].diasTotales === 0) lastIdx--;
  const trimmed = full.slice(0, lastIdx + 1);

  const total = trimmed.reduce((sum, d) => sum + d.diasInsalubres, 0);
  const monthsUsed = trimmed.length;

  const priorRows = data.filter(
    (d) => d.ano === year - 1 && d.mesNumero <= monthsUsed,
  );
  const priorYearDelta =
    priorRows.length >= monthsUsed
      ? total - priorRows.reduce((sum, d) => sum + d.diasInsalubres, 0)
      : null;

  return { total, monthsUsed, lastMonthLabel: MONTHS_ES[monthsUsed - 1], priorYearDelta };
}
