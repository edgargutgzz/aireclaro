"use client";

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import { MONTHS_ES, type Pollutant } from "@/lib/dias-insalubres-aggregate";
import { COLOR_CUBIERTO, COLOR_CUBIERTO_FILL_OPACITY, withOpacity } from "@/lib/datos-colors";
import ChartCard from "@/components/datos/chart-card";
import SegmentedToggle from "@/components/datos/segmented-toggle";
import YearToggle from "@/components/datos/year-toggle";
import { useDismissTooltip } from "@/components/datos/use-dismiss-tooltip";
import {
  POLLUTANT_LABEL,
  decodeCobertura,
  infoTab,
  type CoberturaCompacta,
  type Estacion,
} from "@/components/datos/cobertura-estaciones-chart";

// The same coverage data as CoberturaEstacionesChart, drawn as one column
// per station with the year running top to bottom (Jan 1 to the last synced
// day): a day with data is filled with the grid view's "Con datos" blue, a
// gap shows the gray track. Every column is full blue until one is picked;
// then the others fade and a line marks the day under the pointer; the footer
// names the station and that day's state, there are no column labels.

const COLOR_CUBIERTO_FILL = withOpacity(COLOR_CUBIERTO, COLOR_CUBIERTO_FILL_OPACITY);
const TRACK = "#f3f4f6"; // gray-100
// Only the blue fades, not the track, so a faded column's gaps still show.
const FADED_OPACITY = 0.4;
const AXIS_WIDTH = 36; // px, month labels
const GAP_RATIO = 0.3; // share of each column's slot left as the gap

function plotHeight(width: number) {
  return width < 640 ? 520 : 560;
}

// "6 abr"
function formatDia(fecha: string) {
  const [, month, day] = fecha.split("-").map(Number);
  return `${day} ${MONTHS_ES[month - 1].toLowerCase()}`;
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

  // Each station's days with data as runs of consecutive days, one rect each.
  const runs = useMemo(
    () =>
      estaciones.map((e) => {
        const porFecha = coberturaPorEstacion.get(e.sensorId);
        const out: { start: number; length: number }[] = [];
        dates.forEach((f, i) => {
          if (porFecha?.get(f) !== true) return;
          const last = out[out.length - 1];
          if (last && last.start + last.length === i) last.length += 1;
          else out.push({ start: i, length: 1 });
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

  const pctTotal = useMemo(() => {
    if (n === 0 || dates.length === 0) return 0;
    const total = estaciones.reduce(
      (sum, e) => sum + dates.filter((f) => coberturaPorEstacion.get(e.sensorId)?.get(f) === true).length,
      0,
    );
    return Math.round((total / (n * dates.length)) * 100);
  }, [estaciones, coberturaPorEstacion, dates, n]);

  const selEstacion = sel ? estaciones[sel.col] : null;
  const selFecha = sel?.day != null ? dates[sel.day] : null;
  const selCubierto = selEstacion && selFecha ? coberturaPorEstacion.get(selEstacion.sensorId)?.get(selFecha) : undefined;

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
      title="Días con datos por estación"
      subtitle={
        <>
          {pctTotal}% de días con datos de {POLLUTANT_LABEL[pollutant]} en {year}
        </>
      }
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
        <div ref={setNode} style={{ height }}>
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
                  <rect x={colX(i)} y={0} width={colWidth} height={height} fill={TRACK} />
                  {runs[i].map((r) => (
                    <rect
                      key={r.start}
                      x={colX(i)}
                      y={r.start * dayHeight}
                      width={colWidth}
                      height={r.length * dayHeight}
                      fill={COLOR_CUBIERTO_FILL}
                      fillOpacity={!sel || sel.col === i ? 1 : FADED_OPACITY}
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
        </div>

        {/* Two lines always, so picking a column doesn't move the page. */}
        <div className="mt-4 text-sm" aria-live="polite">
          <p className="text-gray-500">
            <span className="font-medium text-gray-800">{selEstacion ? selEstacion.nombre : "Todas las estaciones"}</span>
            {" · "}
            {selEstacion ? pctCubierto(coberturaPorEstacion.get(selEstacion.sensorId), dates) : pctTotal}% de días con datos
          </p>
          <p className="text-gray-500">
            {selFecha
              ? `${formatDia(selFecha)}: ${selCubierto === true ? "con datos" : selCubierto === false ? "datos insuficientes" : "sin registro"}`
              : "Selecciona una columna para ver cada estación"}
          </p>
        </div>
      </div>
    </ChartCard>
  );
}
