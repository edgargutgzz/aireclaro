import { RefreshCw } from "lucide-react";
import { createPublicClient } from "@/utils/supabase/public";

// Full names (not lib/dias-insalubres-aggregate.ts's abbreviated MONTHS_ES)
// -- this reads as a sentence ("hasta agosto de 2026"), not a chart label.
const MONTHS_FULL_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

// One line, shared by every /datos chart, saying when new data lands and how
// current what's on screen is right now -- previously each chart's own
// header only ever said which year/month it happened to be showing, never
// when the next update arrives. Reads the same precomputed rollup días
// insalubres does (sima_insalubres_mensual) rather than adding a new query
// path: whatever month that table's latest PM2.5 row belongs to IS the
// month every /datos chart is current through, since the same monthly cron
// (app/api/cron/sima-monthly-sync) writes all three at once.
export default async function DatosHeader() {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("sima_insalubres_mensual")
    .select("ano, mes")
    .eq("parametro", "PM2.5")
    .order("ano", { ascending: false })
    .order("mes", { ascending: false })
    .limit(1)
    .maybeSingle();

  // No data yet is a real (if unlikely) state for a brand-new deploy -- fail
  // quiet rather than throwing, since this header is a nice-to-have next to
  // the charts below, which already handle their own empty states.
  if (error || !data) return null;

  const stamp = `${MONTHS_FULL_ES[data.mes - 1]} de ${data.ano}`;

  return (
    // White + border-gray-200, same shell ChartCard uses below -- the
    // earlier bg-gray-50/border-gray-100 version sat on the page's own
    // gray-50 background (app/globals.css --background) and read as almost
    // invisible (2026-09-27 feedback: "too hidden"). The icon chip uses the
    // same blue cobertura's grid already spends on "has data" (COLOR_CUBIERTO,
    // cobertura-estaciones-chart.tsx), not a new arbitrary accent, so it
    // catches the eye without introducing a color the page hasn't already
    // taught the reader to associate with data currency.
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm leading-relaxed text-gray-600">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-50">
        <RefreshCw className="h-4 w-4 text-blue-500" aria-hidden />
      </div>
      <p>
        Los datos se actualizan cada mes, una semana después de que este
        termina.{" "}
        <span className="font-semibold text-gray-900">Datos hasta {stamp}.</span>
      </p>
    </div>
  );
}
