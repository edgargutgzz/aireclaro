import { createPublicClient } from "@/utils/supabase/public";
import {
  fetchDiasInsalubresMensual,
  latestShareMonth,
  MONTHS_ES_FULL,
} from "@/lib/dias-insalubres-aggregate";
import DiasInsalubresChart from "@/components/datos/dias-insalubres-chart";
import ShareImagesCard from "@/components/datos/share-images-card";

// The monthly SINAICA sync cron (app/api/cron/sima-monthly-sync) computes
// this chart's data and writes it here -- this component just reads the
// small precomputed result, it never touches sima_promedios_diarios (the
// ~15k-row view the calculation is actually derived from) itself. See
// lib/dias-insalubres-aggregate.ts for the calculation and why it moved.
export default async function DiasInsalubres() {
  const supabase = createPublicClient();
  const chartData = await fetchDiasInsalubresMensual(supabase);

  // The share images summarize the latest month with data (both
  // pollutants) against the same month a year earlier; no card until
  // there's such a month.
  const year = Math.max(0, ...chartData.pm25.map((d) => d.ano));
  const mes = year > 0 ? latestShareMonth(chartData, year) : null;

  return (
    <>
      <DiasInsalubresChart data={chartData} />
      {mes !== null && (
        <div className="mt-4">
          <ShareImagesCard
            title="Imágenes para compartir"
            subtitle={`Días sobre la norma en ${MONTHS_ES_FULL[mes - 1].toLowerCase()} de ${year} frente a ${year - 1}, listas para redes sociales.`}
            href={(format) => `/api/og/dias-insalubres?year=${year}&format=${format}`}
            filename={(format) => `observatorio-del-aire-comparacion-${year}-${format}.png`}
          />
        </div>
      )}
    </>
  );
}
