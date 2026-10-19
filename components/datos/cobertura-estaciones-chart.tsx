"use client";

import { useCallback, useEffect, useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import { BookOpen } from "lucide-react";
import { MONTHS_ES, MONTHS_ES_FULL, type Pollutant } from "@/lib/dias-insalubres-aggregate";
import { COLOR_INSALUBRE, COLOR_INSUFICIENTE, COLOR_SALUDABLE } from "@/lib/datos-colors";
import type { InfoTab } from "@/components/datos/info-tabs";
import ChartCard from "@/components/datos/chart-card";
import SegmentedToggle from "@/components/datos/segmented-toggle";
import YearToggle from "@/components/datos/year-toggle";
import { useDismissTooltip } from "@/components/datos/use-dismiss-tooltip";

export interface Estacion {
  sensorId: string;
  nombre: string;
}

// The coverage grid as sent to the browser, per pollutant: the dates that
// have any row, plus one string per station with a character per date
// ("1" cubierto, "0" not, "-" no row). The row-per-day form was ~19k objects
// and 1.5 MB of page payload; this is the same information in ~35 KB.
export type CoberturaCompacta = Record<
  "PM2.5" | "PM10",
  { fechas: string[]; porEstacion: Record<string, string> }
>;

// Unpacks one pollutant's compact grid into station -> date -> cubierto
// (a date with no row is left out, so .get() is undefined = unknown).
export function decodeCobertura({ fechas, porEstacion: codigos }: CoberturaCompacta["PM2.5"]) {
  const porEstacion = new Map<string, Map<string, boolean>>();
  for (const [sensorId, codigo] of Object.entries(codigos)) {
    const porFecha = new Map<string, boolean>();
    for (let i = 0; i < fechas.length; i++) {
      if (codigo[i] !== "-") porFecha.set(fechas[i], codigo[i] === "1");
    }
    porEstacion.set(sensorId, porFecha);
  }
  return { dates: fechas, coberturaPorEstacion: porEstacion };
}

// Share of station-days with data over `dates` (rounded %), every station
// counted.
export function pctCobertura(
  estaciones: Estacion[],
  coberturaPorEstacion: Map<string, Map<string, boolean>>,
  dates: string[],
) {
  if (dates.length === 0 || estaciones.length === 0) return 0;
  let cubierto = 0;
  for (const estacion of estaciones) {
    const porFecha = coberturaPorEstacion.get(estacion.sensorId);
    for (const fecha of dates) {
      if (porFecha?.get(fecha) === true) cubierto += 1;
    }
  }
  return Math.round((cubierto / (dates.length * estaciones.length)) * 100);
}

// Same calendar window (Jan 1 through the last synced date's month-day)
// in the prior year, not full-year vs. partial-year -- shared by the
// chart-level delta. Empty when the prior
// year doesn't have a synced row for every date in that window -- e.g.
// right after the cron starts, or the one-off Feb 29 in a leap-year window
// when the prior year isn't a leap year.
export function priorYearDates(allDates: string[], year: number | null, realDates: string[]) {
  if (year === null || realDates.length === 0) return [];
  const windowEnd = realDates[realDates.length - 1].slice(5); // "MM-DD"
  const pd = allDates.filter(
    (d) => d.startsWith(String(year - 1)) && d.slice(5) <= windowEnd,
  );
  return pd.length >= realDates.length ? pd : [];
}

// The chart header's two-line subtitle ("85% de cobertura de PM2.5 en
// 2026" / "30% mayor cobertura que en el mismo periodo de 2025").
export function CoberturaSubtitle({
  pct,
  delta,
  pollutant,
  year,
}: {
  pct: number;
  delta: number | null;
  pollutant: Pollutant;
  year: number;
}) {
  return (
    <div className="md:flex md:items-center md:gap-3">
      <div>
        <span>{pct}%</span> de cobertura de {POLLUTANT_LABEL[pollutant]} en {year}
      </div>
      {/* Always mounted, just hidden via `invisible` when there's no
          prior-year comparison (2025 has no 2024 data to compare
          against) -- conditionally mounting this whole block made the
          header's height jump depending on which year was selected,
          the same bug días insalubres' own header already fixed
          (2026-09-27 feedback: switching years "looks wonky"). */}
      <div className={`contents ${delta !== null ? "" : "invisible"}`}>
        <div className="hidden h-4 w-px bg-stone-200 md:block" />
        <p className="mt-2 text-xs md:mt-0 md:text-sm">
          {/* "%" here reads as a point delta (pct's own unit), not a
              relative change -- flagged 2026-09-27, kept as requested.
              Green/red (not COLOR_CUBIERTO's blue) mirrors días
              insalubres' own comparison line -- more coverage is the good
              direction here, same green/red-for-bad convention. */}
          <span
            className="whitespace-nowrap"
            style={{
              color:
                (delta ?? 0) > 0
                  ? COLOR_SALUDABLE
                  : (delta ?? 0) < 0
                    ? COLOR_INSALUBRE
                    : undefined,
            }}
          >
            {delta === 0
              ? "Misma cobertura"
              : `${Math.abs(delta ?? 0)}% ${(delta ?? 0) > 0 ? "mayor" : "menor"} cobertura`}
          </span>{" "}
          que en el mismo periodo de {year - 1}
        </p>
      </div>
    </div>
  );
}

export const POLLUTANT_LABEL: Record<Pollutant, string> = {
  pm25: "PM2.5",
  pm10: "PM10",
};

export function infoTab(pollutant: Pollutant): InfoTab {
  return {
    id: "metodologia",
    label: "Metodología",
    icon: BookOpen,
    body: (
      <>
        Un día se contabiliza como &ldquo;Con datos&rdquo; cuando alguna
        estación de monitoreo registró al menos el 75% de las horas del día
        con una medición válida de {POLLUTANT_LABEL[pollutant]}; de lo
        contrario, se contabiliza como &ldquo;Datos insuficientes&rdquo;.
      </>
    ),
  };
}

// Cobertura de estaciones, drawn as one column
// per station with the year running top to bottom (Jan 1 to the last synced
// day): a day with data is filled with a teal-blue-violet-pink gradient
// (top to bottom over the whole plot, so it only restates the date), any
// other day the "Datos insuficientes" gray. Every column is
// fully colored until one is picked; then the others fade, a line marks the day under the pointer and
// a tooltip beside the column names the station and that day's state (there
// are no column labels).

// Pixel-sampled from the user's reference design (2026-10-18), top to
// bottom along its highlighted column.
const GRADIENT_STOPS: [number, string][] = [
  [0, "#53b2d2"],
  [0.1, "#4fa5d5"],
  [0.3, "#5988de"],
  [0.43, "#6875e4"],
  [0.56, "#7d63eb"],
  [0.71, "#9a5bd6"],
  [0.86, "#bc57b4"],
  [1, "#d95598"],
];
// The legend swatch's version of the same gradient.
const GRADIENT_CSS = `linear-gradient(${GRADIENT_STOPS.map(([o, c]) => `${c} ${o * 100}%`).join(", ")})`;
// The tooltip's "Con datos": the gradient's blue.
const COLOR_CON_DATOS = "#5988de";
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

// "Lunes, 6 de abril de 2026".
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

export default function CoberturaEstacionesChart({
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

  const pctTotal = useMemo(
    () => pctCobertura(estaciones, coberturaPorEstacion, dates),
    [estaciones, coberturaPorEstacion, dates],
  );
  const delta = useMemo(() => {
    const prior = priorYearDates(allDates, year, dates);
    return prior.length === 0 ? null : pctTotal - pctCobertura(estaciones, coberturaPorEstacion, prior);
  }, [allDates, year, dates, pctTotal, estaciones, coberturaPorEstacion]);

  const gradientId = useId();
  const selEstacion = sel ? estaciones[sel.col] : null;
  const selFecha = sel?.day != null ? dates[sel.day] : null;
  const selCubierto = selEstacion && selFecha ? coberturaPorEstacion.get(selEstacion.sensorId)?.get(selFecha) : undefined;

  if (allDates.length === 0 || year === null) {
    return (
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white px-5 py-12 text-center text-sm text-stone-500">
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
          <div className="h-5 w-px bg-stone-200" />
          <YearToggle years={years} year={year} onChange={setSelectedYear} />
        </>
      }
    >
      <div className="px-5 pb-6 pt-5 md:pt-6">
        <div className="mb-4 flex items-center justify-end gap-4 text-xs text-stone-500 md:mb-6">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[2px]" style={{ backgroundImage: GRADIENT_CSS }} />
            Con datos
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
              className="block cursor-crosshair touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
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
              <defs>
                <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={0} y2={height}>
                  {GRADIENT_STOPS.map(([offset, color]) => (
                    <stop key={offset} offset={offset} stopColor={color} />
                  ))}
                </linearGradient>
              </defs>
              {monthStarts.map((m) =>
                m.day * dayHeight > height - 12 ? null : (
                  <text
                    key={m.label}
                    x={0}
                    y={m.day * dayHeight + 10}
                    className="fill-stone-400 text-[11px] font-medium"
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
                      fill={r.cubierto ? `url(#${gradientId})` : COLOR_INSUFICIENTE}
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
                  stroke="#79716b"
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
              <span className="text-[10px] font-medium uppercase tracking-wide text-stone-400">{formatFecha(selFecha)}</span>
              <span className="text-sm font-semibold text-stone-800">{selEstacion.nombre}</span>
              <span className="text-sm font-semibold" style={{ color: selCubierto ? COLOR_CON_DATOS : "rgb(121,113,107)" }}>
                {selCubierto === true ? "Con datos" : selCubierto === false ? "Datos insuficientes" : "Sin registro"}
              </span>
              <span className="text-xs text-stone-500">
                {pctCubierto(coberturaPorEstacion.get(selEstacion.sensorId), dates)}% de días con datos en {year}
              </span>
            </div>
          )}
        </div>

      </div>
    </ChartCard>
  );
}
