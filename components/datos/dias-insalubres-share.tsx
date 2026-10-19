"use client";

import { BookOpen } from "lucide-react";
import ChartCard from "@/components/datos/chart-card";
import DownloadImageMenu from "@/components/datos/download-image-menu";
import type { InfoTab } from "@/components/datos/info-tabs";
import { POLLUTANT_LIMITS } from "@/components/datos/dias-insalubres-chart";
import { COLOR_INSALUBRE } from "@/lib/datos-colors";
import { MONTHS_ES_FULL, type MonthlySummary, type Pollutant } from "@/lib/dias-insalubres-aggregate";

// The monthly update as a /datos card: the latest month with data vs. the
// same month a year earlier, both pollutants, both years on today's limit.
// Same content as the downloadable image (app/api/og/dias-insalubres, from
// the header's download menu) minus its brand frame, which only the
// downloaded file needs: the same verdict as the title, the numbers as the
// body.

const POLLUTANT_LABEL: Record<Pollutant, string> = { pm25: "PM2.5", pm10: "PM10" };

export default function DiasInsalubresShare({ summary }: { summary: MonthlySummary }) {
  const { year, mes, rows, hasPrior, headline } = summary;
  const mesNombre = MONTHS_ES_FULL[mes - 1];
  // The image's headline lines, as one sentence.
  const title = headline.join(" ");
  const years = hasPrior ? [year - 1, year] : [year];
  // Label column + one column per year; same template on every row.
  const cols = hasPrior
    ? "grid-cols-[8rem_1fr_1fr] sm:grid-cols-[12rem_1fr_1fr]"
    : "grid-cols-[8rem_1fr] sm:grid-cols-[12rem_1fr]";

  const infoTab: InfoTab = {
    id: "norma",
    label: "Metodología",
    icon: BookOpen,
    body: (
      <>
        Se compara el último mes con datos contra el mismo mes del año
        anterior. Para comparar con la misma medida, ambos años se cuentan
        con el límite diario vigente: {POLLUTANT_LIMITS.pm25.desde} µg/m³
        para PM2.5 y {POLLUTANT_LIMITS.pm10.desde} µg/m³ para PM10. Un día
        se considera sobre la norma de salud si alguna estación de monitoreo supera ese
        límite.
      </>
    ),
  };

  return (
    <ChartCard
      infoTab={infoTab}
      title={title}
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
        {/* A grid with table roles, not a <table>: each row aligns its
            cells on their LAST baseline (items-baseline-last), so the big
            number sits on the "Límite" line, which table cells can't do. */}
        <div role="table" aria-label={title}>
          <div role="row" className={`grid ${cols} pb-4 text-xs text-stone-400 md:pb-6`}>
            <div role="columnheader">
              <span className="sr-only">Contaminante</span>
            </div>
            {years.map((y) => (
              <div key={y} role="columnheader">
                {mesNombre} {y}
              </div>
            ))}
          </div>
          {rows.map((r) => (
            <div
              key={r.pollutant}
              role="row"
              className={`grid ${cols} items-baseline-last border-t border-stone-100 py-4 md:py-6`}
            >
              <div role="rowheader">
                <div className="text-sm font-medium text-stone-700 md:text-base">{POLLUTANT_LABEL[r.pollutant]}</div>
                {/* The one limit both years' numbers in this row count against. */}
                <div className="mt-1 text-xs text-stone-400">Límite: {r.limit} µg/m³</div>
              </div>
              {years.map((y) => (
                <div
                  key={y}
                  role="cell"
                  className="text-4xl font-semibold leading-none tabular-nums md:text-6xl"
                  style={{ color: y === year ? COLOR_INSALUBRE : "#a6a09b" }}
                >
                  {y === year ? r.current : r.prior}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

    </ChartCard>
  );
}
