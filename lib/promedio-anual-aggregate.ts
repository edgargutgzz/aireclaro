import type { PromedioDiario } from "@/lib/promedios-diarios";

// Shared by the monthly sync cron, same pattern as lib/dias-insalubres-aggregate.ts
// and lib/cobertura-aggregate.ts. Reads sima_promedios_diarios (already applies
// the >=18-valid-hour / 75% completeness rule per station/day) and rolls valid
// days up into trimesters, following NOM-025-SSA1-2021 §4.2.2/§4.2.3.2 directly
// (verified against the published norm text, DOF 27/10/2021, 2026-09-28 --
// not the client's paraphrase of it): a trimester is valid when the station
// reported on >=75% of THAT TRIMESTER'S OWN calendar days, and a year is
// evaluable once >=3 of its 4 trimesters clear that bar. The reported value
// is a single pooled mean over every valid daily average in the qualifying
// year -- "el cálculo incluirá a todos los registros del año" -- not an
// average of monthly or trimestral averages. There is no month-level step
// and no "trimester value" in the norm at all; `promedio` below is simply
// that same pooled mean, scoped to one trimester, so a caller can recombine
// trimesters into the year's pooled mean by weighting on dias_validos (see
// promedio-anual-chart.tsx) without ever re-deriving it from daily rows.
//
// Saltillo (FIN) excluded, per project convention -- it isn't part of this
// metro area. Both pollutants (2026-09-28: was PM2.5-only) -- the reference
// thresholds this chart draws differ per pollutant (see lib/pm25-limits.ts's
// getLimitAnualPM10), but the trimester/day math itself is identical either
// way, so `parametro` is just carried through, not branched on here.

export interface TrimestreRow {
  sensor_id: string;
  ano: number;
  trimestre: number; // 1-4
  parametro: "PM2.5" | "PM10";
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

function daysInTrimestre(ano: number, trimestre: number): number {
  return TRIMESTRE_MESES[trimestre].reduce(
    (sum, mes) => sum + daysInMonth(ano, mes),
    0,
  );
}

// Rows come from the monthly cron's single read of sima_promedios_diarios
// (lib/promedios-diarios.ts); only valid days count (invalid ones add nothing
// to a sum, and the day-count denominators are calendar arithmetic).
export function computePromedioTrimestral(allRows: PromedioDiario[]): TrimestreRow[] {
  const rows = allRows.filter((r): r is PromedioDiario & { promedio: number } => r.promedio !== null);

  // (sensor_id, ano, trimestre, parametro) -> that trimester's valid daily
  // averages, pooled directly -- no month-level grouping step, per the norm
  // text above.
  const porTrimestre = new Map<string, number[]>();
  for (const row of rows) {
    const ano = Number(row.fecha.slice(0, 4));
    const mes = Number(row.fecha.slice(5, 7));
    const trimestre = Math.ceil(mes / 3);
    const key = `${row.sensor_id}|${ano}|${trimestre}|${row.parametro}`;
    const lista = porTrimestre.get(key) ?? [];
    lista.push(row.promedio);
    porTrimestre.set(key, lista);
  }

  // Every (sensor, year, parametro) that shows up anywhere in the data -- a
  // sensor with zero valid days all year simply won't appear here, and the
  // chart treats "no trimester rows at all" the same as "0/4 válidos" (falta
  // de información), so there's no need to enumerate every known sensor here.
  const sensorYearParams = new Set<string>();
  for (const key of porTrimestre.keys()) {
    const [sensorId, ano, , parametro] = key.split("|");
    sensorYearParams.add(`${sensorId}|${ano}|${parametro}`);
  }

  const out: TrimestreRow[] = [];
  for (const syp of sensorYearParams) {
    const [sensorId, anoStr, parametro] = syp.split("|") as [string, string, "PM2.5" | "PM10"];
    const ano = Number(anoStr);

    for (const trimestre of [1, 2, 3, 4]) {
      const diasTotales = daysInTrimestre(ano, trimestre);
      const valores = porTrimestre.get(`${sensorId}|${ano}|${trimestre}|${parametro}`) ?? [];
      const diasValidos = valores.length;
      const valido = diasValidos / diasTotales >= 0.75;
      // Non-null whenever there's at least one valid day, independent of
      // `valido` -- a trimester that misses its own 75% bar can still
      // contribute its valid days to the year's pooled mean once the YEAR
      // overall clears >=3/4 trimesters (see promedio-anual-chart.tsx); its
      // own promedio has to be available for that recombination even though
      // this one trimester alone isn't "valid."
      const promedio =
        diasValidos > 0
          ? valores.reduce((a, b) => a + b, 0) / diasValidos
          : null;

      out.push({
        sensor_id: sensorId,
        ano,
        trimestre,
        parametro,
        dias_validos: diasValidos,
        dias_totales: diasTotales,
        valido,
        promedio,
      });
    }
  }

  return out;
}
