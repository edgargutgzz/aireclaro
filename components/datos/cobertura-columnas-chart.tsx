"use client";

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import { MONTHS_ES, MONTHS_ES_FULL, type Pollutant } from "@/lib/dias-insalubres-aggregate";
import { COLOR_INSUFICIENTE } from "@/lib/datos-colors";
import ChartCard from "@/components/datos/chart-card";
import SegmentedToggle from "@/components/datos/segmented-toggle";
import YearToggle from "@/components/datos/year-toggle";
import { useDismissTooltip } from "@/components/datos/use-dismiss-tooltip";
import {
  CoberturaSubtitle,
  POLLUTANT_LABEL,
  decodeCobertura,
  pctCobertura,
  priorYearDates,
  infoTab,
  type CoberturaCompacta,
  type Estacion,
} from "@/components/datos/cobertura-estaciones-chart";

// The same coverage data as CoberturaEstacionesChart, drawn as one column
// per station with the year running top to bottom (Jan 1 to the last synced
// day): a day with data is blue, darker the longer its unbroken streak,
// any other day the grid view's "Datos insuficientes" gray. Every column is
// fully colored until one is picked; then the others fade, a line marks the day under the pointer and
// a tooltip beside the column names the station and that day's state (there
// are no column labels).

// A day with data is colored by the length of the unbroken streak it
// belongs to (counted within the year shown), one blue hue, light to dark:
// a station that keeps dropping out reads pale and broken, a steady one
// dark and solid. Steps set from the real streak lengths (2026-10-18:
// PM2.5 2026 median 5 days, longest 107; 90+ would almost never show).
// Tailwind blue-300 is the lightest so a short streak never passes for the
// gap gray.
const STREAK_STEPS: { min: number; label: string; color: string }[] = [
  { min: 1, label: "1 a 6", color: "#93c5fd" }, // blue-300
  { min: 7, label: "7 a 29", color: "#3b82f6" }, // blue-500
  { min: 30, label: "30 a 59", color: "#1d4ed8" }, // blue-700
  { min: 60, label: "60 o más", color: "#1e3a8a" }, // blue-900
];

function streakColor(days: number) {
  return [...STREAK_STEPS].reverse().find((s) => days >= s.min)!.color;
}
// Only the color fades, not the gray, so a faded column's gaps still show.
const FADED_OPACITY = 0.4;
const TOOLTIP_WIDTH = 208; // px, the card's w-52
const TOOLTIP_HEIGHT = 104; // px, generous estimate of its rendered height
const TOOLTIP_GAP = 10; // px from the column
const AXIS_WIDTH = 36; // px, month labels
const GAP_RATIO = 0.3; // share of each column's slot left as the gap

function plotHeight(width: number) {
  return width < 640 ? 520 : 560;
}

function tooltipLeft(colLeft: number, colWidth: number, plotWidth: number) {
  const right = colLeft + colWidth + TOOLTIP_GAP;
  const left = right + TOOLTIP_WIDTH <= plotWidth ? right : colLeft - TOOLTIP_GAP - TOOLTIP_WIDTH;
  return Math.min(Math.max(0, left), Math.max(0, plotWidth - TOOLTIP_WIDTH));
}

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// "Lunes, 6 de abril de 2026", the grid view's tooltip date.
function formatFecha(fecha: string) {
  const [year, month, day] = fecha.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday}, ${day} de ${MONTHS_ES_FULL[month - 1].toLowerCase()} de ${year}`;
}

function pctCubierto(porFecha: Map<string, boolean> | undefined, dates: string[]) {
  if (!porFecha || dates.length === 0) return 0;
  return Math.round((dates.filter((f) => porFecha.get(f) === true).length / dates.length) * 100);
}

interface Seleccion {
  col: number;
  day: number | null;
}

export default function CoberturaColumnasChart({
  estaciones,
  cobertura,
}: {
  estaciones: Estacion[];
  cobertura: CoberturaCompacta;
}) {
  const [pollutant, setPollutant] = useState<Pollutant>("pm25");
  const parametro = pollutant === "pm25" ? "PM2.5" : "PM10";
  const { dates: allDates, coberturaPorEstacion } = useMemo(
    () => decodeCobertura(cobertura[parametro]),
    [cobertura, parametro],
  );

  const years = useMemo(() => [...new Set(allDates.map((d) => Number(d.slice(0, 4))))].sort(), [allDates]);
  const [selectedYear, setSelectedYear] = useState<number | null>(years[years.length - 1] ?? null);
  const year = selectedYear !== null && years.includes(selectedYear) ? selectedYear : (years[years.length - 1] ?? null);

  // The synced dates of the year: they're consecutive from Jan 1, so each
  // one is a row of the plot.
  const dates = useMemo(() => allDates.filter((d) => d.startsWith(String(year))), [allDates, year]);

  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!node) return;
    const update = () => setWidth(node.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, [node]);

  const height = plotHeight(width);
  const n = estaciones.length;
  const slot = n > 0 ? Math.max(0, width - AXIS_WIDTH) / n : 0;
  const colWidth = slot * (1 - GAP_RATIO);
  const dayHeight = dates.length > 0 ? height / dates.length : 0;
  const colX = (i: number) => AXIS_WIDTH + i * slot + (slot - colWidth) / 2;

  // Each station's column as runs of consecutive same-state days, one rect
  // each. The gray is drawn only in the gaps, not under the blue, so a
  // faded blue sits on white instead of turning gray.
  const runs = useMemo(
    () =>
      estaciones.map((e) => {
        const porFecha = coberturaPorEstacion.get(e.sensorId);
        const out: { start: number; length: number; cubierto: boolean }[] = [];
        dates.forEach((f, i) => {
          const cubierto = porFecha?.get(f) === true;
          const last = out[out.length - 1];
          if (last && last.cubierto === cubierto) last.length += 1;
          else out.push({ start: i, length: 1, cubierto });
        });
        return out;
      }),
    [estaciones, coberturaPorEstacion, dates],
  );

  const monthStarts = useMemo(
    () =>
      dates.flatMap((f, i) => (f.endsWith("-01") ? [{ day: i, label: MONTHS_ES[Number(f.slice(5, 7)) - 1] }] : [])),
    [dates],
  );

  const [sel, setSel] = useState<Seleccion | null>(null);
  const clear = useCallback(() => setSel(null), []);
  useDismissTooltip(sel !== null, clear);

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - AXIS_WIDTH;
    const y = e.clientY - rect.top;
    if (x < 0 || slot === 0 || dayHeight === 0) return setSel(null);
    setSel({
      col: Math.min(n - 1, Math.floor(x / slot)),
      day: Math.min(dates.length - 1, Math.max(0, Math.floor(y / dayHeight))),
    });
  };

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const cur = sel ?? { col: 0, day: dates.length - 1 };
    const day = cur.day ?? dates.length - 1;
    const step = e.shiftKey ? 7 : 1;
    const next: Record<string, Seleccion> = {
      ArrowLeft: { col: Math.max(0, cur.col - 1), day },
      ArrowRight: { col: Math.min(n - 1, cur.col + 1), day },
      ArrowUp: { col: cur.col, day: Math.max(0, day - step) },
      ArrowDown: { col: cur.col, day: Math.min(dates.length - 1, day + step) },
    };
    if (next[e.key]) {
      e.preventDefault();
      setSel(next[e.key]);
    }
  };

  // Resets when the year or pollutant changes (the day index would point
  // at another date).
  useEffect(() => setSel(null), [year, parametro]);

  // The grid view's header numbers, same helpers.
  const pctTotal = useMemo(
    () => pctCobertura(estaciones, coberturaPorEstacion, dates),
    [estaciones, coberturaPorEstacion, dates],
  );
  const delta = useMemo(() => {
    const prior = priorYearDates(allDates, year, dates);
    return prior.length === 0 ? null : pctTotal - pctCobertura(estaciones, coberturaPorEstacion, prior);
  }, [allDates, year, dates, pctTotal, estaciones, coberturaPorEstacion]);

  const selEstacion = sel ? estaciones[sel.col] : null;
  const selFecha = sel?.day != null ? dates[sel.day] : null;
  const selCubierto = selEstacion && selFecha ? coberturaPorEstacion.get(selEstacion.sensorId)?.get(selFecha) : undefined;
  // The streak the picked day belongs to (its length), for the tooltip.
  const selRacha =
    sel?.day != null && selCubierto
      ? runs[sel.col].find((r) => r.cubierto && sel.day! >= r.start && sel.day! < r.start + r.length)?.length
      : undefined;

  if (allDates.length === 0 || year === null) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-12 text-center text-sm text-gray-500">
        Sin datos de cobertura por el momento.
      </div>
    );
  }

  return (
    <ChartCard
      infoTab={infoTab(pollutant)}
      title="Cobertura de estaciones en la Zona Metropolitana de Monterrey"
      subtitle={<CoberturaSubtitle pct={pctTotal} delta={delta} pollutant={pollutant} year={year} />}
      headerRight={
        <>
          <SegmentedToggle
            options={(["pm25", "pm10"] as const).map((p) => ({ value: p, label: POLLUTANT_LABEL[p] }))}
            value={pollutant}
            onChange={setPollutant}
            ariaLabel="Contaminante"
          />
          <div className="h-5 w-px bg-gray-200" />
          <YearToggle years={years} year={year} onChange={setSelectedYear} />
        </>
      }
    >
      <div className="px-5 pb-6 pt-5 md:pt-6">
        {/* The grid view's legend row, with the streak scale in place of
            its single "Con datos" swatch; wraps on a phone. */}
        <div className="mb-4 flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-xs text-gray-500 md:mb-6">
          <span className="flex items-center gap-1.5">
            Días seguidos con datos:
            {STREAK_STEPS.map((step) => (
              <span key={step.min} className="ml-1.5 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: step.color }} />
                {step.label}
              </span>
            ))}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: COLOR_INSUFICIENTE }} />
            Datos insuficientes
          </span>
        </div>
        <div ref={setNode} className="relative" style={{ height }}>
          {width > 0 && (
            <svg
              width={width}
              height={height}
              role="img"
              aria-label={`Días con datos de ${POLLUTANT_LABEL[pollutant]} por estación en ${year}. Usa las flechas para recorrer estaciones y días.`}
              tabIndex={0}
              className="block cursor-crosshair touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
              onPointerMove={(e) => {
                if (e.pointerType === "mouse") pick(e);
              }}
              onPointerDown={(e) => {
                // Keeps the document-level dismiss (useDismissTooltip) from
                // clearing the pick this same tap just made.
                e.stopPropagation();
                pick(e);
              }}
              onPointerLeave={(e) => {
                if (e.pointerType === "mouse") clear();
              }}
              onKeyDown={onKeyDown}
              onBlur={clear}
            >
              {monthStarts.map((m) =>
                m.day * dayHeight > height - 12 ? null : (
                  <text
                    key={m.label}
                    x={0}
                    y={m.day * dayHeight + 10}
                    className="fill-gray-400 text-[11px] font-medium"
                  >
                    {m.label}
                  </text>
                ),
              )}

              {estaciones.map((e, i) => (
                <g key={e.sensorId}>
                  {runs[i].map((r) => (
                    <rect
                      key={r.start}
                      x={colX(i)}
                      y={r.start * dayHeight}
                      width={colWidth}
                      height={r.length * dayHeight}
                      fill={r.cubierto ? streakColor(r.length) : COLOR_INSUFICIENTE}
                      fillOpacity={!r.cubierto || !sel || sel.col === i ? 1 : FADED_OPACITY}
                    />
                  ))}
                </g>
              ))}

              {sel?.day != null && (
                <line
                  x1={AXIS_WIDTH}
                  x2={width}
                  y1={(sel.day + 0.5) * dayHeight}
                  y2={(sel.day + 0.5) * dayHeight}
                  stroke="#6b7280"
                  strokeWidth={1.5}
                />
              )}
            </svg>
          )}

          {selEstacion && selFecha && (
            // Beside the picked column, level with the day line, so it doesn't
            // cover the column being read; flips left near the right edge,
            // and on a phone too narrow for either side it's clamped inside
            // the plot (the card would clip it otherwise).
            <div
              className="pointer-events-none absolute z-10 grid w-52 gap-1 rounded-xl border border-black/[0.08] bg-white/95 px-4 py-3 shadow-[0_6px_24px_rgba(0,0,0,0.1)] backdrop-blur-[6px]"
              aria-live="polite"
              style={{
                top: Math.min(Math.max(0, ((sel?.day ?? 0) + 0.5) * dayHeight - TOOLTIP_HEIGHT / 2), height - TOOLTIP_HEIGHT),
                left: tooltipLeft(colX(sel!.col), colWidth, width),
              }}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{formatFecha(selFecha)}</span>
              <span className="text-sm font-semibold text-gray-800">{selEstacion.nombre}</span>
              <span
                className="text-sm font-semibold"
                // The streak's own blue, except blue-300, too light to read
                // as text on white: the next step's blue-500 instead.
                style={{ color: selRacha ? streakColor(Math.max(selRacha, STREAK_STEPS[1].min)) : "rgb(107,114,128)" }}
              >
                {selCubierto === true
                  ? `Con datos · ${selRacha} ${selRacha === 1 ? "día seguido" : "días seguidos"}`
                  : selCubierto === false
                    ? "Datos insuficientes"
                    : "Sin registro"}
              </span>
              <span className="text-xs text-gray-500">
                {pctCubierto(coberturaPorEstacion.get(selEstacion.sensorId), dates)}% de días con datos en {year}
              </span>
            </div>
          )}
        </div>

      </div>
    </ChartCard>
  );
}
