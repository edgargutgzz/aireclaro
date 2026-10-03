import { ArrowDownToLine, RefreshCw } from "lucide-react";
import { fetchUltimoMes } from "@/lib/datos-cache";
import { monterreyNaiveNow } from "@/lib/monterrey-time";
import { MONTHS_ES_FULL } from "@/lib/dias-insalubres-aggregate";
import DatosGeneralInfo from "@/components/datos/datos-general-info";


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
  let addedYear = targetYear;
  if (addedMonth < 1) {
    addedMonth = 12;
    addedYear -= 1;
  }
  const todayUTC = Date.UTC(y, m - 1, d);
  const targetUTC = Date.UTC(targetYear, targetMonth - 1, CRON_DAY);
  return {
    addedMonthLabel: `${MONTHS_ES_FULL[addedMonth - 1].toLowerCase()} ${addedYear}`,
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
  // No data yet is a real (if unlikely) state for a brand-new deploy -- fail
  // quiet rather than throwing, since this header is a nice-to-have next to
  // the charts below, which already handle their own empty states.
  const data = await fetchUltimoMes().catch(() => null);
  if (!data) return null;

  const stamp = `${MONTHS_ES_FULL[data.mes - 1].toLowerCase()} ${data.ano}`;
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
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="flex items-center gap-3">
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
              <span className="text-gray-500"> estarán disponibles en {daysLabel}.</span>
            </div>
          </div>
        </div>
        {/* The raw-data download lives in its own card at the bottom of the
            page (after the charts it feeds); this shortcut makes it visible
            on arrival without pushing the charts down. */}
        {/* The tinted h-8 button the chart headers use (Comparar,
            Descargar, Metodología): findable without competing with them. */}
        <a
          href="#descarga"
          className="flex h-8 w-fit shrink-0 items-center gap-1.5 rounded-xl bg-gray-100 px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200/70 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
        >
          <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden />
          Descargar datos
        </a>
      </div>
      {/* The tabs every chart shares (pollutants, health), once for the
          page; same row recipe as each chart card's own tabs. */}
      <div className="border-t border-gray-100 px-5 pb-5 pt-4">
        <DatosGeneralInfo />
      </div>
    </div>
  );
}
