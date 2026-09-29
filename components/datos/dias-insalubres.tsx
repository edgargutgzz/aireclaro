import { createPublicClient } from "@/utils/supabase/public";
import { fetchDiasInsalubresMensual } from "@/lib/dias-insalubres-aggregate";
import DiasInsalubresChart from "@/components/datos/dias-insalubres-chart";

// The monthly SINAICA sync cron (app/api/cron/sima-monthly-sync) computes
// this chart's data and writes it here -- this component just reads the
// small precomputed result, it never touches sima_promedios_diarios (the
// ~15k-row view the calculation is actually derived from) itself. See
// lib/dias-insalubres-aggregate.ts for the calculation and why it moved.
export default async function DiasInsalubres() {
  const supabase = createPublicClient();
  const chartData = await fetchDiasInsalubresMensual(supabase);
  return <DiasInsalubresChart data={chartData} />;
}
