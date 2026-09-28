import { RefreshCw } from "lucide-react";
import { createPublicClient } from "@/utils/supabase/public";
import { monterreyNaiveNow } from "@/lib/monterrey-time";

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

// The monthly cron (app/api/cron/sima-monthly-sync, vercel.json's "0 8 6 * *")
// runs the 6th of every month and pulls the month that just closed -- keep
// this in sync if that schedule ever changes. String-sliced rather than
// built with Date arithmetic, same reasoning as lib/monterrey-time.ts's own
// helpers: no timezone/DST surprises from constructing a Date and asking it
// for parts back.
const CRON_DAY = 6;

// A day count ("en 9 días"), not a calendar date -- simpler to parse at a
// glance than making the reader do "how far is Oct 6" math themselves
// (2026-09-28 feedback). addedMonth is derived from the run-day math
// (targetMonth - 1), not from the stamp below, so it's still correct even
// if a run were ever missed and the stamp fell more than one month behind.
function nextUpdate(): { addedMonthLabel: string; daysUntil: number } {
  const [y, m, d] = monterreyNaiveNow().slice(0, 10).split("-").map(Number);
  let targetYear = y;
  let targetMonth = m;
  if (d >= CRON_DAY) {
    targetMonth += 1;
    if (targetMonth > 12) {
      targetMonth = 1;
      targetYear += 1;
    }
  }
  let addedMonth = targetMonth - 1;
  if (addedMonth < 1) addedMonth = 12;
  const todayUTC = Date.UTC(y, m - 1, d);
  const targetUTC = Date.UTC(targetYear, targetMonth - 1, CRON_DAY);
  return {
    // No year here -- the sentence right before it already says "de 2026",
    // so repeating "de {year}" a few words later just reads clunky
    // (2026-09-28 feedback).
    addedMonthLabel: MONTHS_FULL_ES[addedMonth - 1],
    daysUntil: Math.round((targetUTC - todayUTC) / 86_400_000),
  };
}

// Two short sentences, shared by every /datos chart -- what's on screen now,
// and what lands next. Went through a couple of shapes: first one run-on
// sentence mixing both ideas (confusing), then a label/value stat pair with
// an exact date (didn't say a WHOLE month arrives that day). Settled on
// plain sentences with a day-count instead of a date -- reads closer to how
// the client would actually say it out loud (2026-09-28 feedback). Reads the
// same precomputed rollup días insalubres does (sima_insalubres_mensual)
// rather than adding a new query path: whatever month that table's latest
// PM2.5 row belongs to IS the month every /datos chart is current through,
// since the same monthly cron writes all three at once.
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
  const { addedMonthLabel, daysUntil } = nextUpdate();
  const daysLabel = `${daysUntil} día${daysUntil === 1 ? "" : "s"}`;

  return (
    // White + border-gray-200, same shell ChartCard uses below -- the
    // earlier bg-gray-50/border-gray-100 version sat on the page's own
    // gray-50 background (app/globals.css --background) and read as almost
    // invisible (2026-09-27 feedback: "too hidden"). The circle chip alone
    // (not the color) is what gives it a visual anchor -- blue was tried
    // first (cobertura's own "has data" blue) but read as a data-currency
    // claim rather than a neutral status line, so this stays gray/monochrome
    // like info-tabs' own icons (2026-09-27 feedback).
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
        <RefreshCw className="h-4 w-4 text-gray-500" aria-hidden />
      </div>
      {/* Same subtitle recipe días insalubres/cobertura already use for their
          own two-stat line (md:flex md:items-center md:gap-3, a hairline
          divider that only appears once both stats share a row) -- one
          shared row shape across the page instead of a bespoke one just for
          this banner. One text size throughout, weight/color doing the
          contrast instead of a size jump. */}
      <div className="text-sm md:flex md:items-center md:gap-3">
        <div>
          <span className="text-gray-500">Datos actualizados hasta </span>
          <span className="font-medium text-gray-800">{stamp}</span>
          <span className="text-gray-500">.</span>
        </div>
        <div className="hidden h-4 w-px bg-gray-200 md:block" />
        <div className="mt-1 md:mt-0">
          <span className="text-gray-500">Los datos de </span>
          <span className="font-medium text-gray-800">{addedMonthLabel}</span>
          <span className="text-gray-500"> estarán disponibles en </span>
          <span className="font-medium text-gray-800">{daysLabel}</span>
          <span className="text-gray-500">.</span>
        </div>
      </div>
    </div>
  );
}
