"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, HeartPulse, Scale, ShieldCheck } from "lucide-react";
import type { MonthData, Pollutant } from "@/lib/dias-insalubres-aggregate";
import {
  COLOR_INSALUBRE,
  COLOR_INSALUBRE_FILL_OPACITY,
  COLOR_SALUDABLE,
  COLOR_SALUDABLE_FILL_OPACITY,
} from "@/lib/datos-colors";
import InfoTabs, { type InfoTab } from "@/components/datos/info-tabs";
import YearToggle from "@/components/datos/year-toggle";
import ChartCard from "@/components/datos/chart-card";
import HorizontalScrollFade from "@/components/datos/horizontal-scroll-fade";
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
// This chart always has exactly 12 categories (unlike the other two, whose
// item count varies), so it should just fit the card instead of defaulting
// to a scroll -- DiasInsalubresChart measures the available width and
// shrinks each month's column down to fit. MAX is the desktop-natural width
// this chart has always rendered at; MIN is the floor before a bar+gap stops
// reading cleanly, below which it falls back to HorizontalScrollFade's
// horizontal scroll instead of compressing further.
const MONTH_COL_WIDTH_MAX = 110;
const MONTH_COL_WIDTH_MIN = 30;
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

// Was hidden pending a discrepancy check (23 vs 15 insalubre days for Aug
// 2026, traced to station NO3) -- re-enabled 2026-09-18 on explicit request.
const SHOW_PM10_TAB = true;

const POLLUTANT_LABEL: Record<Pollutant, string> = {
  pm25: "PM2.5",
  pm10: "PM10",
};
const POLLUTANT_LIMITS: Record<Pollutant, { antes: number; desde: number }> = {
  pm25: { antes: 33, desde: 25 },
  pm10: { antes: 60, desde: 50 },
};

// Reserved status pair (good/bad), not a categorical hue set: red/green is
// kept by explicit user call over the dataviz skill's own passing blue/red
// alternative (see lib/datos-colors.ts). Backed by non-hue channels since
// the CVD check still fails for this pair: a fixed stacking position
// (insalubre always at the base), a persistent legend, and the exact
// counts always in plain text (header stat + tooltip), never color alone.
const LEGEND = {
  insalubres: { label: "Insalubres", color: COLOR_INSALUBRE },
  saludables: { label: "Saludables", color: COLOR_SALUDABLE },
};

function infoTabs(pollutant: Pollutant): InfoTab[] {
  const label = POLLUTANT_LABEL[pollutant];
  const { antes, desde } = POLLUTANT_LIMITS[pollutant];
  return [
    {
      id: "fuente",
      label: "Datos oficiales",
      icon: ShieldCheck,
      body: (
        <>
          Los datos de calidad del aire ({label} µg/m³) provienen de las
          estaciones de monitoreo del{" "}
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
      id: "norma",
      label: "Norma mexicana",
      icon: Scale,
      body: (
        <>
          Se clasifica la calidad del aire como saludable o insalubre con base
          en el límite diario establecido por la{" "}
          <a
            href="https://www.dof.gob.mx/nota_detalle.php?codigo=5633855&fecha=27/10/2021"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
          >
            NOM-025-SSA1-2021
          </a>
          . El límite fue de {antes} µg/m³ en 2025 y bajó a {desde} µg/m³ en
          2026.
        </>
      ),
    },
    {
      id: "metodologia",
      label: "Metodología",
      icon: BookOpen,
      body: (
        <>
          Para garantizar mayor certeza en la información, los datos se analizan
          siguiendo los criterios establecidos por la{" "}
          <a
            href="https://www.dof.gob.mx/nota_detalle.php?codigo=5633855&fecha=27/10/2021"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
          >
            NOM-025-SSA1-2021
          </a>
          . Un día se contabiliza si al menos una estación reportó mediciones,
          por lo que algunos meses pueden mostrar menos días de los que
          corresponden. Si alguna estación registra un valor que supera el
          límite, el día se clasifica como insalubre.
        </>
      ),
    },
    {
      id: "salud",
      label: "Impacto en salud",
      icon: HeartPulse,
      body:
        pollutant === "pm10" ? (
          <>
            Las partículas PM10 penetran las vías respiratorias superiores y
            pueden alojarse en bronquios y pulmones. La exposición frecuente
            irrita ojos, nariz y garganta, y agrava el asma, la bronquitis y la
            EPOC.
          </>
        ) : (
          <>
            Las partículas PM2.5 son tan pequeñas que penetran profundo en los
            pulmones y llegan al torrente sanguíneo. La exposición prolongada se
            asocia con enfermedades respiratorias, cardiovasculares y daño
            sistémico. Si quieres entender mejor cómo nos afecta, te compartimos
            la siguiente{" "}
            <a
              href="https://www.observatoriodelaire.com/infografias/infografia_salud.pdf"
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

const CHART_HEIGHT = 460;
const PAD_TOP = 20;
const PAD_BOTTOM = 28;
const PAD_LEFT = 32;
const PAD_RIGHT = 8;
const BAR_WIDTH_MAX = 40;
const BAR_WIDTH_MIN = 8;
const BAR_RADIUS = 4;
const STACK_GAP = 2;
const TOOLTIP_WIDTH = 176; // px, matches the tooltip card's own min-w-[11rem]
const TOOLTIP_HEIGHT = 155; // px, generous estimate of the card's rendered height

function MonthTooltipCard({
  month,
  totalWidth,
  barCenterX,
  barTopY,
  barWidth,
}: {
  month: MonthBar;
  totalWidth: number;
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
    CHART_HEIGHT,
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
        {MONTH_FULL[month.mesNumero - 1]} {month.ano}
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
    </div>
  );
}

function StackedBarsChart({
  months,
  monthColWidth,
}: {
  months: MonthBar[];
  monthColWidth: number;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // A fixed 10px of "air" reserved on each column regardless of width,
  // clamped so the bar never gets imperceptibly thin on a narrow viewport
  // or (at the widest columns) grows past BAR_WIDTH_MAX -- 2026-09-21: the
  // 24px cap this used to clamp to read as lost in a 100px+ column once the
  // chart stopped scrolling and started sizing to the card; bumped to 40,
  // still a thin mark, just no longer mostly empty air.
  const barWidth = Math.min(
    BAR_WIDTH_MAX,
    Math.max(BAR_WIDTH_MIN, monthColWidth - 10),
  );
  const totalWidth = monthColWidth * months.length;
  const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const plotRight = totalWidth - PAD_RIGHT;

  const rawMax = Math.max(1, ...months.map((m) => m.diasTotales));
  // This chart's domain is always "days in a month" (max 31) -- a fixed 35
  // gives clean headroom above the tallest possible bar without a "nice
  // round number" search landing on an odd extra tick (40, with only a
  // sliver of a bar ever reaching past 30). Only escapes 35 if the data
  // itself ever needs to, which the fixed month-day domain shouldn't produce.
  const ticks = useMemo(
    () => (rawMax > 35 ? niceTicks(rawMax) : [0, 10, 20, 30]),
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
      style={{ width: totalWidth, height: CHART_HEIGHT }}
    >
      <svg
        width={totalWidth}
        height={CHART_HEIGHT}
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
                y={CHART_HEIGHT - PAD_BOTTOM + 16}
                textAnchor="middle"
                fontSize={12}
                fontWeight={500}
                fill="rgb(75,85,99)"
              >
                {m.mesLabel}
              </text>
              {/* The hit target: the whole band, taller than the mark
                  itself, per the skill's "hit target bigger than the mark." */}
              <rect
                x={bandX(i)}
                y={PAD_TOP}
                width={monthColWidth}
                height={plotHeight}
                fill="transparent"
                tabIndex={0}
                aria-label={`${MONTH_FULL[m.mesNumero - 1]} ${m.ano}: ${m.insalubres} días insalubres, ${m.saludables} días saludables`}
                style={{ cursor: "pointer", outline: "none" }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => clearHover(i)}
                onFocus={() => setHoveredIdx(i)}
                onBlur={() => clearHover(i)}
              />
            </g>
          );
        })}
      </svg>

      {/* Screen-reader equivalent of the bars. */}
      <ul className="sr-only">
        {months.map((m) => (
          <li key={m.mesNumero}>
            {MONTH_FULL[m.mesNumero - 1]} {m.ano}: {m.insalubres} días
            insalubres, {m.saludables} días saludables
          </li>
        ))}
      </ul>

      {hovered && hoveredIdx !== null && (
        <MonthTooltipCard
          month={hovered}
          totalWidth={totalWidth}
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

// ---------------------------------------------------------------------------

export default function DiasInsalubresChart({
  data,
}: {
  data: Record<Pollutant, MonthData[]>;
}) {
  const [pollutant, setPollutant] = useState<Pollutant>("pm25");
  const activeData = data[pollutant];

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

  // Builds all 12 months, then drops the trailing run that has no data --
  // the current in-progress month plus whatever hasn't happened yet. Only
  // trailing months are dropped (a real gap mid-year still renders as an
  // empty column) so the chart doesn't reserve width for a stretch of the
  // year that's simply in the future.
  const { chartData, isPartialYear } = useMemo(() => {
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
    return {
      chartData: full.slice(0, lastIdx + 1),
      isPartialYear: lastIdx < 11,
    };
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
  const monthCount = chartData.length;
  const measureRef = useRef<HTMLDivElement>(null);
  const [monthColWidth, setMonthColWidth] = useState(MONTH_COL_WIDTH_MAX);
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      setMonthColWidth(
        Math.min(
          MONTH_COL_WIDTH_MAX,
          Math.max(MONTH_COL_WIDTH_MIN, w / monthCount),
        ),
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [monthCount]);

  const totalInsalubres = chartData.reduce((sum, d) => sum + d.insalubres, 0);
  const tabs = infoTabs(pollutant);

  return (
    <ChartCard
      title="Días insalubres en la Zona Metropolitana de Monterrey"
      subtitle={
        <>
          <span className="font-semibold" style={{ color: COLOR_INSALUBRE }}>
            {totalInsalubres}
          </span>{" "}
          días insalubres de {POLLUTANT_LABEL[pollutant]} en {year}
          {isPartialYear &&
            ` (hasta ${MONTH_FULL[chartData.length - 1].toLowerCase()})`}
        </>
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
          <YearToggle years={years} year={year} onChange={setSelectedYear} />
        </>
      }
    >
      <div className="px-5 pb-6 pt-6">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-xs text-gray-400">Días del mes</span>
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
          </div>
        </div>
        {/* Trailing months with no data yet are dropped (see chartData) so
            the chart doesn't reserve width for a stretch of the year that
            hasn't happened. measureRef sizes each remaining month's column
            to fit this card's real width; only a viewport narrower than
            MONTH_COL_WIDTH_MIN * monthCount falls back to
            HorizontalScrollFade's scroll instead of compressing further. */}
        <div ref={measureRef} className="w-full">
          <HorizontalScrollFade minWidth={monthColWidth * monthCount}>
            <StackedBarsChart months={chartData} monthColWidth={monthColWidth} />
          </HorizontalScrollFade>
        </div>
      </div>

      <div className="border-t border-gray-100 px-5 pb-5 pt-4">
        <InfoTabs tabs={tabs} />
      </div>
    </ChartCard>
  );
}
