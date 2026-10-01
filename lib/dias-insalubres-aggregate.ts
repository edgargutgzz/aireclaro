import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getLimitForDate,
  getLimitForDatePM10,
  LIMITE_ACTUAL_PM10,
  LIMITE_ACTUAL_PM25,
} from "@/lib/pm25-limits";

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
  // Same days, judged by today's limit instead of the one in force on each
  // date, so years can be compared on one yardstick (the comparison view).
  // null for rows written before this column existed.
  diasInsalubresLimiteActual: number | null;
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
  limiteActual: number,
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
    const excedidoLimiteActual = valores.some((v) => Math.round(v) > limiteActual);

    const actual = porMes.get(key) ?? {
      ano,
      mesNumero,
      mes: MONTHS_ES[mesNumero - 1],
      diasInsalubres: 0,
      diasTotales: 0,
      diasInsalubresLimiteActual: 0,
    };
    actual.diasTotales += 1;
    if (excedido) actual.diasInsalubres += 1;
    if (excedidoLimiteActual) actual.diasInsalubresLimiteActual = (actual.diasInsalubresLimiteActual ?? 0) + 1;
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
    pm25: aggregateByMonth(pm25Rows, getLimitForDate, LIMITE_ACTUAL_PM25),
    pm10: aggregateByMonth(pm10Rows, getLimitForDatePM10, LIMITE_ACTUAL_PM10),
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
    // "*" rather than a column list so the page keeps working if
    // dias_insalubres_limite_actual hasn't been added to the table yet
    // (it just reads as null, and the comparison view says so).
    .select("*")
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
        diasInsalubresLimiteActual: r.dias_insalubres_limite_actual ?? null,
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
  // Days with a valid reading in those same months (the denominator), and
  // the share of them over the norm as a whole percent. The share is what
  // the download image leads with: unlike the running total it doesn't grow
  // just because another month passed, and it corrects for coverage gaps.
  totalDays: number;
  sharePct: number | null;
  // Prior year's share over the same months; null under the same rule as
  // priorYearDelta.
  priorSharePct: number | null;
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
        diasInsalubresLimiteActual: null,
      }
    );
  });
  let lastIdx = full.length - 1;
  while (lastIdx > 0 && full[lastIdx].diasTotales === 0) lastIdx--;
  const trimmed = full.slice(0, lastIdx + 1);

  const total = trimmed.reduce((sum, d) => sum + d.diasInsalubres, 0);
  const totalDays = trimmed.reduce((sum, d) => sum + d.diasTotales, 0);
  const monthsUsed = trimmed.length;
  const pct = (over: number, days: number) => (days > 0 ? Math.round((over / days) * 100) : null);

  const priorRows = data.filter(
    (d) => d.ano === year - 1 && d.mesNumero <= monthsUsed,
  );
  const priorComplete = priorRows.length >= monthsUsed;
  const priorTotal = priorRows.reduce((sum, d) => sum + d.diasInsalubres, 0);
  const priorDays = priorRows.reduce((sum, d) => sum + d.diasTotales, 0);
  const priorYearDelta = priorComplete ? total - priorTotal : null;

  return {
    total,
    monthsUsed,
    lastMonthLabel: MONTHS_ES[monthsUsed - 1],
    priorYearDelta,
    totalDays,
    sharePct: pct(total, totalDays),
    priorSharePct: priorComplete ? pct(priorTotal, priorDays) : null,
  };
}

// The share image's month: the latest month of `year` the monthly cron has
// processed for every pollutant, counted on today's limit (the data decides,
// never the calendar). null when there's none yet. Shared by the image route
// and the /datos monthly summary card, so both show the same month.
export function latestShareMonth(
  data: Record<Pollutant, MonthData[]>,
  year: number,
): number | null {
  const months = (Object.keys(data) as Pollutant[]).map(
    (p) =>
      new Set(
        data[p]
          .filter((r) => r.ano === year && r.diasTotales > 0 && r.diasInsalubresLimiteActual !== null)
          .map((r) => r.mesNumero),
      ),
  );
  const shared = [...months[0]].filter((m) => months.every((set) => set.has(m)));
  return shared.length > 0 ? Math.max(...shared) : null;
}

export interface MonthlySummaryRow {
  pollutant: Pollutant;
  current: number;
  prior: number | null;
}

export interface MonthlySummary {
  year: number;
  mes: number;
  rows: MonthlySummaryRow[];
  /** Both pollutants have the same month a year earlier. */
  hasPrior: boolean;
  /** Both pollutants moved the same way vs. a year earlier; null when they
   *  disagree or there's no prior month. */
  trend: "más" | "menos" | "los mismos" | null;
  /** The verdict, as set lines: the image's headline line by line, the
   *  /datos card's title joined into one sentence. */
  headline: string[];
}

// The monthly update: the latest month of `year` with data vs. the same month
// a year earlier, both pollutants, both counted on today's limit (the
// comparison view's numbers). Shared by the summary card on /datos and the
// downloadable image, so the two can't say different things. The verdict is
// in the observatory's measured terms ("días sobre la norma"), said for both
// pollutants only when they agree; otherwise neutral, and each row speaks for
// itself.
export function monthlySummary(
  data: Record<Pollutant, MonthData[]>,
  year: number,
): MonthlySummary | null {
  const mes = latestShareMonth(data, year);
  if (mes === null) return null;
  const pick = (p: Pollutant, ano: number) =>
    data[p].find(
      (r) => r.ano === ano && r.mesNumero === mes && r.diasTotales > 0 && r.diasInsalubresLimiteActual !== null,
    );
  const rows: MonthlySummaryRow[] = (["pm25", "pm10"] as const).map((p) => ({
    pollutant: p,
    current: pick(p, year)!.diasInsalubresLimiteActual as number,
    prior: (pick(p, year - 1)?.diasInsalubresLimiteActual as number | undefined) ?? null,
  }));
  const mesMin = MONTHS_ES_FULL[mes - 1].toLowerCase();
  const hasPrior = rows.every((r) => r.prior !== null);
  const signs = rows.map((r) => Math.sign(r.current - (r.prior ?? 0)));
  const agree = hasPrior && signs.every((x) => x === signs[0]);
  const trend = agree ? (signs[0] > 0 ? "más" : signs[0] < 0 ? "menos" : "los mismos") : null;
  const lead = `En ${mesMin} ${year}`;
  const headline = !hasPrior
    ? [`${lead},`, "días sobre la norma"]
    : trend
      ? [`${lead} se registraron`, `${trend} días sobre la norma`, "que el año pasado"]
      : [`${lead},`, "días sobre la norma", "frente al año pasado"];
  return { year, mes, rows, hasPrior, trend, headline };
}
