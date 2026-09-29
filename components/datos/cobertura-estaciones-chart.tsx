"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, HeartPulse, ShieldCheck, Wind } from "lucide-react";
import { MONTHS_ES, type Pollutant } from "@/lib/dias-insalubres-aggregate";
import {
  COLOR_CUBIERTO,
  COLOR_CUBIERTO_FILL_OPACITY,
  COLOR_INSALUBRE,
  COLOR_SALUDABLE,
  withOpacity,
} from "@/lib/datos-colors";
import InfoTabs, { type InfoTab } from "@/components/datos/info-tabs";
import YearToggle from "@/components/datos/year-toggle";
import ChartCard from "@/components/datos/chart-card";
import HorizontalScrollFade from "@/components/datos/horizontal-scroll-fade";
import { tooltipPositionStyle } from "@/components/datos/svg-chart-utils";
import { useDismissTooltip } from "@/components/datos/use-dismiss-tooltip";

interface Estacion {
  sensorId: string;
  nombre: string;
}

interface CoberturaDia {
  sensor_id: string;
  fecha: string;
  parametro: "PM2.5" | "PM10";
  cubierto: boolean;
}

const POLLUTANT_LABEL: Record<Pollutant, string> = {
  pm25: "PM2.5",
  pm10: "PM10",
};

// Sized to the measured card width, same approach días insalubres' bar
// chart and calendar already use for their own columns/cells -- fixed at
// 11px was tuned for the old two-station-per-row layout (each card about
// half this width); once every station got the card's full width, that
// left most of a year's 53-column grid sitting in unused space (2026-09-27
// feedback). CELL_MAX is a taste ceiling, not a hard constraint like
// CELL_MIN -- first tried 20, which read as too big/blocky for a
// 53-column-wide grid once it actually hit that ceiling on a real desktop
// (2026-09-27 follow-up feedback); 14 fills noticeably more of the card
// than the original fixed 11 without reading as oversized.
const CELL_MAX = 14;
const CELL_MIN = 6;
const GAP = 3;
const WEEKDAY_COL_WIDTH = 16; // px
const MONTH_ROW_HEIGHT = 18; // px

// Was the same green as días insalubres' "saludable" -- switched to blue
// so "has data" (a coverage/data-quality reading) doesn't get skimmed as
// "good air quality" (a health reading), which green means everywhere else
// on this page (2026-09-27 feedback). COLOR_CUBIERTO itself moved to
// lib/datos-colors.ts (2026-09-28) once promedio anual's own trimester bar
// needed the identical color. Fill opacity stays its own (higher) local
// constant though, so the grid cells can read more solid without also
// washing out días insalubres' bars.
const COLOR_CUBIERTO_FILL = withOpacity(
  COLOR_CUBIERTO,
  COLOR_CUBIERTO_FILL_OPACITY,
);
// A plain gray fill (a data-quality gap, not a health-severity color) --
// lighter than gray-300 by request, but not all the way to gray-200, which
// sat almost invisibly on the station card's own bg-gray-50.
const COLOR_INSUFICIENTE = "#dbdfe3";
// Applied only to a date with no synced row at all (future, or just past
// the monthly cron's cutoff) -- a real gap (a row that exists with
// cubierto=false) stays solid, since that IS a known fact about the
// station, unlike a date we simply haven't synced yet (2026-09-27
// feedback: an earlier version faded both alike and dropped the real
// gaps' tooltip along with it).
const NO_DATA_FILL_OPACITY = 0.4;

// Only every other row gets a label, matching the reference design --
// labeling all 7 would be noisy at this cell size. Row 2 is Miércoles, not
// Martes -- "M" alone reads as the latter by reflex, so it's "Mi" instead
// (2026-09-27 feedback), the one two-letter label among otherwise single
// letters.
const WEEKDAY_LETTER: Record<number, string> = {
  0: "L",
  2: "Mi",
  4: "V",
  6: "D",
};
const WEEKDAY_FULL = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

function tabs(pollutant: Pollutant): InfoTab[] {
  return [
    {
      id: "fuente",
      label: "Datos oficiales",
      icon: ShieldCheck,
      body: (
        <>
          Los datos de calidad del aire provienen de las estaciones de
          monitoreo del{" "}
          <a
            href="http://aire.nl.gob.mx"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
          >
            Sistema Integral de Monitoreo Ambiental (SIMA)
          </a>{" "}
          de Nuevo León.
        </>
      ),
    },
    {
      id: "metodologia",
      label: "Metodología",
      icon: BookOpen,
      body: (
        <>
          Un día se contabiliza como &ldquo;Con datos&rdquo; cuando alguna
          estación de monitoreo registró al menos el 75% de las horas del día
          con una medición válida de {POLLUTANT_LABEL[pollutant]}; de lo
          contrario, se contabiliza como &ldquo;Datos insuficientes&rdquo;.
          Todo lo anterior, con base en la Norma Oficial Mexicana:{" "}
          <a
            href="https://www.dof.gob.mx/nota_detalle.php?codigo=5633855&fecha=27/10/2021"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
          >
            NOM-025-SSA1-2021
          </a>
          .
        </>
      ),
    },
    {
      id: "contaminante",
      label: "Contaminantes",
      icon: Wind,
      body: (
        <>
          PM2.5 y PM10 son partículas en suspensión en el aire, de hasta 2.5
          y 10 micrómetros de diámetro respectivamente (las PM2.5, unas 30
          veces más delgadas que un cabello humano).
        </>
      ),
    },
    {
      id: "salud",
      label: "Impacto en salud",
      icon: HeartPulse,
      body: (
        <>
          La exposición a PM2.5 y PM10 es dañina para la salud. A corto
          plazo, irritan oídos, ojos, nariz y garganta, y agravan el asma y
          la bronquitis; a largo plazo, se asocian con enfermedades
          cardiovasculares, respiratorias y cerebrovasculares, además de una
          menor esperanza de vida. Si quieres entender mejor cómo nos afecta,
          puedes consultar la siguiente{" "}
          <a
            href="/infografias/infografia_salud.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
          >
            infografía
          </a>
          .
        </>
      ),
    },
  ];
}

interface Cell {
  fecha: string;
  row: number;
  col: number;
}

// Every calendar date in the year, Jan 1 - Dec 31, not just the dates that
// happen to have a cobertura row -- matching días insalubres showing all 12
// months (Sep-Dic empty rather than absent). A date with no row renders the
// same as one with cubierto=false: both mean "no valid coverage," whether
// that's because SINAICA hasn't been synced yet or the day genuinely has no
// data.
function fullYearDates(year: number): string[] {
  const dates: string[] = [];
  for (
    let d = new Date(Date.UTC(year, 0, 1));
    d.getUTCFullYear() === year;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// Monday-first GitHub-style week grid: row 0-6 = Lunes..Domingo, col = week
// index since the first date. Built once from the shared date axis (not per
// station) so all 16 station calendars stay aligned and the layout math
// only runs once.
function buildCalendarLayout(dates: string[]) {
  if (dates.length === 0)
    return {
      cells: [] as Cell[],
      totalCols: 0,
      monthLabelForCol: new Map<number, string>(),
    };

  const first = new Date(`${dates[0]}T00:00:00Z`);
  const mondayOffset = (first.getUTCDay() + 6) % 7; // 0 = Monday

  const cells: Cell[] = dates.map((fecha) => {
    const d = new Date(`${fecha}T00:00:00Z`);
    const diffDays = Math.round((d.getTime() - first.getTime()) / 86_400_000);
    const absolute = mondayOffset + diffDays;
    return { fecha, row: absolute % 7, col: Math.floor(absolute / 7) };
  });

  const totalCols = cells[cells.length - 1].col + 1;

  const monthLabelForCol = new Map<number, string>();
  let lastMonth = "";
  for (const c of cells) {
    const monthKey = c.fecha.slice(0, 7);
    if (monthKey !== lastMonth && !monthLabelForCol.has(c.col)) {
      monthLabelForCol.set(c.col, MONTHS_ES[Number(c.fecha.slice(5, 7)) - 1]);
    }
    lastMonth = monthKey;
  }

  return { cells, totalCols, monthLabelForCol };
}

function formatTooltipDate(fecha: string, row: number) {
  const [year, month, day] = fecha.split("-").map(Number);
  return `${WEEKDAY_FULL[row]}, ${day} de ${MONTHS_ES[month - 1].toLowerCase()} de ${year}`;
}

interface Tooltip {
  fecha: string;
  row: number;
  cubierto: boolean | undefined;
  centerX: number; // grid-local, not viewport -- see tooltipPositionStyle
  topY: number;
}

const TOOLTIP_WIDTH = 208; // px, matches the tooltip card's own w-52
const TOOLTIP_HEIGHT = 80; // px, generous estimate of the card's rendered height

function EstacionCalendario({
  estacion,
  cells,
  totalCols,
  monthLabelForCol,
  coberturaPorFecha,
  realDates,
  priorDates,
  year,
  pollutant,
  centerOn,
  cell: CELL,
}: {
  estacion: Estacion;
  cells: Cell[];
  totalCols: number;
  monthLabelForCol: Map<number, string>;
  coberturaPorFecha: Map<string, boolean>;
  realDates: string[];
  priorDates: string[];
  year: number;
  pollutant: Pollutant;
  centerOn?: number;
  cell: number;
}) {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  // Same two-line subtitle pattern as the chart's own header (84%
  // de cobertura... / 29% mayor cobertura...), scoped to this one station
  // instead of the metro-wide average -- replaces the earlier "X días sin
  // datos" pill (2026-09-27 feedback: communicate the same thing per
  // station as the chart already does overall, not a different metric).
  const pctEstacion =
    realDates.length > 0
      ? Math.round(
          (realDates.filter((f) => coberturaPorFecha.get(f) === true).length /
            realDates.length) *
            100,
        )
      : 0;
  // priorDates is already [] when the prior year doesn't have a full
  // matching window (see the chart-level priorYearPctDelta) -- same
  // null-if-not-comparable rule, just evaluated against this station's own
  // coverage instead of the metro average.
  const priorPctEstacion =
    priorDates.length > 0
      ? Math.round(
          (priorDates.filter((f) => coberturaPorFecha.get(f) === true).length /
            priorDates.length) *
            100,
        )
      : null;
  const deltaEstacion =
    priorPctEstacion !== null ? pctEstacion - priorPctEstacion : null;

  const gridWidth = WEEKDAY_COL_WIDTH + totalCols * (CELL + GAP);
  const gridHeight = MONTH_ROW_HEIGHT + 7 * (CELL + GAP);

  // Anchored to the cell's own position in the grid, not the cursor --
  // matches días insalubres/promedio anual's tooltips (both moved off
  // cursor-chasing this session specifically because it can't clamp to the
  // chart's own edges). Shared by mouse and keyboard focus so both trigger
  // the identical tooltip.
  const showTooltip = (c: Cell, cubierto: boolean | undefined) => {
    setTooltip({
      fecha: c.fecha,
      row: c.row,
      cubierto,
      centerX: WEEKDAY_COL_WIDTH + c.col * (CELL + GAP) + CELL / 2,
      topY: MONTH_ROW_HEIGHT + c.row * (CELL + GAP),
    });
  };
  const hideTooltip = () => setTooltip(null);
  useDismissTooltip(tooltip !== null, hideTooltip);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <div className="mb-5 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800">
          {estacion.nombre}
        </h4>
        <div className="flex flex-col gap-1 text-right text-xs text-gray-500">
          <div>
            {pctEstacion}% de cobertura de {POLLUTANT_LABEL[pollutant]} en {year}
          </div>
          {/* Always mounted, hidden via `invisible` when there's no
              prior-year comparison for this station -- same fix as the
              chart's own header just above, same reason (2026-09-27
              feedback: switching years "looks wonky"). */}
          <div className={deltaEstacion !== null ? "" : "invisible"}>
            <span
              style={{
                color:
                  (deltaEstacion ?? 0) > 0
                    ? COLOR_SALUDABLE
                    : (deltaEstacion ?? 0) < 0
                      ? COLOR_INSALUBRE
                      : undefined,
              }}
            >
              {deltaEstacion === 0
                ? "Misma cobertura"
                : `${Math.abs(deltaEstacion ?? 0)}% ${(deltaEstacion ?? 0) > 0 ? "mayor" : "menor"} cobertura`}
            </span>{" "}
            que en el mismo periodo de {year - 1}
          </div>
        </div>
      </div>

      <HorizontalScrollFade minWidth={gridWidth} centerOn={centerOn}>
        <div className="relative" style={{ width: gridWidth }}>
          <div
            style={{
              height: MONTH_ROW_HEIGHT,
              marginLeft: WEEKDAY_COL_WIDTH,
              position: "relative",
            }}
          >
            {Array.from(monthLabelForCol.entries()).map(([col, label]) => (
              <span
                key={col}
                className="absolute text-[10px] font-medium text-gray-400"
                style={{ left: col * (CELL + GAP) }}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="flex">
            <div style={{ width: WEEKDAY_COL_WIDTH }}>
              {Array.from({ length: 7 }, (_, row) => (
                <div
                  key={row}
                  className="text-[10px] font-medium leading-none text-gray-400"
                  style={{ height: CELL + GAP }}
                >
                  {WEEKDAY_LETTER[row] ?? ""}
                </div>
              ))}
            </div>
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${totalCols}, ${CELL}px)`,
                gridTemplateRows: `repeat(7, ${CELL}px)`,
                gap: GAP,
              }}
            >
              {cells.map((c) => {
                // sima_cobertura_diaria has a row -- true or false -- for
                // every date it has actually synced; a date with no row at
                // all (undefined) is one we have no answer for yet (future,
                // or just past the monthly cron's cutoff), not a fact about
                // the station. Reading undefined as "no valid hours" would
                // assert something we don't actually know (2026-09-27
                // feedback: an earlier version of this fix went too far and
                // dropped the real, known gaps' tooltip along with it).
                const cubierto = coberturaPorFecha.get(c.fecha);
                const sabemos = cubierto !== undefined;
                const estadoLabel = cubierto
                  ? "Con datos"
                  : sabemos
                    ? "Datos insuficientes"
                    : "Sin datos";
                return (
                  <div
                    key={c.fecha}
                    className="rounded-[2px]"
                    tabIndex={0}
                    aria-label={`${formatTooltipDate(c.fecha, c.row)}: ${estadoLabel}`}
                    style={{
                      gridColumn: c.col + 1,
                      gridRow: c.row + 1,
                      // No border -- per the dataviz skill's mark spec (now
                      // followed by the other two /datos charts too), the
                      // 3px grid gap between cells is what separates them,
                      // not a stroke.
                      backgroundColor: cubierto
                        ? COLOR_CUBIERTO_FILL
                        : withOpacity(
                            COLOR_INSUFICIENTE,
                            sabemos ? 1 : NO_DATA_FILL_OPACITY,
                          ),
                      outline: "none",
                    }}
                    onMouseEnter={() => {
                      if (sabemos) showTooltip(c, cubierto);
                    }}
                    onMouseLeave={hideTooltip}
                    onFocus={() => {
                      if (sabemos) showTooltip(c, cubierto);
                    }}
                    onBlur={hideTooltip}
                  />
                );
              })}
            </div>
          </div>

          {tooltip && (
            <div
              className="pointer-events-none absolute z-10 grid w-52 gap-1 rounded-xl border border-black/[0.08] bg-white/95 px-4 py-3 shadow-[0_6px_24px_rgba(0,0,0,0.1)] backdrop-blur-[6px]"
              style={tooltipPositionStyle(
                tooltip.centerX,
                tooltip.topY,
                gridWidth,
                gridHeight,
                TOOLTIP_WIDTH,
                TOOLTIP_HEIGHT,
                10,
                CELL / 2,
              )}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                {formatTooltipDate(tooltip.fecha, tooltip.row)}
              </span>
              {/* Never set for a date we have no synced row for at all --
                  see the grid cell's own onMouseEnter/onFocus -- so
                  tooltip.cubierto is only ever a real true/false here, both
                  backed by an actual sima_cobertura_diaria row. */}
              <span
                className="text-sm font-semibold"
                style={{ color: tooltip.cubierto ? COLOR_CUBIERTO : "rgb(107,114,128)" }}
              >
                {tooltip.cubierto ? "Con datos" : "Datos insuficientes"}
              </span>
            </div>
          )}
        </div>
      </HorizontalScrollFade>
    </div>
  );
}

export default function CoberturaEstacionesChart({
  estaciones,
  cobertura,
}: {
  estaciones: Estacion[];
  cobertura: CoberturaDia[];
}) {
  const [pollutant, setPollutant] = useState<Pollutant>("pm25");
  const parametro = pollutant === "pm25" ? "PM2.5" : "PM10";

  const { dates: allDates, coberturaPorEstacion } = useMemo(() => {
    const dateSet = new Set<string>();
    const porEstacion = new Map<string, Map<string, boolean>>();
    for (const row of cobertura) {
      if (row.parametro !== parametro) continue;
      dateSet.add(row.fecha);
      if (!porEstacion.has(row.sensor_id))
        porEstacion.set(row.sensor_id, new Map());
      porEstacion.get(row.sensor_id)!.set(row.fecha, row.cubierto);
    }
    return {
      dates: Array.from(dateSet).sort(),
      coberturaPorEstacion: porEstacion,
    };
  }, [cobertura, parametro]);

  const years = useMemo(
    () => [...new Set(allDates.map((d) => Number(d.slice(0, 4))))].sort(),
    [allDates],
  );
  const [selectedYear, setSelectedYear] = useState<number | null>(
    years[years.length - 1] ?? null,
  );
  const year =
    selectedYear !== null && years.includes(selectedYear)
      ? selectedYear
      : years[years.length - 1] ?? null;

  // The grid shows every day of the year (Sep-Dic included, per días
  // insalubres), but the % stat below is computed only over days that
  // actually occurred -- a day that hasn't happened yet isn't a coverage
  // gap, and counting it would silently deflate the percentage the further
  // into the year you look.
  const dates = useMemo(
    () => (year !== null ? fullYearDates(year) : []),
    [year],
  );
  const realDates = useMemo(
    () => allDates.filter((d) => d.startsWith(String(year))),
    [allDates, year],
  );
  const { cells, totalCols, monthLabelForCol } = useMemo(
    () => buildCalendarLayout(dates),
    [dates],
  );
  // Client-evaluated once per mount -- good enough to tell a future date's
  // tooltip apart from a past date with a real coverage gap, no need for
  // this to stay live across a page left open past midnight.
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Sized to the measured card width -- every station shares one cell size
  // (they're all the same width now that it's one per row), measured once
  // here rather than separately per card. measureNode is the *outer* wrapper
  // around every station card, not each card's own inner content box, so its
  // clientWidth still includes each card's own p-4 (16px each side) -- left
  // out of `available`, the computed cell came out ~32px too generous,
  // overflowing the padded content area and forcing an unwanted horizontal
  // scroll instead of fitting the whole year (2026-09-27 feedback, real
  // laptop screenshot).
  const CARD_PADDING_X = 32; // px, p-4 on both sides of each station card
  const [measureNode, setMeasureNode] = useState<HTMLDivElement | null>(null);
  const [cell, setCell] = useState(CELL_MAX);
  useEffect(() => {
    if (!measureNode) return;
    const update = () => {
      const available =
        measureNode.clientWidth - CARD_PADDING_X - WEEKDAY_COL_WIDTH;
      setCell(
        Math.min(CELL_MAX, Math.max(CELL_MIN, available / totalCols - GAP)),
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(measureNode);
    return () => ro.disconnect();
  }, [measureNode, totalCols]);

  // Scroll each station's year-long grid to the current month on load,
  // instead of leaving it parked at January -- only meaningful on the year
  // that actually contains today; a past year just opens at its start, the
  // old default. Shared across all stations since the grid layout (cells,
  // totalCols) is already identical for every one of them.
  const centerOnCol = useMemo(() => {
    if (year !== Number(todayStr.slice(0, 4))) return undefined;
    const todayCell = cells.find((c) => c.fecha === todayStr);
    if (!todayCell) return undefined;
    return WEEKDAY_COL_WIDTH + todayCell.col * (cell + GAP) + cell / 2;
  }, [cells, year, todayStr, cell]);

  const pctCobertura = useMemo(() => {
    if (realDates.length === 0 || estaciones.length === 0) return 0;
    let cubierto = 0;
    for (const estacion of estaciones) {
      const porFecha = coberturaPorEstacion.get(estacion.sensorId);
      for (const fecha of realDates) {
        if (porFecha?.get(fecha) === true) cubierto += 1;
      }
    }
    return Math.round(
      (cubierto / (realDates.length * estaciones.length)) * 100,
    );
  }, [realDates, estaciones, coberturaPorEstacion]);

  // Same calendar window (Jan 1 through the last synced date's month-day)
  // in the prior year, not full-year vs. partial-year -- shared by the
  // chart-level delta below and each station's own (EstacionCalendario
  // does the identical per-station math with the same dates). Empty when
  // the prior year doesn't have a synced row for every date in that window
  // -- e.g. right after the cron starts, or the one-off Feb 29 in a
  // leap-year window when the prior year isn't a leap year.
  const priorDates = useMemo(() => {
    if (year === null || realDates.length === 0) return [];
    const windowEnd = realDates[realDates.length - 1].slice(5); // "MM-DD"
    const pd = allDates.filter(
      (d) => d.startsWith(String(year - 1)) && d.slice(5) <= windowEnd,
    );
    return pd.length >= realDates.length ? pd : [];
  }, [allDates, year, realDates]);

  // Same-period-last-year comparison, mirroring días insalubres' subtitle
  // line.
  const priorYearPctDelta = useMemo(() => {
    if (priorDates.length === 0) return null;
    let cubierto = 0;
    for (const estacion of estaciones) {
      const porFecha = coberturaPorEstacion.get(estacion.sensorId);
      for (const fecha of priorDates) {
        if (porFecha?.get(fecha) === true) cubierto += 1;
      }
    }
    const priorPct = Math.round(
      (cubierto / (priorDates.length * estaciones.length)) * 100,
    );
    return pctCobertura - priorPct;
  }, [priorDates, estaciones, coberturaPorEstacion, pctCobertura]);

  if (allDates.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-12 text-center text-sm text-gray-500">
        Sin datos de cobertura por el momento.
      </div>
    );
  }

  return (
    <ChartCard
      title="Cobertura de estaciones en la Zona Metropolitana de Monterrey"
      subtitle={
        <div className="md:flex md:items-center md:gap-3">
          <div>
            <span>{pctCobertura}%</span> de cobertura de{" "}
            {POLLUTANT_LABEL[pollutant]} en {year}
          </div>
          {/* Always mounted, just hidden via `invisible` when there's no
              prior-year comparison (2025 has no 2024 data to compare
              against) -- conditionally mounting this whole block made the
              header's height jump depending on which year was selected,
              the same bug días insalubres' own header already fixed
              (2026-09-27 feedback: switching years "looks wonky"). */}
          <div className={`contents ${priorYearPctDelta !== null ? "" : "invisible"}`}>
            <div className="hidden h-4 w-px bg-gray-200 md:block" />
            <p className="mt-2 text-xs md:mt-0 md:text-sm">
              {/* "%" here reads as a point delta (pctCobertura's own
                  unit), not a relative change -- flagged 2026-09-27,
                  kept as requested. Green/red (not COLOR_CUBIERTO's blue,
                  unlike the grid/tooltip above) mirrors días insalubres'
                  own comparison line -- more coverage is the good
                  direction here, same green/red-for-bad convention. */}
              <span
                className="whitespace-nowrap"
                style={{
                  color:
                    (priorYearPctDelta ?? 0) > 0
                      ? COLOR_SALUDABLE
                      : (priorYearPctDelta ?? 0) < 0
                        ? COLOR_INSALUBRE
                        : undefined,
                }}
              >
                {priorYearPctDelta === 0
                  ? "Misma cobertura"
                  : `${Math.abs(priorYearPctDelta ?? 0)}% ${(priorYearPctDelta ?? 0) > 0 ? "mayor" : "menor"} cobertura`}
              </span>{" "}
              que en el mismo periodo de {(year ?? 1) - 1}
            </p>
          </div>
        </div>
      }
      headerRight={
        <>
          <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
            {(["pm25", "pm10"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPollutant(p)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 ${
                  pollutant === p
                    ? "bg-white text-gray-800 shadow-sm hover:shadow"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {POLLUTANT_LABEL[p]}
              </button>
            ))}
          </div>
          {/* Separates the pollutant toggle from the year toggle -- two
              independent choices, not one flat row of four options. */}
          <div className="h-5 w-px bg-gray-200" />
          <YearToggle years={years} year={year} onChange={setSelectedYear} />
        </>
      }
    >
      {/* Same shell as días insalubres: legend on its own row above
          (right-aligned here -- no "Días del mes"-equivalent label to pair
          it with on the left). pt/mb match días insalubres' own mobile
          easing (2026-09-22, "crowded" feedback). */}
      <div className="px-5 pb-6 pt-5 md:pt-6">
        <div className="mb-4 flex items-center justify-end gap-4 text-xs text-gray-500 md:mb-6">
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-[2px]"
              style={{ backgroundColor: COLOR_CUBIERTO_FILL }}
            />
            Con datos
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-[2px]"
              style={{ backgroundColor: COLOR_INSUFICIENTE }}
            />
            Datos insuficientes
          </span>
        </div>
        {year !== null && (
          <div ref={setMeasureNode} className="grid grid-cols-1 gap-y-5">
            {estaciones.map((estacion) => (
              <EstacionCalendario
                key={estacion.sensorId}
                estacion={estacion}
                cells={cells}
                totalCols={totalCols}
                monthLabelForCol={monthLabelForCol}
                coberturaPorFecha={
                  coberturaPorEstacion.get(estacion.sensorId) ?? new Map()
                }
                realDates={realDates}
                priorDates={priorDates}
                year={year}
                pollutant={pollutant}
                centerOn={centerOnCol}
                cell={cell}
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 px-5 pb-5 pt-4">
        <InfoTabs tabs={tabs(pollutant)} />
      </div>
    </ChartCard>
  );
}
