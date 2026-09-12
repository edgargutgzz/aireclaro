import { createPublicClient } from "@/utils/supabase/public";
import { MONTHS_ES, type MonthData, type Pollutant } from "@/lib/dias-insalubres-aggregate";
import DiasInsalubresChart from "@/components/datos/dias-insalubres-chart";

// The monthly SINAICA sync cron (app/api/cron/sima-monthly-sync) computes
// this chart's data and writes it here -- this component just reads the
// small precomputed result, it never touches sima_promedios_diarios (the
// ~15k-row view the calculation is actually derived from) itself. See
// lib/dias-insalubres-aggregate.ts for the calculation and why it moved.
export default async function DiasInsalubres() {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("dias_insalubres_mensual")
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

  const chartData: Record<Pollutant, MonthData[]> = {
    pm25: toMonthData("PM2.5"),
    pm10: toMonthData("PM10"),
  };

  return <DiasInsalubresChart data={chartData} />;
}
