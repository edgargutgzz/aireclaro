"use client";

import { BookOpen } from "lucide-react";
import ChartCard from "@/components/datos/chart-card";
import DownloadImageMenu from "@/components/datos/download-image-menu";
import InfoTabs, { type InfoTab } from "@/components/datos/info-tabs";
import { FUENTE_TAB, POLLUTANT_LIMITS } from "@/components/datos/dias-insalubres-chart";
import { COLOR_INSALUBRE } from "@/lib/datos-colors";
import { MONTHS_ES_FULL, type MonthlySummary, type Pollutant } from "@/lib/dias-insalubres-aggregate";

// The monthly update as a /datos card: the latest month with data vs. the
// same month a year earlier, both pollutants, both years on today's limit.
// Same content as the downloadable image (app/api/og/dias-insalubres, from
// the header's download menu) minus its brand frame, which only the
// downloaded file needs: verdict as the title (led by the month), its plain-language gloss as
// the subtitle, the numbers as the body.

const POLLUTANT_LABEL: Record<Pollutant, string> = { pm25: "PM2.5", pm10: "PM10" };
// For a reader who doesn't know what PM2.5 / PM10 are.
const POLLUTANT_DESCRIPTOR: Record<Pollutant, string> = {
  pm25: "Partículas finas",
  pm10: "Partículas gruesas",
};

export default function DiasInsalubresShare({ summary }: { summary: MonthlySummary }) {
  const { year, mes, rows, hasPrior, trend } = summary;
  const mesNombre = MONTHS_ES_FULL[mes - 1];
  const mesMin = mesNombre.toLowerCase();
  // The card's title leads with the month (the image's headline doesn't:
  // its table already says it, and its line breaks are set).
  const title = trend
    ? `En ${mesMin} de ${year} se registraron ${trend} días sobre la norma que en ${mesMin} de ${year - 1}`
    : hasPrior
      ? `En ${mesMin} de ${year}, días sobre la norma frente a ${mesMin} de ${year - 1}`
      : `En ${mesMin} de ${year}, días sobre la norma`;
  const years = hasPrior ? [year - 1, year] : [year];

  const tabs: InfoTab[] = [
    FUENTE_TAB,
    {
      id: "norma",
      label: "Metodología",
      icon: BookOpen,
      body: (
        <>
          Se compara el último mes con datos contra el mismo mes del año
          anterior. Para comparar con la misma medida, ambos años se cuentan
          con el límite diario vigente: {POLLUTANT_LIMITS.pm25.desde} µg/m³
          para PM2.5 y {POLLUTANT_LIMITS.pm10.desde} µg/m³ para PM10. Un día
          está sobre la norma si alguna estación de monitoreo supera ese
          límite.
        </>
      ),
    },
  ];

  return (
    <ChartCard
      title={title}
      subtitle="Días en que las partículas en el aire superaron el límite para proteger la salud."
      headerRight={
        <DownloadImageMenu
          href={(format) => `/api/og/dias-insalubres?year=${year}&format=${format}`}
          filename={(format) => `observatorio-del-aire-dias-sobre-la-norma-${year}-${mesNombre.toLowerCase()}-${format}.png`}
        />
      }
    >
      <div className="px-5 pb-6 pt-5 md:pt-6">
        {/* One row per pollutant: last year (gray reference), this year
            (always red: any day over the norm is bad news; the title carries
            the más/menos). Bare numbers, the title already says "días". */}
        <table className="w-full table-fixed">
          <thead>
            <tr className="text-left text-xs font-normal text-gray-400">
              <th className="w-32 pb-4 font-normal sm:w-48 md:pb-6">
                <span className="sr-only">Contaminante</span>
              </th>
              {years.map((y) => (
                <th key={y} className="pb-4 font-normal md:pb-6">
                  {mesNombre} {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.pollutant} className="border-t border-gray-100">
                <th className="py-4 text-left font-normal md:py-6">
                  <div className="text-sm font-medium text-gray-700 md:text-base">{POLLUTANT_LABEL[r.pollutant]}</div>
                  <div className="text-xs text-gray-400 md:text-sm">{POLLUTANT_DESCRIPTOR[r.pollutant]}</div>
                </th>
                {years.map((y) => (
                  <td
                    key={y}
                    className="py-4 text-4xl font-semibold tabular-nums md:py-6 md:text-6xl"
                    style={{ color: y === year ? COLOR_INSALUBRE : "#9ca3af" }}
                  >
                    {y === year ? r.current : r.prior}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-100 px-5 pb-5 pt-4">
        <InfoTabs tabs={tabs} />
      </div>
    </ChartCard>
  );
}
