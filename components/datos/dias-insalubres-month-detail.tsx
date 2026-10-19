"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  fetchMonthDayDetail,
  type DayStatus,
} from "@/lib/dias-insalubres-day-detail";
import { MONTHS_ES_FULL, type Pollutant } from "@/lib/dias-insalubres-aggregate";
import {
  COLOR_INSALUBRE,
  COLOR_INSALUBRE_FILL_OPACITY,
  COLOR_SALUDABLE,
  COLOR_SALUDABLE_FILL_OPACITY,
  withOpacity,
} from "@/lib/datos-colors";
import { tooltipPositionStyle } from "@/components/datos/svg-chart-utils";
import { useDismissTooltip } from "@/components/datos/use-dismiss-tooltip";

const WEEKDAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const WEEKDAY_FULL = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

// Same gray already used for "data-quality gap" states elsewhere in /datos
// (cobertura's own "datos insuficientes" cells) -- a day with no reporting
// station isn't a health-severity read, so it doesn't borrow red or green.
const COLOR_SIN_DATOS = "#dedcda";

// Responsive, not fixed: at the card's real narrow-mobile width (~390px,
// minus the page's own side padding and the card's px-5), 7 fixed cells
// plus their gaps silently overflowed the card and got clipped by its own
// overflow-hidden -- no page-level scrollbar to hint at it, so it just
// looked like Sunday's column vanished. Sized to the measured container
// instead, same approach the bar chart above already uses for its own
// month columns. CELL_MAX is a taste call, not a hard constraint like
// CELL_MIN: 44 read as a small calendar stranded in a lot of dead space on
// a wide desktop card (2026-09-26 feedback); 72 fills noticeably more of
// it while the day numbers stay a normal size, not oversized blocks.
const CELL_MAX = 72;
const CELL_MIN = 32;
const GAP = 6;
const WEEKDAY_ROW_HEIGHT = 20;
const TOOLTIP_WIDTH = 176;
const TOOLTIP_HEIGHT = 60;

interface Cell {
  day: DayStatus;
  row: number;
  col: number;
}

function buildLayout(ano: number, mesNumero: number, days: DayStatus[]): Cell[] {
  const first = new Date(Date.UTC(ano, mesNumero - 1, 1));
  const mondayOffset = (first.getUTCDay() + 6) % 7; // 0 = Monday
  return days.map((day, i) => {
    const absolute = mondayOffset + i;
    return { day, row: Math.floor(absolute / 7), col: absolute % 7 };
  });
}

// Same wording as the monthly chart's legend (dias-insalubres-chart.tsx).
const ESTADO_LABEL: Record<DayStatus["estado"], string> = {
  insalubre: "Sobre la norma",
  saludable: "Dentro de la norma",
  "sin-datos": "Sin datos",
};
const ESTADO_COLOR: Record<DayStatus["estado"], string> = {
  insalubre: COLOR_INSALUBRE,
  saludable: COLOR_SALUDABLE,
  "sin-datos": COLOR_SIN_DATOS,
};

// A "sin-datos" day covers two different things -- a real gap (a past day
// no station reported) and a day that just hasn't happened yet -- but read
// identically at COLOR_SIN_DATOS' full strength, same as cobertura's grid
// did before it split "Datos insuficientes" from "Aún no ocurre"
// (2026-09-27 feedback, asking for the same distinction here). Faded to
// 40% instead of a second solid color: still visibly separate from a real
// gap, subtle enough not to read as its own new legend category.
const FUTURE_FILL_OPACITY = 0.4;
const FUTURE_TEXT_COLOR = "rgb(161,161,161)"; // neutral-400

function isFuture(fecha: string, todayStr: string) {
  return fecha > todayStr;
}

function dayLabel(day: DayStatus, todayStr: string) {
  return day.estado === "sin-datos" && isFuture(day.fecha, todayStr)
    ? "Aún no ocurre"
    : ESTADO_LABEL[day.estado];
}

export default function DiasInsalubresMonthDetail({
  ano,
  mesNumero,
  pollutant,
  onBack,
}: {
  ano: number;
  mesNumero: number;
  pollutant: Pollutant;
  onBack: () => void;
}) {
  const [days, setDays] = useState<DayStatus[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<Cell | null>(null);
  useDismissTooltip(tooltip !== null, () => setTooltip(null));

  // A failed fetch (transient network error, cold connection, etc.) had no
  // in-place recovery -- the only way out was clicking back to the month
  // list and re-entering, which happens to remount this component and
  // retrigger the effect below. retryKey does that same retrigger
  // explicitly, from a button, without leaving the calendar (2026-09-27,
  // real report -- reproduction attempts all succeeded, so this was a
  // one-off blip, but a dead end regardless while it lasted).
  const [retryKey, setRetryKey] = useState(0);

  // Client-evaluated once per mount, same as cobertura's own todayStr --
  // good enough to tell a future date apart from a real gap, no need to
  // stay live across a page left open past midnight.
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const measureRef = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState(CELL_MAX);
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const update = () => {
      const available = el.clientWidth - 6 * GAP;
      setCell(Math.min(CELL_MAX, Math.max(CELL_MIN, available / 7)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDays(null);
    setError(null);
    fetchMonthDayDetail(ano, mesNumero, pollutant)
      .then((result) => {
        if (!cancelled) setDays(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [ano, mesNumero, pollutant, retryKey]);

  const cells = days ? buildLayout(ano, mesNumero, days) : [];
  const totalRows = cells.length > 0 ? Math.max(...cells.map((c) => c.row)) + 1 : 0;
  const gridWidth = 7 * (cell + GAP) - GAP;
  const gridHeight = WEEKDAY_ROW_HEIGHT + totalRows * (cell + GAP) - GAP;

  return (
    <div ref={measureRef} className="w-full">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a los meses
      </button>

      <h4 className="mb-4 text-sm font-medium text-neutral-700">
        {MONTHS_ES_FULL[mesNumero - 1]} {ano}
      </h4>

      {error && (
        <p className="text-sm text-neutral-500">
          No se pudo cargar el detalle de este mes.{" "}
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            className="font-medium text-neutral-700 underline underline-offset-2 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
          >
            Reintentar
          </button>
        </p>
      )}

      {!error && !days && (
        <div
          className="w-full animate-pulse rounded-xl bg-stone-100"
          style={{ maxWidth: gridWidth, height: 280 }}
        />
      )}

      {!error && days && (
        <div className="relative" style={{ width: gridWidth }}>
          <div className="flex" style={{ height: WEEKDAY_ROW_HEIGHT }}>
            {WEEKDAY_SHORT.map((w) => (
              <div
                key={w}
                className="text-center text-[11px] font-medium text-neutral-400"
                style={{ width: cell + GAP }}
              >
                {w}
              </div>
            ))}
          </div>
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(7, ${cell}px)`,
              gridTemplateRows: `repeat(${totalRows}, ${cell}px)`,
              gap: GAP,
            }}
          >
            {cells.map((c) => {
              const futuro =
                c.day.estado === "sin-datos" && isFuture(c.day.fecha, todayStr);
              return (
              <div
                key={c.day.fecha}
                className="flex items-center justify-center rounded-xl text-sm font-medium"
                tabIndex={0}
                aria-label={`${WEEKDAY_FULL[c.row]} ${c.day.dia} de ${MONTHS_ES_FULL[mesNumero - 1]}: ${dayLabel(c.day, todayStr)}`}
                style={{
                  gridColumn: c.col + 1,
                  gridRow: c.row + 1,
                  backgroundColor:
                    c.day.estado === "sin-datos"
                      ? withOpacity(COLOR_SIN_DATOS, futuro ? FUTURE_FILL_OPACITY : 1)
                      : c.day.estado === "insalubre"
                        ? withOpacity(COLOR_INSALUBRE, COLOR_INSALUBRE_FILL_OPACITY)
                        : withOpacity(COLOR_SALUDABLE, COLOR_SALUDABLE_FILL_OPACITY),
                  color:
                    c.day.estado === "sin-datos"
                      ? futuro
                        ? FUTURE_TEXT_COLOR
                        : "rgb(115,115,115)"
                      : "white",
                  // No onClick here -- unlike the bar chart's month cells,
                  // a day cell only ever shows its hover tooltip, so a
                  // pointer cursor would falsely promise a click does
                  // something (2026-09-27 feedback).
                  cursor: "default",
                  outline: "none",
                }}
                onMouseEnter={() => setTooltip(c)}
                onMouseLeave={() =>
                  setTooltip((cur) => (cur?.day.fecha === c.day.fecha ? null : cur))
                }
                onFocus={() => setTooltip(c)}
                onBlur={() =>
                  setTooltip((cur) => (cur?.day.fecha === c.day.fecha ? null : cur))
                }
              >
                {c.day.dia}
              </div>
              );
            })}
          </div>

          {tooltip && (
            <div
              className="pointer-events-none absolute z-10 grid w-[11rem] gap-1 rounded-xl border border-black/[0.08] bg-white/95 px-4 py-3 shadow-[0_6px_24px_rgba(0,0,0,0.1)] backdrop-blur-[6px]"
              style={tooltipPositionStyle(
                tooltip.col * (cell + GAP) + cell / 2,
                WEEKDAY_ROW_HEIGHT + tooltip.row * (cell + GAP),
                gridWidth,
                gridHeight,
                TOOLTIP_WIDTH,
                TOOLTIP_HEIGHT,
                10,
                cell / 2,
              )}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">
                {WEEKDAY_FULL[tooltip.row]} {tooltip.day.dia} de{" "}
                {MONTHS_ES_FULL[mesNumero - 1]}
              </span>
              <span
                className="text-sm font-semibold"
                style={{
                  color:
                    tooltip.day.estado === "sin-datos" &&
                    isFuture(tooltip.day.fecha, todayStr)
                      ? FUTURE_TEXT_COLOR
                      : ESTADO_COLOR[tooltip.day.estado],
                }}
              >
                {dayLabel(tooltip.day, todayStr)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
