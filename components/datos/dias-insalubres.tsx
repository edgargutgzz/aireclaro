import { createPublicClient } from "@/utils/supabase/public";
import { cachedDatos } from "@/lib/datos-cache";
import {
  fetchDiasInsalubresMensual,
  monthlySummary,
} from "@/lib/dias-insalubres-aggregate";
import DiasInsalubresChart from "@/components/datos/dias-insalubres-chart";
import DiasInsalubresShare from "@/components/datos/dias-insalubres-share";

// The monthly SINAICA sync cron (app/api/cron/sima-monthly-sync) computes
// this chart's data and writes it here -- this component just reads the
// small precomputed result, it never touches sima_promedios_diarios (the
// ~15k-row view the calculation is actually derived from) itself. See
// lib/dias-insalubres-aggregate.ts for the calculation and why it moved.
const fetchChartData = cachedDatos(
  () => fetchDiasInsalubresMensual(createPublicClient()),
  "dias-insalubres",
);

export default async function DiasInsalubres() {
  const chartData = await fetchChartData();

  // The monthly summary card: latest month with data (both pollutants)
  // vs. the same month a year earlier; no card until there's such a month.
  const year = Math.max(0, ...chartData.pm25.map((d) => d.ano));
  const summary = year > 0 ? monthlySummary(chartData, year) : null;

  return (
    <>
      <DiasInsalubresChart data={chartData} />
      {summary && (
        <div className="mt-16">
          <DiasInsalubresShare summary={summary} />
        </div>
      )}
    </>
  );
}
