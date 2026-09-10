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

export default async function DiasInsalubres() {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("sima_promedios_diarios")
    .select("sensor_id, fecha, promedio, parametro")
    .in("parametro", ["PM2.5", "PM10"])
    .neq("sensor_id", "FIN")
    .not("promedio", "is", null);

  if (error) {
    throw new Error(`Failed to load días insalubres: ${error.message}`);
  }

  const pm25Rows = (rows ?? []).filter((r) => r.parametro === "PM2.5");
  const pm10Rows = (rows ?? []).filter((r) => r.parametro === "PM10");

  const data: Record<Pollutant, MonthData[]> = {
    pm25: aggregateByMonth(pm25Rows, getLimitForDate),
    pm10: aggregateByMonth(pm10Rows, getLimitForDatePM10),
  };

  return <DiasInsalubresChart data={data} />;
}
