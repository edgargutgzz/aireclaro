"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronRight, LineChart } from "lucide-react";
import { useDismissTooltip } from "@/components/datos/use-dismiss-tooltip";
import { MONTHS_ES_FULL, summarizeYear, type MonthData, type Pollutant } from "@/lib/dias-insalubres-aggregate";
import {
  COLOR_INSALUBRE,
  COLOR_INSALUBRE_FILL_OPACITY,
  COLOR_SALUDABLE,
  COLOR_SALUDABLE_FILL_OPACITY,
  COLOR_YEAR_CURRENT,
  COLOR_YEAR_PAST,
} from "@/lib/datos-colors";
import type { InfoTab } from "@/components/datos/info-tabs";
import YearToggle from "@/components/datos/year-toggle";
import ChartCard from "@/components/datos/chart-card";
import HorizontalScrollFade from "@/components/datos/horizontal-scroll-fade";
import DiasInsalubresMonthDetail from "@/components/datos/dias-insalubres-month-detail";
import {
  niceTicks,
  roundedRectPath,
  tooltipPositionStyle,
} from "@/components/datos/svg-chart-utils";

export type { MonthData, Pollutant };

const MONTH_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];
// This chart has at most 12 categories, often fewer once trailing months
// with no data are trimmed (see chartData), so it should just fit the card
// instead of defaulting to a scroll -- DiasInsalubresChart measures the
// available width and sizes each remaining month's column to it. MIN is the
// floor before a bar+gap stops reading cleanly, below which it falls back
// to HorizontalScrollFade's horizontal scroll instead of compressing
// further. MAX used to be 110 (the desktop-natural width from when this
// chart always rendered 12 fixed columns) -- once trimming left as few as
// ~8, that cap stopped the columns from actually filling the wider fair
// share available to them, dumping the difference as one large blank
// margin on the right instead of spreading it as breathing room between
// bars. Raised well past anything 2-12 real columns would need on this
// page's max-w-7xl width, so the cap only guards the genuine edge case (a
// brand-new year with just one or two months in) from stretching a single
// bar edge-to-edge.
const MONTH_COL_WIDTH_MAX = 220;
const MONTH_COL_WIDTH_MIN = 30;

// Was hidden pending a discrepancy check (23 vs 15 insalubre days for Aug
// 2026, traced to station NO3) -- re-enabled 2026-09-18 on explicit request.
const SHOW_PM10_TAB = true;

const POLLUTANT_LABEL: Record<Pollutant, string> = {
  pm25: "PM2.5",
  pm10: "PM10",
};
export const POLLUTANT_LIMITS: Record<Pollutant, { antes: number; desde: number }> = {
  pm25: { antes: 33, desde: 25 },
  pm10: { antes: 60, desde: 50 },
};

// Reserved status pair (good/bad), not a categorical hue set: red/green is
// kept by explicit user call over the dataviz skill's own passing blue/red
// alternative (see lib/datos-colors.ts). Backed by non-hue channels since
// the CVD check still fails for this pair: a fixed stacking position
// (insalubre always at the base), a persistent legend, and the exact
// counts always in plain text (header stat + tooltip), never color alone.
// Labels read "sobre/dentro de la norma" now (2026-09-28, matching the
// title's own "sobre la norma" framing and chart 3's identical wording) --
// the keys stay insalubres/saludables since they're just object keys tied
// to the underlying day classification, not user-facing text.
const LEGEND = {
  insalubres: { label: "Sobre la norma", color: COLOR_INSALUBRE },
  saludables: { label: "Dentro de la norma", color: COLOR_SALUDABLE },
};

function infoTab(pollutant: Pollutant): InfoTab {
  const { antes, desde } = POLLUTANT_LIMITS[pollutant];
  return {
    id: "norma",
    label: "Metodología",
    icon: BookOpen,
    body: (
      <>
        Se clasifica un día como sobre la norma si alguna estación de
        monitoreo supera el límite diario, que bajó de {antes} µg/m³ en
        2025 a {desde} µg/m³ en 2026; de lo contrario, se clasifica como
        dentro de la norma. Algunos meses pueden mostrar menos días de los que
        corresponden, ya que un día se contabiliza solo si alguna estación
        de monitoreo reportó mediciones suficientes. Todo lo anterior, con
        base en la Norma Oficial Mexicana:{" "}
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
  };
}

interface MonthBar {
  mesNumero: number;
  ano: number;
  mesLabel: string;
  insalubres: number;
  saludables: number;
  diasTotales: number;
}

// ---- Hand-rolled SVG stacked bar chart -----------------------------------
// No charting library -- see promedio-anual-chart.tsx's header comment for
// why. Two stacked segments per month: per the dataviz skill, touching
// segments get a 2px surface-color gap instead of a border, and only the
// outer tip of the whole stack is rounded -- square everywhere the bar
// meets the baseline or another segment.

// Mobile gets a shorter chart -- 460px fixed regardless of viewport meant
// scrolling *through* the chart itself on a narrow phone just to reach the
// bottom bars and month labels, on top of the header's own height. Paddings
// stay the same fixed px at both sizes (still legible at 320); only the
// plot area shrinks.
const CHART_HEIGHT_DESKTOP = 460;
const CHART_HEIGHT_MOBILE = 320;
const PAD_TOP = 20;
// Matches PAD_TOP -- was 28, the extra 8px reserved for the month labels
// ("Ene", "Feb"...) drawn below the baseline. None of the twelve labels
// have a descender (no j/p/q/g/y), so the shorter margin still clears them.
const PAD_BOTTOM = 20;
const PAD_LEFT = 32;
// Was 8px, but that only trimmed the gridline's own extent, not the bars'
// own position (bandX runs off PAD_LEFT with nothing symmetric subtracted on
// this side), so the last bar's actual clearance to the card edge was just
// its column's small internal gap -- read as crowded. Tried matching
// PAD_LEFT's 32 exactly, but PAD_LEFT earns its width (the axis tick
// numbers need it); PAD_RIGHT has no such job. Also lowered further once
// BAR_WIDTH_MAX went up (below) -- most of the leftover edge space was
// actually the wide-column gap the bar-width formula reserves, not this.
const PAD_RIGHT = 8;
const BAR_WIDTH_MAX = 60;
const BAR_WIDTH_MIN = 8;
const BAR_RADIUS = 4;
const STACK_GAP = 2;
const TOOLTIP_WIDTH = 176; // px, matches the tooltip card's own min-w-[11rem]
const TOOLTIP_HEIGHT = 155; // px, generous estimate of the card's rendered height

function MonthTooltipCard({
  month,
  totalWidth,
  chartHeight,
  barCenterX,
  barTopY,
  barWidth,
}: {
  month: MonthBar;
  totalWidth: number;
  chartHeight: number;
  barCenterX: number;
  barTopY: number;
  barWidth: number;
}) {
  const pct =
    month.diasTotales > 0
      ? Math.round((month.insalubres / month.diasTotales) * 100)
      : 0;

  const positionStyle = tooltipPositionStyle(
    barCenterX,
    barTopY,
    totalWidth,
    chartHeight,
    TOOLTIP_WIDTH,
    TOOLTIP_HEIGHT,
    10,
    barWidth / 2,
  );

  return (
    <div
      className="pointer-events-none absolute z-10 grid w-[11rem] gap-2 rounded-xl border border-black/[0.08] bg-white/95 px-4 py-3.5 shadow-[0_6px_24px_rgba(0,0,0,0.1)] backdrop-blur-[6px]"
      style={positionStyle}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {MONTHS_ES_FULL[month.mesNumero - 1]} {month.ano}
      </span>
      <div className="flex gap-4">
        <div className="flex flex-col gap-0.5">
          <span
            className="text-2xl font-bold leading-none"
            style={{ color: COLOR_INSALUBRE }}
          >
            {month.insalubres}
          </span>
          <span className="text-xs text-gray-500">insalubres</span>
        </div>
        <div className="w-px bg-gray-100" />
        <div className="flex flex-col gap-0.5">
          <span
            className="text-2xl font-bold leading-none"
            style={{ color: COLOR_SALUDABLE }}
          >
            {month.saludables}
          </span>
          <span className="text-xs text-gray-500">saludables</span>
        </div>
      </div>
      <div className="border-t border-gray-100 pt-2 text-xs text-gray-500">
        {pct}% de días insalubres
      </div>
      {month.diasTotales > 0 && (
        <div className="flex items-center gap-0.5 border-t border-gray-100 pt-2 text-xs font-medium text-gray-500">
          Ver detalle por día
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  );
}

function StackedBarsChart({
  months,
  monthColWidth,
  chartHeight,
  onSelectMonth,
}: {
  months: MonthBar[];
  monthColWidth: number;
  chartHeight: number;
  onSelectMonth: (month: MonthBar) => void;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  useDismissTooltip(hoveredIdx !== null, () => setHoveredIdx(null));

  // A fixed 10px of "air" reserved on each column regardless of width,
  // clamped so the bar never gets imperceptibly thin on a narrow viewport
  // or (at the widest columns) grows past BAR_WIDTH_MAX -- 2026-09-21: raised
  // twice. First 24->40 (24px read as lost in a 100px+ column once the chart
  // stopped scrolling and started sizing to the card). Then 40->60 once
  // MONTH_COL_WIDTH_MAX went up too (a partial year's fewer columns get a
  // wider fair share of the card): the gap this formula reserves around a
  // width-capped bar was the actual source of the leftover edge margin, more
  // than PAD_RIGHT itself.
  const barWidth = Math.min(
    BAR_WIDTH_MAX,
    Math.max(BAR_WIDTH_MIN, monthColWidth - 10),
  );
  // bandX offsets every column by PAD_LEFT, so the total width has to
  // reserve that same room on this side too, or the last column's right
  // edge runs past totalWidth by PAD_LEFT and gets flush against (or
  // clipped by) the SVG's own boundary -- the exact "last bar crowds the
  // card edge" symptom this was reported as.
  const totalWidth = PAD_LEFT + monthColWidth * months.length + PAD_RIGHT;
  const plotHeight = chartHeight - PAD_TOP - PAD_BOTTOM;
  const plotRight = totalWidth - PAD_RIGHT;

  const rawMax = Math.max(1, ...months.map((m) => m.diasTotales));
  // This chart's domain is always "days in a month" (max 31) -- a fixed 35
  // gives clean headroom above the tallest possible bar, stepped by 5 so 35
  // itself lands as a labeled gridline instead of being an invisible
  // ceiling above the topmost "30" tick. Only escapes 35 (and this fixed
  // step) if the data itself ever needs to, which the fixed month-day
  // domain shouldn't produce.
  const ticks = useMemo(
    () => (rawMax > 35 ? niceTicks(rawMax) : [0, 5, 10, 15, 20, 25, 30, 35]),
    [rawMax],
  );
  const niceMax = rawMax > 35 ? ticks[ticks.length - 1] : 35;

  const valueToHeight = (v: number) => (v / niceMax) * plotHeight;
  const baseline = PAD_TOP + plotHeight;
  const bandX = (i: number) => PAD_LEFT + i * monthColWidth;

  const hovered = hoveredIdx !== null ? months[hoveredIdx] : null;
  const clearHover = (i: number) =>
    setHoveredIdx((cur) => (cur === i ? null : cur));

  return (
    <div
      className="relative"
      style={{ width: totalWidth, height: chartHeight }}
    >
      <svg
        width={totalWidth}
        height={chartHeight}
        role="img"
        aria-label="Días insalubres y saludables por mes"
      >
        {ticks.map((t) => {
          const y = baseline - valueToHeight(t);
          return (
            <g key={t}>
              <line
                x1={PAD_LEFT}
                x2={plotRight}
                y1={y}
                y2={y}
                stroke="rgb(243,244,246)"
                strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={12}
                fontWeight={500}
                fill="rgb(107,114,128)"
              >
                {t}
              </text>
            </g>
          );
        })}

        {months.map((m, i) => {
          const x = bandX(i) + (monthColWidth - barWidth) / 2;
          const isHovered = hoveredIdx === i;

          const totalH = valueToHeight(m.insalubres + m.saludables);
          const saludablesH =
            m.saludables > 0 ? valueToHeight(m.saludables) : 0;
          const gap = m.insalubres > 0 && m.saludables > 0 ? STACK_GAP : 0;
          const insalubresH = Math.max(0, totalH - saludablesH - gap);

          // Square everywhere a segment meets the baseline or its neighbor;
          // rounded only at the true outer tip of the whole stack.
          const insalubresIsTip = m.saludables === 0 && m.insalubres > 0;

          return (
            <g key={m.mesNumero}>
              {insalubresH > 0 && (
                <path
                  d={roundedRectPath(
                    x,
                    baseline - insalubresH,
                    barWidth,
                    insalubresH,
                    insalubresIsTip ? { tl: BAR_RADIUS, tr: BAR_RADIUS } : {},
                  )}
                  fill={COLOR_INSALUBRE}
                  fillOpacity={isHovered ? 0.85 : COLOR_INSALUBRE_FILL_OPACITY}
                  style={{ transition: "fill-opacity 120ms ease" }}
                />
              )}
              {saludablesH > 0 && (
                <path
                  d={roundedRectPath(
                    x,
                    baseline - totalH,
                    barWidth,
                    saludablesH,
                    { tl: BAR_RADIUS, tr: BAR_RADIUS },
                  )}
                  fill={COLOR_SALUDABLE}
                  fillOpacity={isHovered ? 0.85 : COLOR_SALUDABLE_FILL_OPACITY}
                  style={{ transition: "fill-opacity 120ms ease" }}
                />
              )}
              <text
                x={bandX(i) + monthColWidth / 2}
                y={chartHeight - PAD_BOTTOM + 16}
                textAnchor="middle"
                fontSize={12}
                fontWeight={500}
                fill="rgb(75,85,99)"
              >
                {m.mesLabel}
              </text>
              {/* The hit target: the whole band, taller than the mark
                  itself, per the skill's "hit target bigger than the mark."
                  Also doubles as the click target for the month drill-down
                  -- a month with no data yet (diasTotales === 0) has nothing
                  to show a calendar of, so it's excluded there rather than
                  opening an empty view. */}
              <rect
                x={bandX(i)}
                y={PAD_TOP}
                width={monthColWidth}
                height={plotHeight}
                fill="transparent"
                tabIndex={0}
                role={m.diasTotales > 0 ? "button" : undefined}
                aria-label={`${MONTHS_ES_FULL[m.mesNumero - 1]} ${m.ano}: ${m.insalubres} días insalubres, ${m.saludables} días saludables${m.diasTotales > 0 ? ". Ver detalle por día" : ""}`}
                style={{
                  cursor: m.diasTotales > 0 ? "pointer" : "default",
                  outline: "none",
                }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => clearHover(i)}
                onFocus={() => setHoveredIdx(i)}
                onBlur={() => clearHover(i)}
                onClick={() => {
                  if (m.diasTotales > 0) onSelectMonth(m);
                }}
                onKeyDown={(e) => {
                  if (m.diasTotales > 0 && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onSelectMonth(m);
                  }
                }}
              />
            </g>
          );
        })}
      </svg>

      {/* Screen-reader equivalent of the bars. */}
      <ul className="sr-only">
        {months.map((m) => (
          <li key={m.mesNumero}>
            {MONTHS_ES_FULL[m.mesNumero - 1]} {m.ano}: {m.insalubres} días
            insalubres, {m.saludables} días saludables
          </li>
        ))}
      </ul>

      {hovered && hoveredIdx !== null && (
        <MonthTooltipCard
          month={hovered}
          totalWidth={totalWidth}
          chartHeight={chartHeight}
          barCenterX={bandX(hoveredIdx) + monthColWidth / 2}
          barTopY={
            baseline - valueToHeight(hovered.insalubres + hovered.saludables)
          }
          barWidth={barWidth}
        />
      )}
    </div>
  );
}

// ---- Year-over-year lines (comparison view) --------------------------------
// One line per year, month by month, every year's days counted against the
// limit in force today (diasInsalubresLimiteActual), so the lines share one
// yardstick. The official bars above keep each day's own limit.
//
// Current year vs. past years (focus + context), by color only: the latest
// year is the one line in color, past years are gray; stroke, points and
// labels are identical. Identity never rides on color alone: every
// line is direct-labeled at its last point, the legend names each, and the
// tooltip lists them in text.

export interface YearLine {
  ano: number;
  // The latest year: the one line in color (past years gray).
  current: boolean;
  color: string;
  // 12 entries, Jan..Dec; null = no data for that month (a gap in the line).
  dias: (number | null)[];
  totales: (number | null)[];
}

const LINE_TOOLTIP_WIDTH = 176;
const LINE_TOOLTIP_HEIGHT = 110;
const POINT_R = 4;

function YearLinesChart({
  lines,
  monthColWidth,
  chartHeight,
}: {
  lines: YearLine[];
  monthColWidth: number;
  chartHeight: number;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  useDismissTooltip(hoveredIdx !== null, () => setHoveredIdx(null));

  const totalWidth = PAD_LEFT + monthColWidth * 12 + PAD_RIGHT;
  const plotHeight = chartHeight - PAD_TOP - PAD_BOTTOM;
  const plotRight = totalWidth - PAD_RIGHT;
  const ticks = [0, 5, 10, 15, 20, 25, 30, 35];
  const niceMax = 35;
  const baseline = PAD_TOP + plotHeight;
  const xOf = (i: number) => PAD_LEFT + i * monthColWidth + monthColWidth / 2;
  const yOf = (v: number) => baseline - (v / niceMax) * plotHeight;

  // Break the path at missing months instead of bridging them.
  const pathFor = (dias: (number | null)[]) => {
    let d = "";
    let pen = false;
    dias.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${xOf(i)},${yOf(v)}`;
      pen = true;
    });
    return d;
  };
  const lastIdx = (dias: (number | null)[]) => {
    for (let i = dias.length - 1; i >= 0; i--) if (dias[i] !== null) return i;
    return -1;
  };

  const clearHover = (i: number) => setHoveredIdx((cur) => (cur === i ? null : cur));
  const hoveredTop =
    hoveredIdx === null
      ? 0
      : Math.min(
          ...lines.map((l) => {
            const v = l.dias[hoveredIdx];
            return v === null ? baseline : yOf(v);
          }),
        );

  return (
    <div className="relative" style={{ width: totalWidth, height: chartHeight }}>
      <svg
        width={totalWidth}
        height={chartHeight}
        role="img"
        aria-label="Días sobre el límite actual por mes, un año por línea"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD_LEFT} x2={plotRight} y1={yOf(t)} y2={yOf(t)} stroke="rgb(243,244,246)" strokeWidth={1} />
            <text
              x={PAD_LEFT - 8}
              y={yOf(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={12}
              fontWeight={500}
              fill="rgb(107,114,128)"
            >
              {t}
            </text>
          </g>
        ))}

        {MONTH_SHORT.map((label, i) => (
          <text
            key={label}
            x={xOf(i)}
            y={chartHeight - PAD_BOTTOM + 16}
            textAnchor="middle"
            fontSize={12}
            fontWeight={500}
            fill="rgb(75,85,99)"
          >
            {label}
          </text>
        ))}

        {hoveredIdx !== null && (
          <line
            x1={xOf(hoveredIdx)}
            x2={xOf(hoveredIdx)}
            y1={PAD_TOP}
            y2={baseline}
            stroke="rgb(229,231,235)"
            strokeWidth={1}
          />
        )}

        {/* Older years first, so the latest (red) draws on top. */}
        {[...lines].reverse().map((l) => (
          <path
            key={l.ano}
            d={pathFor(l.dias)}
            fill="none"
            stroke={l.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {[...lines].reverse().map((l) =>
          l.dias.map((v, i) =>
            v === null ? null : (
              <circle
                key={`${l.ano}-${i}`}
                cx={xOf(i)}
                cy={yOf(v)}
                r={hoveredIdx === i ? POINT_R + 1 : POINT_R}
                fill={l.color}
                stroke="white"
                strokeWidth={2}
              />
            ),
          ),
        )}

        {/* Direct label at each line's last point, in text ink (not the
            series color); the dot beside it carries identity. */}
        {lines.map((l) => {
          const i = lastIdx(l.dias);
          if (i < 0) return null;
          const v = l.dias[i] as number;
          return (
            <text
              key={`label-${l.ano}`}
              x={xOf(i)}
              y={yOf(v) - 12}
              textAnchor={i === 11 ? "end" : "middle"}
              fontSize={12}
              fontWeight={600}
              fill="rgb(55,65,81)"
              // White halo: legible where the label crosses another line.
              stroke="white"
              strokeWidth={4}
              strokeLinejoin="round"
              paintOrder="stroke"
            >
              {l.ano}
            </text>
          );
        })}

        {MONTH_SHORT.map((label, i) => (
          <rect
            key={`hit-${label}`}
            x={PAD_LEFT + i * monthColWidth}
            y={PAD_TOP}
            width={monthColWidth}
            height={plotHeight}
            fill="transparent"
            tabIndex={0}
            aria-label={`${MONTHS_ES_FULL[i]}: ${lines
              .map((l) => `${l.ano}, ${l.dias[i] === null ? "sin datos" : `${l.dias[i]} días`}`)
              .join("; ")}`}
            style={{ outline: "none" }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => clearHover(i)}
            onFocus={() => setHoveredIdx(i)}
            onBlur={() => clearHover(i)}
          />
        ))}
      </svg>

      <ul className="sr-only">
        {lines.map((l) => (
          <li key={l.ano}>
            {l.ano}:{" "}
            {l.dias
              .map((v, i) => (v === null ? null : `${MONTHS_ES_FULL[i]} ${v} días`))
              .filter(Boolean)
              .join(", ")}
          </li>
        ))}
      </ul>

      {hoveredIdx !== null && (
        <div
          className="pointer-events-none absolute z-10 grid w-[11rem] gap-2 rounded-xl border border-black/[0.08] bg-white/95 px-4 py-3.5 shadow-[0_6px_24px_rgba(0,0,0,0.1)] backdrop-blur-[6px]"
          style={tooltipPositionStyle(
            xOf(hoveredIdx),
            hoveredTop,
            totalWidth,
            chartHeight,
            LINE_TOOLTIP_WIDTH,
            LINE_TOOLTIP_HEIGHT,
            10,
            POINT_R,
          )}
        >
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
            {MONTHS_ES_FULL[hoveredIdx]}
          </span>
          {lines.map((l) => {
            const v = l.dias[hoveredIdx];
            const t = l.totales[hoveredIdx];
            return (
              <div key={l.ano} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-gray-500">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                  {l.ano}
                </span>
                <span className="text-gray-500">
                  {v === null ? (
                    "Sin datos"
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-gray-800">{v}</span> de {t} días
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function DiasInsalubresChart({
  data,
}: {
  data: Record<Pollutant, MonthData[]>;
}) {
  const [pollutant, setPollutant] = useState<Pollutant>("pm25");
  const activeData = data[pollutant];
  // Which month's bar was clicked, if any -- swaps the bar chart for a
  // day-by-day calendar of that month (see DiasInsalubresMonthDetail).
  // Cleared whenever the pollutant or year changes out from under it, so a
  // toggle click can't leave a stale month's detail showing.
  const [drilledMonth, setDrilledMonth] = useState<MonthBar | null>(null);
  // The comparison view: every year as a line, all against today's limit.
  const [compare, setCompare] = useState(false);

  const years = useMemo(
    () => [...new Set(activeData.map((d) => d.ano))].sort(),
    [activeData],
  );
  const [selectedYear, setSelectedYear] = useState<number | null>(
    years[years.length - 1] ?? null,
  );

  const year =
    selectedYear !== null && years.includes(selectedYear)
      ? selectedYear
      : years[years.length - 1] ?? null;

  useEffect(() => {
    setDrilledMonth(null);
  }, [pollutant, year, compare]);

  const yearLines = useMemo<YearLine[]>(
    () =>
      years.map((ano, i) => {
        const byMonth = new Map(activeData.filter((d) => d.ano === ano).map((d) => [d.mesNumero, d]));
        return {
          ano,
          current: i === years.length - 1,
          color: i === years.length - 1 ? COLOR_YEAR_CURRENT : COLOR_YEAR_PAST,
          dias: Array.from({ length: 12 }, (_, m) => byMonth.get(m + 1)?.diasInsalubresLimiteActual ?? null),
          totales: Array.from({ length: 12 }, (_, m) => byMonth.get(m + 1)?.diasTotales ?? null),
        };
      }),
    [activeData, years],
  );
  // Rows written before the same-limit count existed read as null.
  const comparisonReady = yearLines.some((l) => l.dias.some((v) => v !== null));

  // Builds all 12 months, then drops the trailing run that has no data --
  // the current in-progress month plus whatever hasn't happened yet. Only
  // trailing months are dropped (a real gap mid-year still renders as an
  // empty column) so the chart doesn't reserve width for a stretch of the
  // year that's simply in the future.
  const chartData = useMemo<MonthBar[]>(() => {
    const byMonth = new Map(
      activeData.filter((d) => d.ano === year).map((d) => [d.mesNumero, d]),
    );
    const full: MonthBar[] = Array.from({ length: 12 }, (_, i) => {
      const mesNumero = i + 1;
      const row = byMonth.get(mesNumero);
      return {
        mesNumero,
        ano: year ?? 0,
        mesLabel: MONTH_SHORT[i],
        insalubres: row?.diasInsalubres ?? 0,
        saludables: row ? row.diasTotales - row.diasInsalubres : 0,
        diasTotales: row?.diasTotales ?? 0,
      };
    });
    let lastIdx = full.length - 1;
    while (lastIdx > 0 && full[lastIdx].diasTotales === 0) lastIdx--;
    return full.slice(0, lastIdx + 1);
  }, [activeData, year]);

  // Measures the card's own content width so the visible months fit without
  // a scroll in the common case -- unlike the other two /datos charts, this
  // one always has a small, fixed-or-shrinking category count (never more
  // than 12), so it should size to the card rather than defaulting to
  // HorizontalScrollFade's scroll. MONTH_COL_WIDTH_MAX (the original fixed
  // value) is the initial/SSR render so there's no layout jump once the
  // observer measures. Re-measures against the current month count too, not
  // just on resize -- switching from a partial year (fewer columns) to a
  // complete one changes how wide each column should be at the same width.
  const monthCount = compare ? 12 : chartData.length;
  // A callback ref, not a plain useRef: this div unmounts when drilling
  // into a month's calendar and a brand-new one mounts on the way back
  // (the ternary below swaps branches, not just content) -- a plain
  // useRef's identity never changes, so an effect keyed on it wouldn't
  // rerun and the observer would silently keep watching a detached node,
  // freezing monthColWidth at whatever it read during that detach (a real
  // regression: reported as "so much unused white space" after visiting a
  // month's calendar and coming back). Keying the effect on the node
  // itself instead means every fresh mount gets its own fresh measurement.
  const [measureNode, setMeasureNode] = useState<HTMLDivElement | null>(null);
  const [monthColWidth, setMonthColWidth] = useState(MONTH_COL_WIDTH_MAX);
  useEffect(() => {
    if (!measureNode) return;
    const update = () => {
      // The chart reserves PAD_LEFT + PAD_RIGHT for the axis labels and the
      // right-side margin (see StackedBarsChart's totalWidth) -- only what's
      // left over is available to split across the columns.
      const available = measureNode.clientWidth - PAD_LEFT - PAD_RIGHT;
      setMonthColWidth(
        Math.min(
          MONTH_COL_WIDTH_MAX,
          Math.max(MONTH_COL_WIDTH_MIN, available / monthCount),
        ),
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(measureNode);
    return () => ro.disconnect();
  }, [measureNode, monthCount]);

  // Shorter plot on mobile (see CHART_HEIGHT_MOBILE) -- matches Tailwind's
  // own md: breakpoint so this switches at the same width every other
  // responsive rule on the page does.
  const [chartHeight, setChartHeight] = useState(CHART_HEIGHT_DESKTOP);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const update = () => setChartHeight(mql.matches ? CHART_HEIGHT_DESKTOP : CHART_HEIGHT_MOBILE);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  // Same trimming/comparison rule as chartData above, factored out to
  // lib/dias-insalubres-aggregate.ts so the share-card image route
  // (app/api/og/dias-insalubres) computes the identical number instead of
  // risking drift from a second hand-copied version of this logic.
  const yearSummary = useMemo(
    () => (year !== null ? summarizeYear(activeData, year) : null),
    [activeData, year],
  );
  const totalInsalubres = yearSummary?.total ?? 0;


  // Same guard cobertura already has for a genuinely empty table (a brand-
  // new deploy, or local dev against an empty database) -- without it,
  // `year` is null here and every "en {year}" sentence below would print
  // the literal word "null" (2026-09-28 audit: not a live issue today,
  // since real data exists, but a real gap this chart shared with
  // promedio anual and cobertura had already closed).
  if (years.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-12 text-center text-sm text-gray-500">
        Sin datos de días sobre la norma por el momento.
      </div>
    );
  }

  return (
    <ChartCard
      infoTab={infoTab(pollutant)}
      title={
        compare
          ? "Comparación de días sobre la norma en la Zona Metropolitana de Monterrey"
          : "Días sobre la norma de partículas en la Zona Metropolitana de Monterrey"
      }
      subtitle={
        compare ? (
          // The one limit every line is counted against, per pollutant.
          <div>
            {/* "ambos" while there are two years; "todos los" once a third
                arrives. */}
            Límite diario: {POLLUTANT_LIMITS[pollutant].desde} µg/m³ en{" "}
            {years.length === 2 ? "ambos años" : "todos los años"}
          </div>
        ) : (
          // Each year stands alone against the norm in force that year; no
          // year-over-year line here (NOM-025 tightened on 2025-12-27; the
          // comparison view handles that, on one limit).
          <div>
            <span style={{ color: COLOR_INSALUBRE }}>{totalInsalubres}</span> días sobre la norma por{" "}
            {POLLUTANT_LABEL[pollutant]} en {year}
          </div>
        )
      }
      headerRight={
        <>
          {SHOW_PM10_TAB && (
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
            </>
          )}
          {/* The year toggle only applies to the bars; in the comparison it
              stays laid out, invisible, at every width (removing it lets the
              title reflow and the header would change height between
              views), so the comparison toggle never moves. */}
          <div
            className={compare ? "invisible" : undefined}
            aria-hidden={compare || undefined}
          >
            <YearToggle years={years} year={year} onChange={setSelectedYear} />
          </div>
          <div
            className={`h-5 w-px shrink-0 bg-gray-200 ${compare ? "invisible" : ""}`}
            aria-hidden
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCompare((c) => !c)}
              aria-pressed={compare}
              title={compare ? "Volver a la vista por año" : "Comparar años"}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 ${
                compare
                  ? "bg-gray-800 text-white hover:bg-gray-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200/70 hover:text-gray-700"
              }`}
            >
              <LineChart className="h-3.5 w-3.5" aria-hidden />
              Comparar
            </button>
          </div>
        </>
      }
    >
      <div className="px-5 pb-6 pt-5 md:pt-6">
        {/* justify-between, no extra offset: this row and "Días del mes"
            already share the same px-5 card padding, so their left/right
            margins match by construction. (2026-09-21: pr-6 + a relative
            right nudge were added here chasing alignment with the *pill
            row above*, a different, unrelated row -- that pulled this row's
            own right edge off its natural symmetric position and was the
            actual cause of the left/right mismatch reported. Reverted.) */}
        {compare ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 md:mb-6">
            <span className="text-xs text-gray-400">Días sobre la norma</span>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {yearLines.map((l) => (
                <span key={l.ano} className="flex items-center gap-1.5">
                  <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: l.color }} />
                  {l.ano}
                </span>
              ))}
            </div>
          </div>
        ) : (
        <div
          className={`mb-4 flex items-center md:mb-6 ${drilledMonth ? "justify-end" : "justify-between"}`}
        >
          {/* Labels the bar chart's x-axis -- once drilled into a specific
              month, "Enero 2025" (the calendar's own heading) already
              says that, so this would just be a stray leftover label
              (2026-09-27 feedback). */}
          {!drilledMonth && (
            <span className="text-xs text-gray-400">Días del mes</span>
          )}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-[2px]"
                style={{ backgroundColor: LEGEND.insalubres.color }}
              />
              {LEGEND.insalubres.label}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-[2px]"
                style={{ backgroundColor: LEGEND.saludables.color }}
              />
              {LEGEND.saludables.label}
            </span>
            {/* Only the calendar drill-down can show an actual "no data"
                day -- the bar chart above already drops trailing empty
                months rather than rendering them, so this swatch would be
                dead weight in that view. */}
            {drilledMonth && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-[2px] bg-[#dbdfe3]" />
                Sin datos
              </span>
            )}
          </div>
        </div>
        )}
        {compare ? (
          comparisonReady ? (
            <div ref={setMeasureNode} className="w-full">
              <HorizontalScrollFade minWidth={PAD_LEFT + monthColWidth * 12 + PAD_RIGHT}>
                <YearLinesChart lines={yearLines} monthColWidth={monthColWidth} chartHeight={chartHeight} />
              </HorizontalScrollFade>
            </div>
          ) : (
            <div
              className="flex items-center justify-center text-center text-sm text-gray-500"
              style={{ height: chartHeight }}
            >
              La comparación entre años estará disponible con la próxima actualización de datos.
            </div>
          )
        ) : drilledMonth ? (
          <DiasInsalubresMonthDetail
            ano={drilledMonth.ano}
            mesNumero={drilledMonth.mesNumero}
            pollutant={pollutant}
            onBack={() => setDrilledMonth(null)}
          />
        ) : (
          /* Trailing months with no data yet are dropped (see chartData) so
             the chart doesn't reserve width for a stretch of the year that
             hasn't happened. measureRef sizes each remaining month's column
             to fit this card's real width; only a viewport narrower than
             MONTH_COL_WIDTH_MIN * monthCount falls back to
             HorizontalScrollFade's scroll instead of compressing further. */
          <div ref={setMeasureNode} className="w-full">
            <HorizontalScrollFade
              minWidth={PAD_LEFT + monthColWidth * monthCount + PAD_RIGHT}
            >
              <StackedBarsChart
                months={chartData}
                monthColWidth={monthColWidth}
                chartHeight={chartHeight}
                onSelectMonth={setDrilledMonth}
              />
            </HorizontalScrollFade>
          </div>
        )}
      </div>

    </ChartCard>
  );
}
