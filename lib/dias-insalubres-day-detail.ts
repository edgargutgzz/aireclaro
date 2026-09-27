import { createPublicClient } from "@/utils/supabase/public";
import { getLimitForDate, getLimitForDatePM10 } from "@/lib/pm25-limits";
import type { Pollutant } from "@/lib/dias-insalubres-aggregate";

// The month-drill-down's data source. Same classification rule as
// lib/dias-insalubres-aggregate.ts (a day is insalubre if any station's
// rounded average exceeds that date's limit), just resolved per-day instead
// of summed into a month total -- kept as a separate function rather than
// reused, since that one aggregates from a fully-paginated multi-year fetch
// and this one only ever needs one month.
//
// Runs client-side (triggered by a bar click, not a page load), querying
// sima_promedios_diarios directly rather than a precomputed table: filtered
// to one month/one pollutant it's ~450 rows and reliably returns in a few
// hundred ms once the connection is warm (verified 2026-09-26) -- nothing
// like the unscoped full-history query that caused the 2026-09-12 outage.

export interface DayStatus {
  fecha: string; // YYYY-MM-DD
  dia: number;
  estado: "insalubre" | "saludable" | "sin-datos";
}

export async function fetchMonthDayDetail(
  ano: number,
  mesNumero: number,
  pollutant: Pollutant,
): Promise<DayStatus[]> {
  const parametro = pollutant === "pm25" ? "PM2.5" : "PM10";
  const getLimit = pollutant === "pm25" ? getLimitForDate : getLimitForDatePM10;
  const mm = String(mesNumero).padStart(2, "0");
  const daysInMonth = new Date(Date.UTC(ano, mesNumero, 0)).getUTCDate();
  const start = `${ano}-${mm}-01`;
  const end = `${ano}-${mm}-${String(daysInMonth).padStart(2, "0")}`;

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("sima_promedios_diarios")
    .select("sensor_id, fecha, promedio")
    .eq("parametro", parametro)
    .neq("sensor_id", "FIN")
    .gte("fecha", start)
    .lte("fecha", end)
    .not("promedio", "is", null);

  if (error) {
    throw new Error(`Failed to load day detail: ${error.message}`);
  }

  const porDia = new Map<string, number[]>();
  for (const row of data ?? []) {
    const lista = porDia.get(row.fecha) ?? [];
    lista.push(row.promedio as number);
    porDia.set(row.fecha, lista);
  }

  const days: DayStatus[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const fecha = `${ano}-${mm}-${String(d).padStart(2, "0")}`;
    const valores = porDia.get(fecha);
    const estado: DayStatus["estado"] =
      !valores || valores.length === 0
        ? "sin-datos"
        : valores.some((v) => Math.round(v) > getLimit(fecha))
          ? "insalubre"
          : "saludable";
    days.push({ fecha, dia: d, estado });
  }
  return days;
}
