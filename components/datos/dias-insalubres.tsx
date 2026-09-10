import { createClient } from "@/utils/supabase/server";
import { getLimitForDate } from "@/lib/pm25-limits";
import DiasInsalubresChart, { type MonthData } from "@/components/datos/dias-insalubres-chart";

// Reads sima_promedios_diarios (already applies the >=18-valid-hour / 75%
// completeness rule per station/day) and aggregates by month: a day counts
// as insalubre if ANY station's rounded daily average exceeds that date's
// NOM-025-SSA1-2021 limit (getLimitForDate). A day counts toward the month's
// total only if >=1 station reported. Saltillo (FIN) excluded, per
// project convention, it isn't part of this metro area.
const PARAM = "PM2.5";
const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default async function DiasInsalubres() {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("sima_promedios_diarios")
    .select("sensor_id, fecha, promedio")
    .eq("parametro", PARAM)
    .neq("sensor_id", "FIN")
    .not("promedio", "is", null);

  if (error) {
    throw new Error(`Failed to load días insalubres: ${error.message}`);
  }

  const porDia = new Map<string, number[]>();
  for (const row of rows ?? []) {
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
    const limite = getLimitForDate(fecha);
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

  const meses = Array.from(porMes.values()).sort((a, b) => a.ano - b.ano || a.mesNumero - b.mesNumero);

  return <DiasInsalubresChart data={meses} />;
}
