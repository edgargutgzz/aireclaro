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
    <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 text-sm leading-relaxed text-gray-600">
      <RefreshCw className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden />
      <p>
        Los datos se actualizan cada mes, una semana después de que este
        termina.{" "}
        <span className="font-medium text-gray-800">Datos hasta {stamp}.</span>
      </p>
    </div>
  );
}
