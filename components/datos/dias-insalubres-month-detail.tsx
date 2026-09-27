"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  fetchMonthDayDetail,
  type DayStatus,
} from "@/lib/dias-insalubres-day-detail";
import type { Pollutant } from "@/lib/dias-insalubres-aggregate";
import {
  COLOR_INSALUBRE,
  COLOR_INSALUBRE_FILL_OPACITY,
  COLOR_SALUDABLE,
  COLOR_SALUDABLE_FILL_OPACITY,
  withOpacity,
} from "@/lib/datos-colors";
import { tooltipPositionStyle } from "@/components/datos/svg-chart-utils";
import { useDismissTooltip } from "@/components/datos/use-dismiss-tooltip";

const MONTH_FULL = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
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
const COLOR_SIN_DATOS = "#dbdfe3";

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

const ESTADO_LABEL: Record<DayStatus["estado"], string> = {
  insalubre: "Insalubre",
  saludable: "Saludable",
  "sin-datos": "Sin datos",
};
const ESTADO_COLOR: Record<DayStatus["estado"], string> = {
  insalubre: COLOR_INSALUBRE,
  saludable: COLOR_SALUDABLE,
  "sin-datos": COLOR_SIN_DATOS,
};

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
  }, [ano, mesNumero, pollutant]);

  const cells = days ? buildLayout(ano, mesNumero, days) : [];
  const totalRows = cells.length > 0 ? Math.max(...cells.map((c) => c.row)) + 1 : 0;
  const gridWidth = 7 * (cell + GAP) - GAP;
  const gridHeight = WEEKDAY_ROW_HEIGHT + totalRows * (cell + GAP) - GAP;

  return (
    <div ref={measureRef} className="w-full">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a los meses
      </button>

      <h4 className="mb-4 text-sm font-medium text-gray-700">
        {MONTH_FULL[mesNumero - 1]} {ano}
      </h4>

      {error && (
        <p className="text-sm text-gray-500">
          No se pudo cargar el detalle de este mes.
        </p>
      )}

      {!error && !days && (
        <div
          className="w-full animate-pulse rounded-xl bg-gray-100"
          style={{ maxWidth: gridWidth, height: 280 }}
        />
      )}

      {!error && days && (
        <div className="relative" style={{ width: gridWidth }}>
          <div className="flex" style={{ height: WEEKDAY_ROW_HEIGHT }}>
            {WEEKDAY_SHORT.map((w) => (
              <div
                key={w}
                className="text-center text-[11px] font-medium text-gray-400"
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
            {cells.map((c) => (
              <div
                key={c.day.fecha}
                className="flex items-center justify-center rounded-lg text-sm font-medium"
                tabIndex={0}
                aria-label={`${WEEKDAY_FULL[c.row]} ${c.day.dia} de ${MONTH_FULL[mesNumero - 1]}: ${ESTADO_LABEL[c.day.estado]}`}
                style={{
                  gridColumn: c.col + 1,
                  gridRow: c.row + 1,
                  backgroundColor:
                    c.day.estado === "sin-datos"
                      ? COLOR_SIN_DATOS
                      : c.day.estado === "insalubre"
                        ? withOpacity(COLOR_INSALUBRE, COLOR_INSALUBRE_FILL_OPACITY)
                        : withOpacity(COLOR_SALUDABLE, COLOR_SALUDABLE_FILL_OPACITY),
                  color: c.day.estado === "sin-datos" ? "rgb(107,114,128)" : "white",
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
            ))}
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
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                {WEEKDAY_FULL[tooltip.row]} {tooltip.day.dia} de{" "}
                {MONTH_FULL[mesNumero - 1]}
              </span>
              <span
                className="text-sm font-semibold"
                style={{ color: ESTADO_COLOR[tooltip.day.estado] }}
              >
                {ESTADO_LABEL[tooltip.day.estado]}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
