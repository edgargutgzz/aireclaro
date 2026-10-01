"use client";

import { BookOpen } from "lucide-react";
import ShareImageCard from "@/components/datos/share-image-card";
import { FUENTE_TAB, POLLUTANT_LIMITS } from "@/components/datos/dias-insalubres-chart";
import { MONTHS_ES_FULL } from "@/lib/dias-insalubres-aggregate";
import type { InfoTab } from "@/components/datos/info-tabs";

// Chart 1's monthly image (app/api/og/dias-insalubres) as its own /datos
// card: the latest month with data vs. the same month a year earlier, both
// pollutants, both years on today's limit.
export default function DiasInsalubresShare({ year, mes }: { year: number; mes: number }) {
  const mesMin = MONTHS_ES_FULL[mes - 1].toLowerCase();
  const tabs: InfoTab[] = [
    FUENTE_TAB,
    {
      id: "norma",
      label: "Metodología",
      icon: BookOpen,
      body: (
        <>
          La imagen compara el último mes con datos contra el mismo mes del
          año anterior. Para comparar con la misma medida, ambos años se
          cuentan con el límite diario vigente: {POLLUTANT_LIMITS.pm25.desde}{" "}
          µg/m³ para PM2.5 y {POLLUTANT_LIMITS.pm10.desde} µg/m³ para PM10.
          Un día está sobre la norma si alguna estación de monitoreo supera
          ese límite.
        </>
      ),
    },
  ];

  return (
    <ShareImageCard
      title="Resumen mensual para compartir"
      subtitle={`Días sobre la norma en ${mesMin} de ${year} frente a ${mesMin} de ${year - 1}`}
      src={`/api/og/dias-insalubres?year=${year}`}
      filenameBase={`observatorio-del-aire-comparacion-${year}`}
      tabs={tabs}
    />
  );
}
